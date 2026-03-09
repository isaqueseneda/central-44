import { prisma } from "@/lib/db";
import { normalizeSearch } from "@/lib/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 },
    );
  }

  // Normalized (accent-stripped) variant for broader matching
  const nq = normalizeSearch(q);
  const useNormalized = nq !== q.toLowerCase();

  function containsOr(field: string) {
    const base = { [field]: { contains: q, mode: "insensitive" as const } };
    if (!useNormalized) return base;
    return {
      OR: [base, { [field]: { contains: nq, mode: "insensitive" as const } }],
    };
  }

  const [stores, employees, serviceOrders, materials, serviceTypes] =
    await Promise.all([
      prisma.store.findMany({
        where: {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
            ...(useNormalized
              ? [
                  { code: { contains: nq, mode: "insensitive" as const } },
                  { city: { contains: nq, mode: "insensitive" as const } },
                  { address: { contains: nq, mode: "insensitive" as const } },
                ]
              : []),
          ],
        },
        take: 10,
      }),
      prisma.employee.findMany({
        where: {
          OR: [
            { shortName: { contains: q, mode: "insensitive" } },
            { fullName: { contains: q, mode: "insensitive" } },
            ...(useNormalized
              ? [
                  { shortName: { contains: nq, mode: "insensitive" as const } },
                  { fullName: { contains: nq, mode: "insensitive" as const } },
                ]
              : []),
          ],
        },
        take: 10,
      }),
      prisma.serviceOrder.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            ...(useNormalized
              ? [{ name: { contains: nq, mode: "insensitive" as const } }]
              : []),
          ],
        },
        include: {
          stores: { include: { store: true } },
          vehicle: true,
        },
        take: 10,
      }),
      prisma.material.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            ...(useNormalized
              ? [{ name: { contains: nq, mode: "insensitive" as const } }]
              : []),
          ],
        },
        take: 10,
      }),
      prisma.serviceType.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            ...(useNormalized
              ? [{ name: { contains: nq, mode: "insensitive" as const } }]
              : []),
          ],
        },
        take: 10,
      }),
    ]);

  return NextResponse.json({
    stores,
    employees,
    serviceOrders,
    materials,
    serviceTypes,
    totalResults:
      stores.length +
      employees.length +
      serviceOrders.length +
      materials.length +
      serviceTypes.length,
  });
}
