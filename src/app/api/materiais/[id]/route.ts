import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { materialSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const material = await prisma.material.findUnique({
    where: { id },
    include: { serviceOrders: { include: { serviceOrder: true } } },
  });
  if (!material) return NextResponse.json({ error: "Material not found" }, { status: 404 });
  return NextResponse.json(material);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = materialSchema.partial().parse(body);
    const material = await prisma.material.update({ where: { id }, data: parsed });
    return NextResponse.json(material);
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Material not found" }, { status: 404 });
    return NextResponse.json({ error: error.message || "Failed to update material" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.material.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Material not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to delete material" }, { status: 500 });
  }
}
