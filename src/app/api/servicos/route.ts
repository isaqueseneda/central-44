import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serviceTypeSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const q = searchParams.get("q")?.trim();
    const allowedSorts = ["name", "createdAt"] as const;
    const sortParam = searchParams.get("sort") || "name";
    const sort = allowedSorts.includes(sortParam as any) ? sortParam : "name";
    const order = searchParams.get("order") === "desc" ? "desc" as const : "asc" as const;

    const where: any = {};
    if (q) {
      where.name = { contains: q, mode: "insensitive" };
    }

    const [data, total] = await Promise.all([
      prisma.serviceType.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.serviceType.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/servicos]", error);
    return NextResponse.json({ error: "Failed to fetch service types" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = serviceTypeSchema.parse(body);
    const serviceType = await prisma.serviceType.create({ data: parsed });
    return NextResponse.json(serviceType, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create service type" }, { status: 400 });
  }
}
