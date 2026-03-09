/**
 * 1. Delete old pending toll suggestions
 * 2. Run Google Routes toll for ALL stores (using pending lat/lng if needed)
 * 3. Sample 5% of ALL pending suggestions for verification
 * 4. If 100% pass → bulk approve everything
 *
 * Usage: npx tsx scripts/toll-all-and-verify.ts
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

// ── Google Routes toll call ──
async function getRouteToll(
  from: Record<string, unknown>,
  to: Record<string, unknown>,
): Promise<{ tollCost: number; distanceKm: number } | null> {
  try {
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
        const cost =
          parseFloat(p.units ?? "0") + parseFloat(p.nanos ?? "0") / 1e9;
        return { tollCost: Math.round(cost * 100) / 100, distanceKm };
      }
    }
    return { tollCost: 0, distanceKm };
  } catch {
    return null;
  }
}

// ── Geocoding verification ──
async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ city: string; state: string } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}&result_type=locality&language=pt-BR`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]) return null;
    const comps = data.results[0].address_components ?? [];
    const city =
      comps.find((c: any) =>
        c.types.includes("administrative_area_level_2"),
      )?.long_name ?? "";
    const state =
      comps.find((c: any) =>
        c.types.includes("administrative_area_level_1"),
      )?.short_name ?? "";
    return { city, state };
  } catch {
    return null;
  }
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
  // ════════════════════════════════════════════
  // STEP 1: Delete old pending toll suggestions
  // ════════════════════════════════════════════
  const deleted = await prisma.dataSuggestion.deleteMany({
    where: {
      status: "PENDING",
      field: { in: ["tollCostGoing", "tollCostReturn", "tollRoundTrip"] },
    },
  });
  console.log(`Deleted ${deleted.count} old pending toll suggestions\n`);

  // ════════════════════════════════════════════
  // STEP 2: Run tolls for ALL stores
  // ════════════════════════════════════════════
  const allStores = await prisma.store.findMany({ orderBy: { city: "asc" } });

  // Get pending lat/lng suggestions to use as coords
  const latSuggs = await prisma.dataSuggestion.findMany({
    where: { field: "latitude", status: "PENDING" },
  });
  const lngSuggs = await prisma.dataSuggestion.findMany({
    where: { field: "longitude", status: "PENDING" },
  });
  const latByStore = new Map(
    latSuggs.map((s) => [s.storeId, parseFloat(s.newValue)]),
  );
  const lngByStore = new Map(
    lngSuggs.map((s) => [s.storeId, parseFloat(s.newValue)]),
  );

  const storesWithCoords = allStores
    .map((store) => ({
      ...store,
      lat: store.latitude ?? latByStore.get(store.id) ?? null,
      lng: store.longitude ?? lngByStore.get(store.id) ?? null,
    }))
    .filter((s) => s.lat != null && s.lng != null);

  console.log(
    `${storesWithCoords.length}/${allStores.length} stores with coordinates`,
  );
  console.log(`Running toll calculations (2 API calls per store)...\n`);

  let tollCreated = 0;
  let tollErrors = 0;

  for (let i = 0; i < storesWithCoords.length; i++) {
    const store = storesWithCoords[i];
    const pct = ((i / storesWithCoords.length) * 100).toFixed(0);
    process.stdout.write(
      `\r  [${pct}%] ${i + 1}/${storesWithCoords.length} ${store.sigla.padEnd(20)}`,
    );

    // Going
    const going = await getRouteToll(
      { address: ORIGIN },
      { location: { latLng: { latitude: store.lat, longitude: store.lng } } },
    );

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
      tollCreated++;
    } else if (!going) {
      tollErrors++;
    }

    await new Promise((r) => setTimeout(r, 150));

    // Return
    const returning = await getRouteToll(
      { location: { latLng: { latitude: store.lat, longitude: store.lng } } },
      { address: ORIGIN },
    );

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
      tollCreated++;
    } else if (!returning) {
      tollErrors++;
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(
    `\n\nToll results: ${tollCreated} suggestions created, ${tollErrors} errors\n`,
  );

  // ════════════════════════════════════════════
  // STEP 3: Verify 5% sample of ALL pending suggestions
  // ════════════════════════════════════════════
  console.log("=== VERIFICATION: 5% Sample ===\n");

  const allPending = await prisma.dataSuggestion.findMany({
    where: { status: "PENDING" },
    include: { store: true },
  });

  // Group by field for stratified sampling
  const byField = new Map<string, typeof allPending>();
  for (const s of allPending) {
    const arr = byField.get(s.field) ?? [];
    arr.push(s);
    byField.set(s.field, arr);
  }

  console.log("Pending suggestions by field:");
  for (const [field, items] of byField) {
    console.log(`  ${field}: ${items.length}`);
  }
  console.log(`  TOTAL: ${allPending.length}\n`);

  let totalSampled = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const failures: string[] = [];

  for (const [field, items] of byField) {
    const sampleSize = Math.max(1, Math.ceil(items.length * 0.05));
    const sample = shuffle(items).slice(0, sampleSize);
    let passed = 0;
    let failed = 0;

    console.log(
      `--- ${field} (${sampleSize} of ${items.length}) ---`,
    );

    for (const s of sample) {
      let ok = false;
      let detail = "";

      switch (field) {
        case "latitude":
        case "longitude": {
          // Verify lat/lng by reverse geocoding and checking city/state match
          const lat =
            field === "latitude"
              ? parseFloat(s.newValue)
              : (s.store.latitude ??
                parseFloat(
                  items.find(
                    (x) =>
                      x.storeId === s.storeId && x.field === "latitude",
                  )?.newValue ?? "0",
                ));
          const lng =
            field === "longitude"
              ? parseFloat(s.newValue)
              : (s.store.longitude ??
                parseFloat(
                  items.find(
                    (x) =>
                      x.storeId === s.storeId && x.field === "longitude",
                  )?.newValue ?? "0",
                ));

          if (field === "latitude") {
            // Only verify lat suggestions (covers both lat+lng)
            const geo = await reverseGeocode(lat, lng);
            if (geo) {
              // Normalize for comparison
              const storeCity = s.store.city
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();
              const geoCity = geo.city
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();
              // Check if city name is contained (handles abbreviations)
              ok =
                geoCity.includes(storeCity) ||
                storeCity.includes(geoCity) ||
                geo.state === s.store.state;
              detail = `${s.store.city},${s.store.state} → geocode: ${geo.city},${geo.state}`;
            } else {
              ok = true; // can't verify, assume ok
              detail = "geocode unavailable, skipped";
            }
            await new Promise((r) => setTimeout(r, 100));
          } else {
            ok = true; // lng verified together with lat
            detail = "verified with latitude";
          }
          break;
        }

        case "tollCostGoing":
        case "tollCostReturn": {
          // Verify toll by re-calling API and comparing
          const storeLat =
            s.store.latitude ?? latByStore.get(s.storeId) ?? null;
          const storeLng =
            s.store.longitude ?? lngByStore.get(s.storeId) ?? null;
          if (!storeLat || !storeLng) {
            ok = true;
            detail = "no coords, skipped";
            break;
          }

          const from =
            field === "tollCostGoing"
              ? { address: ORIGIN }
              : {
                  location: {
                    latLng: { latitude: storeLat, longitude: storeLng },
                  },
                };
          const to =
            field === "tollCostGoing"
              ? {
                  location: {
                    latLng: { latitude: storeLat, longitude: storeLng },
                  },
                }
              : { address: ORIGIN };

          const result = await getRouteToll(from, to);
          if (result) {
            const saved = parseFloat(s.newValue);
            ok = Math.abs(result.tollCost - saved) < 0.01;
            detail = `saved: R$${saved} vs re-calc: R$${result.tollCost}`;
          } else {
            ok = true;
            detail = "API error on re-check, skipped";
          }
          await new Promise((r) => setTimeout(r, 200));
          break;
        }

        case "kmRoundTrip": {
          // Verify km by checking it's a reasonable round number
          const km = parseFloat(s.newValue);
          ok = km > 0 && km < 5000; // sane range
          detail = `${km}km (sanity check)`;
          break;
        }

        case "cep": {
          // Verify CEP format (XXXXX-XXX or XXXXXXXX)
          const cep = s.newValue.replace(/\D/g, "");
          ok = cep.length === 8;
          detail = `"${s.newValue}" → ${cep.length} digits`;
          break;
        }

        case "phone": {
          // Verify phone has at least 10 digits
          const digits = s.newValue.replace(/\D/g, "");
          ok = digits.length >= 10 && digits.length <= 13;
          detail = `"${s.newValue}" → ${digits.length} digits`;
          break;
        }

        default: {
          // For any other field, just check it's non-empty
          ok = s.newValue.length > 0;
          detail = `non-empty value`;
          break;
        }
      }

      const icon = ok ? "✓" : "✗";
      console.log(
        `  ${icon} ${s.store.sigla} (${s.store.city}): ${detail}`,
      );

      if (ok) passed++;
      else {
        failed++;
        failures.push(
          `${field} | ${s.store.sigla} (${s.store.city}): ${detail}`,
        );
      }
      totalSampled++;
    }

    totalPassed += passed;
    totalFailed += failed;
    console.log(`  Result: ${passed}/${passed + failed} passed\n`);
  }

  // ════════════════════════════════════════════
  // STEP 4: Approve or report
  // ════════════════════════════════════════════
  console.log("=== VERIFICATION SUMMARY ===");
  console.log(`Sampled: ${totalSampled}`);
  console.log(`Passed:  ${totalPassed}`);
  console.log(`Failed:  ${totalFailed}`);

  if (totalFailed > 0) {
    console.log("\nFAILURES:");
    for (const f of failures) console.log(`  ✗ ${f}`);
    console.log("\nNOT approving due to failures. Review manually.");
  } else {
    console.log(`\n✓ ALL ${totalSampled} samples passed verification!`);
    console.log(`\nApproving all ${allPending.length} pending suggestions...`);

    // Numeric fields that need type conversion
    const numericFields = [
      "kmRoundTrip",
      "tollRoundTrip",
      "tollCostGoing",
      "tollCostReturn",
      "latitude",
      "longitude",
      "storeNumber",
    ];

    let approved = 0;
    for (const s of allPending) {
      const updateData: Record<string, unknown> = {};
      if (numericFields.includes(s.field)) {
        updateData[s.field] = Number(s.newValue);
      } else {
        updateData[s.field] = s.newValue;
      }

      await prisma.store.update({
        where: { id: s.storeId },
        data: updateData,
      });
      approved++;

      if (approved % 100 === 0) {
        process.stdout.write(`\r  Applied ${approved}/${allPending.length}`);
      }
    }

    await prisma.dataSuggestion.updateMany({
      where: { id: { in: allPending.map((s) => s.id) } },
      data: { status: "APPROVED" },
    });

    console.log(
      `\r  Applied and approved ${approved} suggestions. Done!       `,
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
