import { prisma } from "@/lib/db";
import { normalizeSearch } from "@/lib/utils";
import { storeSchema } from "@/lib/validations";
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
    const state = searchParams.get("state")?.trim();
    const allowedSorts = [
      "code",
      "city",
      "state",
      "sigla",
      "createdAt",
    ] as const;
    const sortParam = searchParams.get("sort") || "code";
    const sort = allowedSorts.includes(sortParam as any) ? sortParam : "code";
    const order =
      searchParams.get("order") === "desc"
        ? ("desc" as const)
        : ("asc" as const);

    const where: any = {};
    if (q) {
      const nq = normalizeSearch(q);
      const useNormalized = nq !== q.toLowerCase();
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        ...(useNormalized
          ? [
              { code: { contains: nq, mode: "insensitive" } },
              { city: { contains: nq, mode: "insensitive" } },
              { address: { contains: nq, mode: "insensitive" } },
              { phone: { contains: nq, mode: "insensitive" } },
            ]
          : []),
      ];
    }
    if (state) where.state = { equals: state, mode: "insensitive" };

    const [data, total] = await Promise.all([
      prisma.store.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.store.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/lojas]", error);
    return NextResponse.json(
      { error: "Failed to fetch stores" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = storeSchema.parse(body);
    const store = await prisma.store.create({ data: parsed });
    return NextResponse.json(store, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create store" },
      { status: 400 },
    );
  }
}
