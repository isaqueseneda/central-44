import { prisma } from "@/lib/db";
import { normalizeSearch } from "@/lib/utils";
import { employeeSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );
    const q = searchParams.get("q")?.trim();
    const isActiveParam = searchParams.get("isActive")?.trim();
    const allowedSorts = [
      "shortName",
      "fullName",
      "role",
      "startDate",
      "createdAt",
    ] as const;
    const sortParam = searchParams.get("sort") || "shortName";
    const sort = allowedSorts.includes(sortParam as any)
      ? sortParam
      : "shortName";
    const order =
      searchParams.get("order") === "desc"
        ? ("desc" as const)
        : ("asc" as const);

    const where: any = {};
    if (q) {
      const nq = normalizeSearch(q);
      const useNormalized = nq !== q.toLowerCase();
      where.OR = [
        { shortName: { contains: q, mode: "insensitive" } },
        { fullName: { contains: q, mode: "insensitive" } },
        ...(useNormalized
          ? [
              { shortName: { contains: nq, mode: "insensitive" } },
              { fullName: { contains: nq, mode: "insensitive" } },
            ]
          : []),
      ];
    }
    if (isActiveParam !== null && isActiveParam !== undefined) {
      where.isActive = isActiveParam === "true";
    }

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.employee.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/funcionarios]", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = employeeSchema.parse(body);
    const data: any = { ...parsed };
    if (data.startDate && typeof data.startDate === "string") {
      data.startDate = new Date(data.startDate);
    }
    const employee = await prisma.employee.create({ data });
    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create employee" },
      { status: 400 },
    );
  }
}
