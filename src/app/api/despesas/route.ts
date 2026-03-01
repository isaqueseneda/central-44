import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/despesas?weekStart=YYYY-MM-DD
 * Returns all travel expenses for a given week (Mon-Sun).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get("weekStart");

    if (!weekStart) {
      return NextResponse.json(
        { error: "weekStart query param is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const startDate = new Date(weekStart + "T00:00:00.000Z");
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);

    const expenses = await prisma.travelExpense.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: {
        employee: { select: { id: true, shortName: true } },
        store: { select: { id: true, sigla: true, city: true } },
      },
      orderBy: [{ date: "asc" }, { employeeId: "asc" }],
    });

    return NextResponse.json({ data: expenses });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/despesas
 * Create or update (upsert) a travel expense.
 * Body: { employeeId, date, city?, storeId?, cafe?, almoco?, jantar?, hotel?, combustivel?, pedagio?, estacionamento?, reembolso?, uberTaxi?, notes? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, date, ...rest } = body;

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: "employeeId and date are required" },
        { status: 400 }
      );
    }

    const dateObj = new Date(date);

    // Upsert: one expense per employee per date
    const expense = await prisma.travelExpense.upsert({
      where: {
        employeeId_date: { employeeId, date: dateObj },
      },
      update: {
        ...rest,
      },
      create: {
        employeeId,
        date: dateObj,
        ...rest,
      },
      include: {
        employee: { select: { id: true, shortName: true } },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save expense" },
      { status: 400 }
    );
  }
}
