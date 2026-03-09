import { prisma } from "@/lib/db";
import { computeRouteTollBothWays } from "@/lib/toll-calculation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit = body.limit ?? 75;
    const mode: "missing" | "all" = body.mode ?? "missing";

    let stores;
    if (mode === "all") {
      // Fetch all stores with coordinates (no limit)
      stores = await prisma.store.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
        },
        orderBy: { city: "asc" },
      });
    } else {
      // Prioritize stores without toll data
      stores = await prisma.store.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
          tollCostGoing: null,
        },
        orderBy: { city: "asc" },
        take: limit,
      });
    }

    let updated = 0;
    let processed = 0;
    let noTolls = 0;
    const errors: string[] = [];

    for (const store of stores) {
      try {
        const result = await computeRouteTollBothWays(
          apiKey,
          store.latitude!,
          store.longitude!,
        );

        processed++;

        if (!result) {
          errors.push(`${store.sigla}: no route found`);
          continue;
        }

        const goingCost = result.going.tollCost;
        const returnCost = result.returning.tollCost;

        if (goingCost === 0 && returnCost === 0) {
          noTolls++;
          // Still update to record that we checked (set to 0)
          await prisma.store.update({
            where: { id: store.id },
            data: {
              tollCostGoing: 0,
              tollCostReturn: 0,
              tollRoundTrip: 0,
            },
          });
          updated++;
          continue;
        }

        await prisma.store.update({
          where: { id: store.id },
          data: {
            tollCostGoing: goingCost,
            tollCostReturn: returnCost,
            tollRoundTrip: goingCost + returnCost,
          },
        });
        updated++;

        // Rate limit: 300ms between stores (2 API calls each)
        await new Promise((r) => setTimeout(r, 300));
      } catch (err: any) {
        errors.push(`${store.sigla}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      storesProcessed: processed,
      storesUpdated: updated,
      storesWithNoTolls: noTolls,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to recalculate tolls" },
      { status: 500 },
    );
  }
}
