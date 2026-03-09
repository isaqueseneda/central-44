import "dotenv/config";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
const ORIGIN = "Rio Claro, SP, Brazil";

interface TestCase {
  name: string;
  lat: number;
  lng: number;
  realTollRoundTrip: number | null; // user's known value
}

const tests: TestCase[] = [
  { name: "Alfenas (MG)", lat: -21.4292, lng: -45.9474, realTollRoundTrip: 90 },
  { name: "Lins (SP)", lat: -21.6726, lng: -49.7513, realTollRoundTrip: 124.4 },
  { name: "Mairiporã (SP)", lat: -23.3186, lng: -46.5872, realTollRoundTrip: null }, // 49.90 one way
  { name: "Limeira (SP)", lat: -22.5649, lng: -47.4013, realTollRoundTrip: null }, // should have tolls
];

async function testRoute(from: any, to: any, label: string) {
  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration,routes.travelAdvisory",
      },
      body: JSON.stringify({
        origin: from,
        destination: to,
        travelMode: "DRIVE",
        extraComputations: ["TOLLS"],
        routeModifiers: {
          vehicleInfo: { emissionType: "GASOLINE" },
        },
      }),
    },
  );

  const data = await res.json();

  if (data.error) {
    console.log(`  [${label}] ERROR: ${data.error.message}`);
    return null;
  }

  const route = data.routes?.[0];
  if (!route) {
    console.log(`  [${label}] no route returned`);
    return null;
  }

  const km = Math.round((route.distanceMeters ?? 0) / 1000);
  const tollInfo = route.travelAdvisory?.tollInfo;
  const speedReading = route.travelAdvisory?.speedReadingIntervals;

  console.log(`  [${label}] ${km}km`);
  console.log(`  [${label}] travelAdvisory keys: ${Object.keys(route.travelAdvisory ?? {}).join(", ")}`);

  if (tollInfo) {
    console.log(`  [${label}] tollInfo: ${JSON.stringify(tollInfo)}`);
    if (tollInfo.estimatedPrice?.length) {
      const p = tollInfo.estimatedPrice[0];
      const cost = parseFloat(p.units ?? "0") + parseFloat(p.nanos ?? "0") / 1e9;
      console.log(`  [${label}] toll: R$${cost.toFixed(2)} (${p.currencyCode})`);
      return cost;
    }
  } else {
    console.log(`  [${label}] NO tollInfo in response`);
  }

  return 0;
}

async function main() {
  console.log("=== Testing Google Routes API Toll Calculations ===\n");

  for (const t of tests) {
    console.log(`--- ${t.name} ---`);
    if (t.realTollRoundTrip) {
      console.log(`  Known real round trip toll: R$${t.realTollRoundTrip}`);
    }

    const goingCost = await testRoute(
      { address: ORIGIN },
      { location: { latLng: { latitude: t.lat, longitude: t.lng } } },
      "ida",
    );

    await new Promise((r) => setTimeout(r, 300));

    const returnCost = await testRoute(
      { location: { latLng: { latitude: t.lat, longitude: t.lng } } },
      { address: ORIGIN },
      "volta",
    );

    const totalGoogle = (goingCost ?? 0) + (returnCost ?? 0);
    console.log(`  TOTAL Google: R$${totalGoogle.toFixed(2)}`);
    if (t.realTollRoundTrip) {
      const diff = ((totalGoogle - t.realTollRoundTrip) / t.realTollRoundTrip * 100).toFixed(1);
      console.log(`  vs Real: R$${t.realTollRoundTrip} (diff: ${diff}%)`);
    }
    console.log();

    await new Promise((r) => setTimeout(r, 300));
  }
}

main().catch(console.error);
