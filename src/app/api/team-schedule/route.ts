import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const assignmentSchema = z.object({
  teamId: z.string(),
  date: z.string().datetime(),
  serviceOrderId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// GET /api/team-schedule?weekStart=2026-02-10
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStartStr = searchParams.get("weekStart");

    if (!weekStartStr) {
      return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
    }

    const weekStart = new Date(weekStartStr);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const assignments = await prisma.teamScheduleAssignment.findMany({
      where: {
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
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
      orderBy: [{ date: "asc" }, { team: { name: "asc" } }],
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("GET /api/team-schedule error:", error);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}

// POST /api/team-schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = assignmentSchema.parse(body);

    const normalizedDate = new Date(validated.date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const includeClause = {
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
    };

    const assignment = await prisma.teamScheduleAssignment.create({
      data: {
        teamId: validated.teamId,
        date: normalizedDate,
        serviceOrderId: validated.serviceOrderId,
        notes: validated.notes,
      },
      include: includeClause,
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("POST /api/team-schedule error:", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
