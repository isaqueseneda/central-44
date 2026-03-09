/**
 * Toll calculation using Google Routes API with real toll data.
 *
 * Uses `extraComputations: ["TOLLS"]` to get actual BRL toll costs.
 */

// Rio Claro, SP — Central 44 HQ
const ORIGIN = "Rio Claro, SP, Brazil";

export interface TollResult {
  distanceKm: number;
  tollCost: number;
  source: "google_routes_toll";
}

async function callGoogleRoutes(
  apiKey: string,
  from: Record<string, unknown>,
  to: Record<string, unknown>,
): Promise<TollResult | null> {
  try {
    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
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

    if (data.error || !data.routes?.[0]) return null;

    const route = data.routes[0];
    const distanceKm = Math.round((route.distanceMeters ?? 0) / 1000);

    const tollInfo = route.travelAdvisory?.tollInfo;
    if (tollInfo?.estimatedPrice?.length) {
      const price = tollInfo.estimatedPrice[0];
      if (price.currencyCode === "BRL") {
        const tollCost =
          parseFloat(price.units ?? "0") +
          parseFloat(price.nanos ?? "0") / 1_000_000_000;
        return {
          distanceKm,
          tollCost: Math.round(tollCost * 100) / 100,
          source: "google_routes_toll",
        };
      }
    }

    // API returned no toll info — route has no tolls (e.g. very short)
    return { distanceKm, tollCost: 0, source: "google_routes_toll" };
  } catch {
    return null;
  }
}

export async function computeRouteToll(
  apiKey: string,
  destLat: number,
  destLng: number,
): Promise<TollResult | null> {
  return callGoogleRoutes(
    apiKey,
    { address: ORIGIN },
    { location: { latLng: { latitude: destLat, longitude: destLng } } },
  );
}

export async function computeReturnToll(
  apiKey: string,
  destLat: number,
  destLng: number,
): Promise<TollResult | null> {
  return callGoogleRoutes(
    apiKey,
    { location: { latLng: { latitude: destLat, longitude: destLng } } },
    { address: ORIGIN },
  );
}

export async function computeRouteTollBothWays(
  apiKey: string,
  destLat: number,
  destLng: number,
): Promise<{
  going: TollResult;
  returning: TollResult;
} | null> {
  const going = await computeRouteToll(apiKey, destLat, destLng);
  if (!going) return null;

  const returning = await computeReturnToll(apiKey, destLat, destLng);

  return {
    going,
    returning: returning ?? going,
  };
}
