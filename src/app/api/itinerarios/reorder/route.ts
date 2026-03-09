import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface ReorderAssignment {
  id: string;
  routeOrder: number;
}

/**
 * PATCH /api/itinerarios/reorder
 * Updates the route order for multiple team schedule assignments.
 *
 * Body: { assignments: { id: string, routeOrder: number }[] }
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { assignments } = body as { assignments: ReorderAssignment[] };

    if (!assignments || !Array.isArray(assignments)) {
      return NextResponse.json(
        { error: "assignments array is required" },
        { status: 400 }
      );
    }

    // Update all assignments in a transaction
    await prisma.$transaction(
      assignments.map((a) =>
        prisma.teamScheduleAssignment.update({
          where: { id: a.id },
          data: { routeOrder: a.routeOrder },
        })
      )
    );

    return NextResponse.json({ success: true, updated: assignments.length });
  } catch (error: any) {
    console.error("Error updating route order:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update route order" },
      { status: 500 }
    );
  }
}
