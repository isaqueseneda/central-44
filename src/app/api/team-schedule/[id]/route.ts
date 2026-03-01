import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  teamId: z.string().optional(),
  date: z.string().datetime().optional(),
  serviceOrderId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// PUT /api/team-schedule/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateSchema.parse(body);

    const data: Record<string, any> = {};
    if (validated.teamId) data.teamId = validated.teamId;
    if (validated.date) data.date = new Date(validated.date);
    if ("serviceOrderId" in validated) data.serviceOrderId = validated.serviceOrderId;
    if ("notes" in validated) data.notes = validated.notes;

    const assignment = await prisma.teamScheduleAssignment.update({
      where: { id },
      data,
      include: {
        team: {
          include: {
            driver: true,
            vehicle: true,
            members: { include: { employee: true } },
          },
        },
        serviceOrder: {
          select: {
            id: true,
            orderNumber: true,
            name: true,
            status: true,
            priority: true,
            type: true,
            stores: { include: { store: { select: { id: true, sigla: true, city: true } } } },
          },
        },
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("PUT /api/team-schedule/[id] error:", error);
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

// DELETE /api/team-schedule/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.teamScheduleAssignment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/team-schedule/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}

// PATCH /api/team-schedule/[id] - Quick update for drag-and-drop moves
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.teamId) data.teamId = body.teamId;
    if (body.date) {
      const d = new Date(body.date);
      d.setUTCHours(0, 0, 0, 0);
      data.date = d;
    }
    if ("endDate" in body) {
      data.endDate = body.endDate ? (() => {
        const ed = new Date(body.endDate);
        ed.setUTCHours(0, 0, 0, 0);
        return ed;
      })() : null;
    }
    if ("serviceOrderId" in body) data.serviceOrderId = body.serviceOrderId;

    const assignment = await prisma.teamScheduleAssignment.update({
      where: { id },
      data,
      include: {
        team: {
          include: {
            driver: true,
            vehicle: true,
            members: { include: { employee: true } },
          },
        },
        serviceOrder: {
          select: {
            id: true,
            orderNumber: true,
            name: true,
            status: true,
            priority: true,
            type: true,
            stores: { include: { store: { select: { id: true, sigla: true, city: true } } } },
            serviceTypes: { include: { serviceType: { select: { id: true, name: true } } } },
          },
        },
      },
    });

    return NextResponse.json(assignment);
  } catch (error: any) {
    console.error("PATCH /api/team-schedule/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update assignment", details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
