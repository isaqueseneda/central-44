import { prisma } from "@/lib/db";
import { normalizeSearch } from "@/lib/utils";
import { vehicleSchema } from "@/lib/validations";
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
    const allowedSorts = ["name", "licensePlate", "createdAt"] as const;
    const sortParam = searchParams.get("sort") || "name";
    const sort = allowedSorts.includes(sortParam as any) ? sortParam : "name";
    const order =
      searchParams.get("order") === "desc"
        ? ("desc" as const)
        : ("asc" as const);

    const where: any = {};
    if (q) {
      const nq = normalizeSearch(q);
      const useNormalized = nq !== q.toLowerCase();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { licensePlate: { contains: q, mode: "insensitive" } },
        ...(useNormalized
          ? [
              { name: { contains: nq, mode: "insensitive" } },
              { licensePlate: { contains: nq, mode: "insensitive" } },
            ]
          : []),
      ];
    }
    if (isActiveParam !== null && isActiveParam !== undefined) {
      where.isActive = isActiveParam === "true";
    }

    const [data, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vehicle.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/frota]", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = vehicleSchema.parse(body);
    const vehicle = await prisma.vehicle.create({ data: parsed });
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create vehicle" },
      { status: 400 },
    );
  }
}
