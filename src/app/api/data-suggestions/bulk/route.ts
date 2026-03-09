import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { ids, status } = body; // ids: string[], status: "APPROVED" | "REJECTED"

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 },
      );
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "status must be APPROVED or REJECTED" },
        { status: 400 },
      );
    }

    const suggestions = await prisma.dataSuggestion.findMany({
      where: { id: { in: ids }, status: "PENDING" },
    });

    if (status === "APPROVED") {
      const numericFields = [
        "kmRoundTrip",
        "tollRoundTrip",
        "tollCostGoing",
        "tollCostReturn",
        "latitude",
        "longitude",
        "storeNumber",
      ];

      for (const suggestion of suggestions) {
        const updateData: Record<string, unknown> = {};
        if (numericFields.includes(suggestion.field)) {
          updateData[suggestion.field] = Number(suggestion.newValue);
        } else {
          updateData[suggestion.field] = suggestion.newValue;
        }

        await prisma.store.update({
          where: { id: suggestion.storeId },
          data: updateData,
        });
      }
    }

    await prisma.dataSuggestion.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      count: suggestions.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to bulk update" },
      { status: 400 },
    );
  }
}
