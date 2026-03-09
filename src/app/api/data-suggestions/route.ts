import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";

    const suggestions = await prisma.dataSuggestion.findMany({
      where: { status: status as any },
      include: { store: true },
      orderBy: [{ store: { city: "asc" } }, { field: "asc" }],
    });

    return NextResponse.json(suggestions);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch suggestions" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, field, oldValue, newValue, source } = body;

    if (!storeId || !field || newValue === undefined) {
      return NextResponse.json(
        { error: "storeId, field, and newValue are required" },
        { status: 400 },
      );
    }

    const suggestion = await prisma.dataSuggestion.create({
      data: {
        storeId,
        field,
        oldValue: oldValue ?? null,
        newValue: String(newValue),
        source: source ?? null,
      },
    });

    return NextResponse.json(suggestion, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create suggestion" },
      { status: 400 },
    );
  }
}
