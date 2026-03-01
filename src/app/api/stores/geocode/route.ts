import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/stores/geocode
 * Batch geocodes all stores without coordinates using Nominatim (free, OSM).
 * Rate-limited to 1 request/second per Nominatim policy.
 */
export async function POST() {
  try {
    const stores = await prisma.store.findMany({
      where: {
        OR: [
          { latitude: null },
          { latitude: 0 },
        ],
      },
      select: { id: true, city: true, state: true, address: true },
    });

    if (stores.length === 0) {
      return NextResponse.json({ message: "All stores already geocoded", updated: 0 });
    }

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const store of stores) {
      try {
        // Skip stores with no real city
        if (!store.city || store.city === "-" || store.city.length < 2) {
          continue;
        }

        // Build search query: "address, city, state, Brazil"
        const query = store.address && store.address !== "N/A"
          ? `${store.address}, ${store.city}, ${store.state}, Brazil`
          : `${store.city}, ${store.state}, Brazil`;

        const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
          q: query,
          format: "json",
          limit: "1",
          countrycodes: "br",
        })}`;

        const res = await fetch(url, {
          headers: {
            "User-Agent": "Central44App/1.0 (contact@centralengenharia.com.br)",
          },
        });

        if (!res.ok) {
          errors.push(`${store.city}: HTTP ${res.status}`);
          failed++;
          continue;
        }

        const data = await res.json();

        if (data.length > 0) {
          const { lat, lon } = data[0];
          await prisma.store.update({
            where: { id: store.id },
            data: {
              latitude: parseFloat(lat),
              longitude: parseFloat(lon),
            },
          });
          updated++;
        } else {
          // Fallback: try just city + state
          const fallbackUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
            q: `${store.city}, ${store.state}, Brazil`,
            format: "json",
            limit: "1",
            countrycodes: "br",
          })}`;

          const fallbackRes = await fetch(fallbackUrl, {
            headers: {
              "User-Agent": "Central44App/1.0 (contact@centralengenharia.com.br)",
            },
          });

          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (fallbackData.length > 0) {
              const { lat, lon } = fallbackData[0];
              await prisma.store.update({
                where: { id: store.id },
                data: {
                  latitude: parseFloat(lat),
                  longitude: parseFloat(lon),
                },
              });
              updated++;
            } else {
              errors.push(`${store.city}: no results`);
              failed++;
            }
          }

          // Extra delay for fallback request
          await new Promise((r) => setTimeout(r, 1100));
        }

        // Rate limit: 1 req/sec for Nominatim
        await new Promise((r) => setTimeout(r, 1100));
      } catch (err: any) {
        errors.push(`${store.city}: ${err.message}`);
        failed++;
      }
    }

    return NextResponse.json({
      total: stores.length,
      updated,
      failed,
      errors: errors.slice(0, 20),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Geocode failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stores/geocode
 * Returns geocode stats — how many stores have coordinates.
 */
export async function GET() {
  const [total, geocoded] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({
      where: {
        latitude: { not: null },
        NOT: { latitude: 0 },
      },
    }),
  ]);

  return NextResponse.json({ total, geocoded, missing: total - geocoded });
}
