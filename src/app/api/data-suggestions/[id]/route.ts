import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body; // "APPROVED" or "REJECTED"

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "status must be APPROVED or REJECTED" },
        { status: 400 },
      );
    }

    const suggestion = await prisma.dataSuggestion.findUnique({
      where: { id },
    });

    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 },
      );
    }

    // If approving, update the store field
    if (status === "APPROVED") {
      const field = suggestion.field;
      const value = suggestion.newValue;

      // Determine the correct type for the store field
      const numericFields = [
        "kmRoundTrip",
        "tollRoundTrip",
        "tollCostGoing",
        "tollCostReturn",
        "latitude",
        "longitude",
        "storeNumber",
      ];
      const updateData: Record<string, unknown> = {};

      if (numericFields.includes(field)) {
        updateData[field] = Number(value);
      } else if (field === "storeNumber") {
        updateData[field] = parseInt(value);
      } else {
        updateData[field] = value;
      }

      await prisma.store.update({
        where: { id: suggestion.storeId },
        data: updateData,
      });
    }

    const updated = await prisma.dataSuggestion.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update suggestion" },
      { status: 400 },
    );
  }
}
