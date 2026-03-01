import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { vehicleSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { serviceOrders: true },
  });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  return NextResponse.json(vehicle);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = vehicleSchema.partial().parse(body);
    const vehicle = await prisma.vehicle.update({ where: { id }, data: parsed });
    return NextResponse.json(vehicle);
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    return NextResponse.json({ error: error.message || "Failed to update vehicle" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to delete vehicle" }, { status: 500 });
  }
}
