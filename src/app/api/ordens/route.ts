import { prisma } from "@/lib/db";
import { serviceOrderSchema } from "@/lib/validations";
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
    const status = searchParams.get("status")?.trim();
    const type = searchParams.get("type")?.trim();
    const q = searchParams.get("q")?.trim();
    const allowedSorts = ["createdAt", "name", "status", "type", "date", "orderNumber", "totalCost"] as const;
    const sortParam = searchParams.get("sort") || "createdAt";
    const sort = allowedSorts.includes(sortParam as any) ? sortParam : "createdAt";
    const order =
      searchParams.get("order") === "asc"
        ? ("asc" as const)
        : ("desc" as const);

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (q) where.name = { contains: q, mode: "insensitive" };

    const [data, total] = await Promise.all([
      prisma.serviceOrder.findMany({
        where,
        include: {
          vehicle: true,
          stores: { include: { store: true } },
          serviceTypes: { include: { serviceType: true } },
          materials: { include: { material: true } },
          teams: { include: { team: true } },
        },
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.serviceOrder.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/ordens]", error);
    return NextResponse.json(
      { error: "Failed to fetch service orders" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      storeIds,
      serviceTypeIds,
      materialIds,
      teamIds,
      materialDetails,
      ...rest
    } = serviceOrderSchema.parse(body);

    const data: any = { ...rest };
    if (rest.date) data.date = new Date(rest.date);

    // ── Auto-generate numeroChamado if not provided ──
    if (!data.numeroChamado) {
      const lastOrder = await prisma.serviceOrder.findFirst({
        orderBy: { orderNumber: "desc" },
        select: { numeroChamado: true, orderNumber: true },
      });
      const lastNum = lastOrder?.numeroChamado
        ? parseInt(lastOrder.numeroChamado, 10)
        : (lastOrder?.orderNumber ?? 0);
      data.numeroChamado = String((isNaN(lastNum) ? 0 : lastNum) + 1);
    }

    // ── Default solicitadoPor ──
    if (!data.solicitadoPor) {
      data.solicitadoPor = "ENGº JOEL CASTELO NOVO";
    }

    // ── Auto-calculate costs if not provided ──
    if (storeIds.length > 0 && data.transportCost == null) {
      const stores = await prisma.store.findMany({
        where: { id: { in: storeIds } },
        select: { kmRoundTrip: true, tollRoundTrip: true },
      });
      const KM_PRICE = 1.6;
      data.transportCost = stores.reduce(
        (
          acc: number,
          s: { kmRoundTrip: number | null; tollRoundTrip: number | null },
        ) => {
          return acc + (s.kmRoundTrip ?? 0) * KM_PRICE + (s.tollRoundTrip ?? 0);
        },
        0,
      );
    }

    if (data.totalCost == null) {
      data.totalCost =
        (data.laborCost ?? 0) +
        (data.materialCost ?? 0) +
        (data.transportCost ?? 0) +
        (data.mealAllowance ?? 0) +
        (data.overnightAllowance ?? 0) +
        (data.tollDiscount ?? 0) +
        (data.parking ?? 0);
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.serviceOrder.create({ data });

      for (const storeId of storeIds) {
        await tx.serviceOrderStore.create({
          data: { serviceOrderId: created.id, storeId },
        });
      }
      for (const serviceTypeId of serviceTypeIds) {
        await tx.serviceOrderServiceType.create({
          data: { serviceOrderId: created.id, serviceTypeId },
        });
      }
      for (const materialId of materialIds) {
        const mdData = materialDetails?.find(
          (md) => md.materialId === materialId,
        );
        await tx.serviceOrderMaterial.create({
          data: {
            serviceOrderId: created.id,
            materialId,
            quantity: mdData?.quantity ?? null,
            unitPrice: mdData?.unitPrice ?? null,
          },
        });
      }

      for (const teamId of teamIds) {
        await tx.serviceOrderTeam.create({
          data: { serviceOrderId: created.id, teamId },
        });
      }

      // Auto-create schedule assignments if both date and teams are provided
      if (data.date && teamIds.length > 0) {
        const normalizedDate = new Date(data.date);
        normalizedDate.setUTCHours(0, 0, 0, 0);
        for (const teamId of teamIds) {
          await tx.teamScheduleAssignment.create({
            data: {
              teamId,
              date: normalizedDate,
              serviceOrderId: created.id,
            },
          });
        }
      }

      return tx.serviceOrder.findUnique({
        where: { id: created.id },
        include: {
          vehicle: true,
          stores: { include: { store: true } },
          serviceTypes: { include: { serviceType: true } },
          materials: { include: { material: true } },
          teams: { include: { team: true } },
        },
      });
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create service order" },
      { status: 400 },
    );
  }
}
