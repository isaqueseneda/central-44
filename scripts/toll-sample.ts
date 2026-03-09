/**
 * Sample toll calculation: picks 7 random stores,
 * uses pending lat/lng suggestions if store has no coords yet,
 * calls Google Routes API for going + return tolls, and saves
 * DataSuggestion records labeled "google_routes_toll".
 *
 * Usage:
 *   npx tsx scripts/toll-sample.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!API_KEY) throw new Error("GOOGLE_MAPS_API_KEY is required");

const adapter = new PrismaPg({
  connectionString: `${DATABASE_URL}${DATABASE_URL.includes("?") ? "&" : "?"}sslmode=verify-full`,
});
const prisma = new PrismaClient({ adapter });

const ORIGIN = "Rio Claro, SP, Brazil";

async function getRouteToll(
  from: Record<string, unknown>,
  to: Record<string, unknown>,
): Promise<{ tollCost: number; distanceKm: number } | null> {
  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY!,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.travelAdvisory",
      },
      body: JSON.stringify({
        origin: from,
        destination: to,
        travelMode: "DRIVE",
        extraComputations: ["TOLLS"],
        routeModifiers: { vehicleInfo: { emissionType: "GASOLINE" } },
      }),
    },
  );
  const data = await res.json();
  if (data.error || !data.routes?.[0]) return null;

  const route = data.routes[0];
  const distanceKm = Math.round((route.distanceMeters ?? 0) / 1000);
  const tollInfo = route.travelAdvisory?.tollInfo;

  if (tollInfo?.estimatedPrice?.length) {
    const p = tollInfo.estimatedPrice[0];
    if (p.currencyCode === "BRL") {
      const cost = parseFloat(p.units ?? "0") + parseFloat(p.nanos ?? "0") / 1e9;
      return { tollCost: Math.round(cost * 100) / 100, distanceKm };
    }
  }
  return { tollCost: 0, distanceKm };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  const allStores = await prisma.store.findMany();

  // Get pending lat/lng suggestions
  const latSuggestions = await prisma.dataSuggestion.findMany({
    where: { field: "latitude", status: "PENDING" },
  });
  const lngSuggestions = await prisma.dataSuggestion.findMany({
    where: { field: "longitude", status: "PENDING" },
  });
  const latByStore = new Map(latSuggestions.map((s) => [s.storeId, parseFloat(s.newValue)]));
  const lngByStore = new Map(lngSuggestions.map((s) => [s.storeId, parseFloat(s.newValue)]));

  const storesWithCoords = allStores
    .map((store) => ({
      ...store,
      lat: store.latitude ?? latByStore.get(store.id) ?? null,
      lng: store.longitude ?? lngByStore.get(store.id) ?? null,
    }))
    .filter((s) => s.lat != null && s.lng != null);

  console.log(`${storesWithCoords.length} stores with coordinates\n`);

  const sample = shuffle(storesWithCoords).slice(0, 7);
  console.log(`Selected 7 random stores:\n`);

  let suggestionsCreated = 0;

  for (const store of sample) {
    console.log(`--- ${store.sigla} | ${store.city}, ${store.state} ---`);

    // Going
    const going = await getRouteToll(
      { address: ORIGIN },
      { location: { latLng: { latitude: store.lat, longitude: store.lng } } },
    );

    if (going) {
      console.log(`  ida:   R$${going.tollCost.toFixed(2)} (${going.distanceKm}km)`);
    } else {
      console.log(`  ida:   ERRO`);
    }

    await new Promise((r) => setTimeout(r, 300));

    // Return
    const returning = await getRouteToll(
      { location: { latLng: { latitude: store.lat, longitude: store.lng } } },
      { address: ORIGIN },
    );

    if (returning) {
      console.log(`  volta: R$${returning.tollCost.toFixed(2)} (${returning.distanceKm}km)`);
    } else {
      console.log(`  volta: ERRO`);
    }

    const total = (going?.tollCost ?? 0) + (returning?.tollCost ?? 0);
    console.log(`  TOTAL: R$${total.toFixed(2)}`);

    // Save suggestions
    await prisma.dataSuggestion.deleteMany({
      where: {
        storeId: store.id,
        field: { in: ["tollCostGoing", "tollCostReturn", "tollRoundTrip"] },
        status: "PENDING",
      },
    });

    if (going && going.tollCost > 0) {
      await prisma.dataSuggestion.create({
        data: {
          storeId: store.id,
          field: "tollCostGoing",
          oldValue: store.tollCostGoing?.toString() ?? null,
          newValue: going.tollCost.toString(),
          source: "google_routes_toll",
        },
      });
      suggestionsCreated++;
    }

    if (returning && returning.tollCost > 0) {
      await prisma.dataSuggestion.create({
        data: {
          storeId: store.id,
          field: "tollCostReturn",
          oldValue: store.tollCostReturn?.toString() ?? null,
          newValue: returning.tollCost.toString(),
          source: "google_routes_toll",
        },
      });
      suggestionsCreated++;
    }

    console.log();
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`=== Pronto ===`);
  console.log(`${suggestionsCreated} sugestões criadas (fonte: Google Routes)`);
  console.log(`Revise em /revisar-dados`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
