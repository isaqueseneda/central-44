import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serviceTypeSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const serviceType = await prisma.serviceType.findUnique({
    where: { id },
    include: { serviceOrders: { include: { serviceOrder: true } } },
  });
  if (!serviceType) return NextResponse.json({ error: "Service type not found" }, { status: 404 });
  return NextResponse.json(serviceType);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = serviceTypeSchema.partial().parse(body);
    const serviceType = await prisma.serviceType.update({ where: { id }, data: parsed });
    return NextResponse.json(serviceType);
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Service type not found" }, { status: 404 });
    return NextResponse.json({ error: error.message || "Failed to update service type" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.serviceType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Service type not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to delete service type" }, { status: 500 });
  }
}
