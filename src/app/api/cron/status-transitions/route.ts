import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Cron job to automatically transition service order statuses.
 *
 * Rules (all times in America/Sao_Paulo — UTC-3):
 * 1. NOT_STARTED → IN_PROGRESS: when the schedule assignment start date
 *    has passed 7 AM Brazil time.
 * 2. IN_PROGRESS → MEASUREMENT: when the effective end date (endDate, or
 *    start date if no endDate) has passed 6 PM Brazil time.
 *
 * This runs retroactively — it checks all past dates, not just today,
 * so if the server was down, it catches up automatically.
 *
 * Call via: GET /api/cron/status-transitions?secret=<CRON_SECRET>
 * Or set up as a cron/scheduled task.
 */
export async function GET(req: Request) {
  // Optional secret protection
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    startedCount: 0,
    measurementCount: 0,
    errors: [] as string[],
  };

  try {
    // Current time in Brazil (UTC-3)
    const now = new Date();
    const brazilOffset = -3 * 60; // minutes
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const brazilNow = new Date(utcMs + brazilOffset * 60000);

    // ─── Transition 1: NOT_STARTED → IN_PROGRESS ───
    // Find all NOT_STARTED orders that have a schedule assignment with a
    // start date where 7 AM Brazil time has already passed.
    // 7 AM Brazil = 10:00 UTC (during standard time, BRT = UTC-3)
    const sevenAmUtcToday = new Date(
      Date.UTC(
        brazilNow.getFullYear(),
        brazilNow.getMonth(),
        brazilNow.getDate(),
        7 + 3, // 7 AM BRT = 10 AM UTC
        0,
        0,
      ),
    );

    // Find NOT_STARTED orders with schedule assignments whose start date
    // 7 AM has passed (retroactive: any past date, not just today)
    const notStartedOrders = await prisma.serviceOrder.findMany({
      where: {
        status: "NOT_STARTED",
        OR: [
          // OS with direct date that has passed 7 AM
          {
            date: { not: null, lte: sevenAmUtcToday },
          },
          // OS linked via schedule assignments
          {
            scheduledAssignments: {
              some: {
                date: { lte: sevenAmUtcToday },
              },
            },
          },
        ],
      },
      include: {
        scheduledAssignments: {
          orderBy: { date: "asc" },
          take: 1,
        },
      },
    });

    for (const order of notStartedOrders) {
      // Determine the effective start date
      const scheduleDate = order.scheduledAssignments[0]?.date;
      const effectiveStart = scheduleDate ?? order.date;
      if (!effectiveStart) continue;

      // Check if 7 AM Brazil time on that date has passed
      const startDay = new Date(effectiveStart);
      const sevenAmOnStartDay = new Date(
        Date.UTC(
          startDay.getUTCFullYear(),
          startDay.getUTCMonth(),
          startDay.getUTCDate(),
          10, // 7 AM BRT = 10 AM UTC
          0,
          0,
        ),
      );

      if (now >= sevenAmOnStartDay) {
        try {
          await prisma.serviceOrder.update({
            where: { id: order.id },
            data: { status: "IN_PROGRESS" },
          });
          results.startedCount++;
        } catch (err: any) {
          results.errors.push(
            `Failed to start OS-${order.orderNumber}: ${err.message}`,
          );
        }
      }
    }

    // ─── Transition 2: IN_PROGRESS → MEASUREMENT ───
    // Find all IN_PROGRESS orders. For each, check if the effective end
    // date's 6 PM Brazil time has passed. Effective end date = schedule
    // assignment endDate, or schedule assignment date, or OS date.
    const inProgressOrders = await prisma.serviceOrder.findMany({
      where: {
        status: "IN_PROGRESS",
      },
      include: {
        scheduledAssignments: {
          orderBy: { date: "asc" },
        },
      },
    });

    for (const order of inProgressOrders) {
      // Find the effective end date:
      // Priority: schedule assignment endDate > schedule assignment date > OS date
      let effectiveEnd: Date | null = null;

      if (order.scheduledAssignments.length > 0) {
        // Use the latest assignment's endDate, or its date if no endDate
        const lastAssignment =
          order.scheduledAssignments[order.scheduledAssignments.length - 1];
        effectiveEnd = lastAssignment.endDate ?? lastAssignment.date;
      } else {
        effectiveEnd = order.date;
      }

      if (!effectiveEnd) continue;

      // Check if 6 PM Brazil time on the end date has passed
      const endDay = new Date(effectiveEnd);
      const sixPmOnEndDay = new Date(
        Date.UTC(
          endDay.getUTCFullYear(),
          endDay.getUTCMonth(),
          endDay.getUTCDate(),
          21, // 6 PM BRT = 21:00 UTC
          0,
          0,
        ),
      );

      if (now >= sixPmOnEndDay) {
        try {
          await prisma.serviceOrder.update({
            where: { id: order.id },
            data: { status: "MEASUREMENT" },
          });
          results.measurementCount++;
        } catch (err: any) {
          results.errors.push(
            `Failed to move OS-${order.orderNumber} to Medição: ${err.message}`,
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      brazilTime: brazilNow.toISOString(),
      transitioned: {
        toInProgress: results.startedCount,
        toMeasurement: results.measurementCount,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error: any) {
    console.error("[CRON status-transitions]", error);
    return NextResponse.json(
      { error: error.message || "Cron job failed" },
      { status: 500 },
    );
  }
}
