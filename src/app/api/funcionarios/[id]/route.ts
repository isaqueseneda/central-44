import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { employeeSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { assignments: { include: { serviceOrder: true } } },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = employeeSchema.partial().parse(body);
    const data: any = { ...parsed };
    if (parsed.startDate) data.startDate = new Date(parsed.startDate);
    const employee = await prisma.employee.update({ where: { id }, data });
    return NextResponse.json(employee);
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    return NextResponse.json({ error: error.message || "Failed to update employee" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Check if employee has service order assignments (historical data)
    const osCount = await prisma.serviceOrderEmployee.count({
      where: { employeeId: id },
    });

    if (osCount > 0) {
      // Soft-delete: deactivate instead of removing to preserve OS history
      await prisma.$transaction(async (tx) => {
        // Clean up schedule-related records
        await tx.teamMember.deleteMany({ where: { employeeId: id } });
        // Unset as driver where applicable
        await tx.team.updateMany({
          where: { driverId: id },
          data: { driverId: null },
        });
        // Deactivate
        await tx.employee.update({
          where: { id },
          data: { isActive: false },
        });
      });
      return NextResponse.json({ success: true, deactivated: true });
    }

    // No OS history — safe to hard-delete with cleanup
    await prisma.$transaction(async (tx) => {
      await tx.teamMember.deleteMany({ where: { employeeId: id } });
      await tx.team.updateMany({
        where: { driverId: id },
        data: { driverId: null },
      });
      await tx.employee.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
    return NextResponse.json({ error: error.message || "Erro ao excluir funcionário" }, { status: 500 });
  }
}
