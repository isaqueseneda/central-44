import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  const query = `%${q}%`;

  const [stores, employees, serviceOrders, materials, serviceTypes] = await Promise.all([
    prisma.store.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { address: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
    }),
    prisma.employee.findMany({
      where: {
        OR: [
          { shortName: { contains: q, mode: "insensitive" } },
          { fullName: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
    }),
    prisma.serviceOrder.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        stores: { include: { store: true } },
        vehicle: true,
      },
      take: 10,
    }),
    prisma.material.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 10,
    }),
    prisma.serviceType.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    stores,
    employees,
    serviceOrders,
    materials,
    serviceTypes,
    totalResults: stores.length + employees.length + serviceOrders.length + materials.length + serviceTypes.length,
  });
}
