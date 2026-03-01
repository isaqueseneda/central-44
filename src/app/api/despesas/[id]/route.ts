import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const expense = await prisma.travelExpense.update({
      where: { id },
      data: body,
      include: {
        employee: { select: { id: true, shortName: true } },
      },
    });

    return NextResponse.json(expense);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update expense" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.travelExpense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete expense" },
      { status: 400 }
    );
  }
}
