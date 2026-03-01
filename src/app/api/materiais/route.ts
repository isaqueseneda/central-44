import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { materialSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const q = searchParams.get("q")?.trim();
    const allowedSorts = ["name", "purchasePrice", "salePrice", "createdAt"] as const;
    const sortParam = searchParams.get("sort") || "name";
    const sort = allowedSorts.includes(sortParam as any) ? sortParam : "name";
    const order = searchParams.get("order") === "desc" ? "desc" as const : "asc" as const;

    const where: any = {};
    if (q) {
      where.name = { contains: q, mode: "insensitive" };
    }

    const [data, total] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.material.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/materiais]", error);
    return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = materialSchema.parse(body);
    const material = await prisma.material.create({ data: parsed });
    return NextResponse.json(material, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create material" }, { status: 400 });
  }
}
