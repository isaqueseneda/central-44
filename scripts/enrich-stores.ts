/**
 * Store Data Enrichment Script
 *
 * Uses Google Maps APIs to enrich store data:
 * - Google Places/Geocoding → address, phone, cep, lat/lng
 * - Google Directions → driving distance from Rio Claro (round trip)
 * - Toll estimates based on distance
 *
 * Creates DataSuggestion records with PENDING status for review.
 *
 * Usage:
 *   GOOGLE_MAPS_API_KEY=xxx npx tsx scripts/enrich-stores.ts
 *
 * Options:
 *   --dry-run    Print what would be suggested without saving
 *   --store=CODE Only enrich a specific store by code
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY is required");

const adapter = new PrismaPg({
  connectionString: `${DATABASE_URL}${DATABASE_URL.includes("?") ? "&" : "?"}sslmode=verify-full`,
});
const prisma = new PrismaClient({ adapter });

// Rio Claro, SP — origin for distance calculations
const ORIGIN = "Rio Claro, SP, Brazil";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const storeCodeArg = args.find((a) => a.startsWith("--store="))?.split("=")[1];

interface Suggestion {
  storeId: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  source: string;
}

interface PlaceResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  postalCode?: string;
  phone?: string;
}

async function findPlace(
  query: string,
): Promise<PlaceResult | null> {
  // Try Places API (New) first, fall back to legacy
  let place: PlaceResult | null = null;

  // --- Attempt 1: Places API (New) ---
  try {
    const url = "https://places.googleapis.com/v1/places:searchText";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
        "X-Goog-FieldMask": "places.location,places.formattedAddress,places.nationalPhoneNumber,places.addressComponents",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "pt-BR" }),
    });
    const data = await res.json();

    if (!data.error && data.places?.[0]) {
      const p = data.places[0];
      const postalCode = p.addressComponents?.find((c: any) =>
        c.types?.includes("postal_code"),
      )?.longText;
      place = {
        lat: p.location?.latitude,
        lng: p.location?.longitude,
        formattedAddress: p.formattedAddress ?? "",
        postalCode,
        phone: p.nationalPhoneNumber,
      };
    }
  } catch {}

  if (place) return place;

  // --- Attempt 2: Legacy Places API ---
  try {
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${GOOGLE_MAPS_API_KEY}`;
    const findRes = await fetch(findUrl);
    const findData = await findRes.json();

    if (findData.status === "OK" && findData.candidates?.[0]) {
      const placeId = findData.candidates[0].place_id;
      const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,formatted_phone_number,address_components&key=${GOOGLE_MAPS_API_KEY}`;
      const detailRes = await fetch(detailUrl);
      const detailData = await detailRes.json();

      if (detailData.status === "OK" && detailData.result) {
        const r = detailData.result;
        const postalCode = r.address_components?.find((c: any) =>
          c.types.includes("postal_code"),
        )?.long_name;
        place = {
          lat: r.geometry?.location?.lat,
          lng: r.geometry?.location?.lng,
          formattedAddress: r.formatted_address ?? "",
          postalCode,
          phone: r.formatted_phone_number,
        };
      }
    }
  } catch {}

  if (place) return place;

  // --- Attempt 3: Geocoding API (just lat/lng) ---
  try {
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&region=br`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();
    if (geoData.status === "OK" && geoData.results?.[0]) {
      const r = geoData.results[0];
      const postalCode = r.address_components?.find((c: any) =>
        c.types.includes("postal_code"),
      )?.long_name;
      place = {
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        formattedAddress: r.formatted_address,
        postalCode,
      };
    }
  } catch {}

  if (!place) {
    console.log(`  [places] no results for "${query}"`);
  }
  return place;
}

async function getDrivingDistance(
  destLat: number,
  destLng: number,
): Promise<{ distanceKm: number; durationMin: number } | null> {
  // Try Routes API (New) first, fall back to Directions API (legacy)

  // --- Attempt 1: Routes API (New) ---
  try {
    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { address: ORIGIN },
        destination: {
          location: { latLng: { latitude: destLat, longitude: destLng } },
        },
        travelMode: "DRIVE",
      }),
    });
    const data = await res.json();
    if (!data.error && data.routes?.[0]) {
      const route = data.routes[0];
      return {
        distanceKm: Math.round((route.distanceMeters ?? 0) / 1000),
        durationMin: Math.round(parseInt(route.duration?.replace("s", "") ?? "0", 10) / 60),
      };
    }
  } catch {}

  // --- Attempt 2: Legacy Directions API ---
  try {
    const dest = `${destLat},${destLng}`;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(ORIGIN)}&destination=${encodeURIComponent(dest)}&key=${GOOGLE_MAPS_API_KEY}&region=br`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.routes?.[0]?.legs?.[0]) {
      const leg = data.routes[0].legs[0];
      return {
        distanceKm: Math.round(leg.distance.value / 1000),
        durationMin: Math.round(leg.duration.value / 60),
      };
    }
  } catch {}

  console.log(`  [routes] no driving route found`);
  return null;
}

// Google Routes API for real toll costs
async function getRouteToll(
  fromAddress: string | null,
  fromLat: number | null,
  fromLng: number | null,
  toAddress: string | null,
  toLat: number | null,
  toLng: number | null,
): Promise<{ tollCost: number } | null> {
  try {
    const origin = fromAddress
      ? { address: fromAddress }
      : { location: { latLng: { latitude: fromLat, longitude: fromLng } } };
    const destination = toAddress
      ? { address: toAddress }
      : { location: { latLng: { latitude: toLat, longitude: toLng } } };

    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.travelAdvisory",
        },
        body: JSON.stringify({
          origin,
          destination,
          travelMode: "DRIVE",
          extraComputations: ["TOLLS"],
          routeModifiers: { vehicleInfo: { emissionType: "GASOLINE" } },
        }),
      },
    );
    const data = await res.json();
    if (data.error || !data.routes?.[0]) return null;

    const tollInfo = data.routes[0].travelAdvisory?.tollInfo;
    if (tollInfo?.estimatedPrice?.length) {
      const p = tollInfo.estimatedPrice[0];
      if (p.currencyCode === "BRL") {
        const cost = parseFloat(p.units ?? "0") + parseFloat(p.nanos ?? "0") / 1e9;
        return { tollCost: Math.round(cost * 100) / 100 };
      }
    }

    return { tollCost: 0 };
  } catch {
    return null;
  }
}

async function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== Enriching Stores ===");

  const where: any = {};
  if (storeCodeArg) where.code = storeCodeArg;

  const stores = await prisma.store.findMany({ where, orderBy: { city: "asc" } });
  console.log(`Found ${stores.length} stores to process\n`);

  const suggestions: Suggestion[] = [];

  for (const store of stores) {
    console.log(`\n--- ${store.code} | ${store.sigla} | ${store.city}, ${store.state} ---`);

    // Skip stores with no city
    if (!store.city) {
      console.log("  [skip] no city");
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }

    const searchQuery = `Lojas CEM ${store.city} ${store.state}`;

    // 1. Find place via Places API (gets lat/lng, address, phone, CEP)
    const place = await findPlace(searchQuery);

    if (place) {
      if (
        (!store.latitude || !store.longitude) &&
        place.lat &&
        place.lng
      ) {
        suggestions.push({
          storeId: store.id,
          field: "latitude",
          oldValue: store.latitude?.toString() ?? null,
          newValue: place.lat.toString(),
          source: "google_places",
        });
        suggestions.push({
          storeId: store.id,
          field: "longitude",
          oldValue: store.longitude?.toString() ?? null,
          newValue: place.lng.toString(),
          source: "google_places",
        });
        console.log(`  lat/lng: ${place.lat}, ${place.lng}`);
      }

      if (!store.cep && place.postalCode) {
        suggestions.push({
          storeId: store.id,
          field: "cep",
          oldValue: store.cep ?? null,
          newValue: place.postalCode,
          source: "google_places",
        });
        console.log(`  cep: ${place.postalCode}`);
      }

      if (place.phone && !store.phone) {
        suggestions.push({
          storeId: store.id,
          field: "phone",
          oldValue: store.phone ?? null,
          newValue: place.phone,
          source: "google_places",
        });
        console.log(`  phone: ${place.phone}`);
      }
    }

    // 2. Driving distance (need lat/lng from places or from store)
    const dLat = place?.lat ?? store.latitude;
    const dLng = place?.lng ?? store.longitude;

    const driving = dLat && dLng ? await getDrivingDistance(dLat, dLng) : null;
    if (driving) {
      const roundTripKm = driving.distanceKm * 2;

      if (!store.kmRoundTrip || Math.abs(store.kmRoundTrip - roundTripKm) > 20) {
        suggestions.push({
          storeId: store.id,
          field: "kmRoundTrip",
          oldValue: store.kmRoundTrip?.toString() ?? null,
          newValue: roundTripKm.toString(),
          source: "google_directions",
        });
        console.log(
          `  kmRoundTrip: ${roundTripKm} (was ${store.kmRoundTrip ?? "null"})`,
        );
      }

      // Real toll costs (going + return) via Google Routes API
      const goingToll = await getRouteToll(ORIGIN, null, null, null, dLat!, dLng!);
      if (goingToll && goingToll.tollCost > 0) {
        suggestions.push({
          storeId: store.id,
          field: "tollCostGoing",
          oldValue: (store as any).tollCostGoing?.toString() ?? null,
          newValue: goingToll.tollCost.toString(),
          source: "google_routes_toll",
        });
        console.log(`  tollCostGoing: R$${goingToll.tollCost}`);
      }

      await new Promise((r) => setTimeout(r, 200));

      const returnToll = await getRouteToll(null, dLat!, dLng!, ORIGIN, null, null);
      if (returnToll && returnToll.tollCost > 0) {
        suggestions.push({
          storeId: store.id,
          field: "tollCostReturn",
          oldValue: (store as any).tollCostReturn?.toString() ?? null,
          newValue: returnToll.tollCost.toString(),
          source: "google_routes_toll",
        });
        console.log(`  tollCostReturn: R$${returnToll.tollCost}`);
      }
    }

    // Rate limit: ~200ms between stores
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n=== Total suggestions: ${suggestions.length} ===`);

  if (dryRun) {
    console.log("\nDry run — no changes saved.");
    for (const s of suggestions) {
      console.log(
        `  [${s.source}] store=${s.storeId} field=${s.field}: "${s.oldValue}" → "${s.newValue}"`,
      );
    }
  } else {
    console.log("\nSaving suggestions...");
    let created = 0;
    for (const s of suggestions) {
      await prisma.dataSuggestion.create({ data: s });
      created++;
    }
    console.log(`Created ${created} data suggestions. Review at /revisar-dados`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
