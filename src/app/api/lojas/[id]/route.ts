import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storeSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const store = await prisma.store.findUnique({
      where: { id },
      include: { serviceOrders: { include: { serviceOrder: true } } },
    });
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
    return NextResponse.json(store);
  } catch (error) {
    console.error("[GET /api/lojas/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch store" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = storeSchema.partial().parse(body);
    const store = await prisma.store.update({ where: { id }, data: parsed });
    return NextResponse.json(store);
  } catch (error: any) {
    console.error("[PUT /api/lojas/[id]]", error);
    if (error.code === "P2025") return NextResponse.json({ error: "Store not found" }, { status: 404 });
    return NextResponse.json({ error: error.message || "Failed to update store" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.store.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/lojas/[id]]", error);
    if (error.code === "P2025") return NextResponse.json({ error: "Store not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to delete store" }, { status: 500 });
  }
}
