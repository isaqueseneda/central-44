import { prisma } from "@/lib/db";
import { serviceOrderSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        vehicle: true,
        stores: { include: { store: true } },
        serviceTypes: { include: { serviceType: true } },
        materials: { include: { material: true } },
        teams: { include: { team: true } },
      },
    });
    if (!order)
      return NextResponse.json(
        { error: "Service order not found" },
        { status: 404 },
      );
    return NextResponse.json(order);
  } catch (error) {
    console.error("[GET /api/ordens/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch service order" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const {
      storeIds,
      serviceTypeIds,
      materialIds,
      teamIds,
      materialDetails,
      ...rest
    } = serviceOrderSchema.partial().parse(body);

    const data: any = { ...rest };
    if (rest.date) data.date = new Date(rest.date);

    const order = await prisma.$transaction(async (tx) => {
      // Update main record
      const updated = await tx.serviceOrder.update({ where: { id }, data });

      // Update junction tables if provided
      if (storeIds !== undefined) {
        await tx.serviceOrderStore.deleteMany({
          where: { serviceOrderId: id },
        });
        for (const storeId of storeIds) {
          await tx.serviceOrderStore.create({
            data: { serviceOrderId: id, storeId },
          });
        }
      }
      if (serviceTypeIds !== undefined) {
        await tx.serviceOrderServiceType.deleteMany({
          where: { serviceOrderId: id },
        });
        for (const serviceTypeId of serviceTypeIds) {
          await tx.serviceOrderServiceType.create({
            data: { serviceOrderId: id, serviceTypeId },
          });
        }
      }
      if (materialIds !== undefined) {
        await tx.serviceOrderMaterial.deleteMany({
          where: { serviceOrderId: id },
        });
        for (const materialId of materialIds) {
          const mdData = materialDetails?.find(
            (md) => md.materialId === materialId,
          );
          await tx.serviceOrderMaterial.create({
            data: {
              serviceOrderId: id,
              materialId,
              quantity: mdData?.quantity ?? null,
              unitPrice: mdData?.unitPrice ?? null,
            },
          });
        }
      }
      if (teamIds !== undefined) {
        await tx.serviceOrderTeam.deleteMany({ where: { serviceOrderId: id } });
        for (const teamId of teamIds) {
          await tx.serviceOrderTeam.create({
            data: { serviceOrderId: id, teamId },
          });
        }
      }

      return tx.serviceOrder.findUnique({
        where: { id },
        include: {
          vehicle: true,
          stores: { include: { store: true } },
          serviceTypes: { include: { serviceType: true } },
          materials: { include: { material: true } },
          teams: { include: { team: true } },
        },
      });
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("[PUT /api/ordens/[id]]", error);
    if (error.code === "P2025")
      return NextResponse.json(
        { error: "Service order not found" },
        { status: 404 },
      );
    return NextResponse.json(
      { error: error.message || "Failed to update service order" },
      { status: 400 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await req.json();
    // Allow partial updates for quick field changes (status, financial, notes)
    const allowedFields = [
      "status",
      "priority",
      "warranty",
      "isObra",
      "type",
      "numeroChamado",
      "solicitadoPor",
      "enderecoAtendimento",
      "servicoSolicitado",
      "kmIdaVolta",
      "kmRodada",
      "precoKm",
      "manHours",
      "laborCost",
      "materialCost",
      "transportCost",
      "totalCost",
      "mealAllowance",
      "overnightAllowance",
      "kmDiscount",
      "tollDiscount",
      "parking",
      "servicesPerformed",
      "managerComment",
      "materialsUsedNotes",
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        data[key] = body[key];
      }
    }

    const hasMaterialDetails = Array.isArray(body.materialDetails);

    if (Object.keys(data).length === 0 && !hasMaterialDetails) {
      return NextResponse.json(
        { error: "No valid fields provided" },
        { status: 400 },
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.serviceOrder.update({ where: { id }, data });
      }

      // Handle per-material details update
      if (hasMaterialDetails) {
        await tx.serviceOrderMaterial.deleteMany({
          where: { serviceOrderId: id },
        });
        for (const md of body.materialDetails) {
          if (md.materialId) {
            await tx.serviceOrderMaterial.create({
              data: {
                serviceOrderId: id,
                materialId: md.materialId,
                quantity: md.quantity ?? null,
                unitPrice: md.unitPrice ?? null,
              },
            });
          }
        }
      }

      return tx.serviceOrder.findUnique({
        where: { id },
        include: {
          vehicle: true,
          stores: { include: { store: true } },
          serviceTypes: { include: { serviceType: true } },
          materials: { include: { material: true } },
          teams: { include: { team: true } },
        },
      });
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("[PATCH /api/ordens/[id]]", error);
    if (error.code === "P2025")
      return NextResponse.json(
        { error: "Service order not found" },
        { status: 404 },
      );
    return NextResponse.json(
      { error: error.message || "Failed to update service order" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.serviceOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/ordens/[id]]", error);
    if (error.code === "P2025")
      return NextResponse.json(
        { error: "Service order not found" },
        { status: 404 },
      );
    return NextResponse.json(
      { error: "Failed to delete service order" },
      { status: 500 },
    );
  }
}
