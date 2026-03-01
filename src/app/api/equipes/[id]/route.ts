import { prisma } from "@/lib/db";
import { teamSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      driver: true,
      vehicle: true,
      members: { include: { employee: true } },
    },
  });
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  return NextResponse.json(team);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { memberIds, memberDetails, ...rest } = teamSchema.parse(body);

    const team = await prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id },
        data: {
          name: rest.name,
          driverId: rest.driverId || null,
          vehicleId: rest.vehicleId || null,
          isActive: rest.isActive,
        },
      });

      // Replace members with rank and leader info
      await tx.teamMember.deleteMany({ where: { teamId: id } });
      const detailsMap = new Map(
        memberDetails.map((md) => [md.employeeId, md]),
      );
      for (let i = 0; i < memberIds.length; i++) {
        const employeeId = memberIds[i];
        const detail = detailsMap.get(employeeId);
        await tx.teamMember.create({
          data: {
            teamId: id,
            employeeId,
            rank: detail?.rank ?? i,
            isLeader: detail?.isLeader ?? false,
          },
        });
      }

      return tx.team.findUnique({
        where: { id },
        include: {
          driver: true,
          vehicle: true,
          members: { include: { employee: true } },
        },
      });
    });

    return NextResponse.json(team);
  } catch (error: any) {
    if (error.code === "P2025")
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    return NextResponse.json(
      { error: error.message || "Failed to update team" },
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
    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025")
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 },
    );
  }
}
