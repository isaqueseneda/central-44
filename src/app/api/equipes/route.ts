import { prisma } from "@/lib/db";
import { teamSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        driver: true,
        vehicle: true,
        members: { include: { employee: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(teams);
  } catch (error) {
    console.error("[GET /api/equipes]", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { memberIds, memberDetails, ...rest } = teamSchema.parse(body);

    const team = await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          name: rest.name,
          driverId: rest.driverId || null,
          vehicleId: rest.vehicleId || null,
          isActive: rest.isActive,
        },
      });

      const detailsMap = new Map(
        memberDetails.map((md) => [md.employeeId, md]),
      );
      for (let i = 0; i < memberIds.length; i++) {
        const employeeId = memberIds[i];
        const detail = detailsMap.get(employeeId);
        await tx.teamMember.create({
          data: {
            teamId: created.id,
            employeeId,
            rank: detail?.rank ?? i,
            isLeader: detail?.isLeader ?? false,
          },
        });
      }

      return tx.team.findUnique({
        where: { id: created.id },
        include: {
          driver: true,
          vehicle: true,
          members: { include: { employee: true } },
        },
      });
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create team" },
      { status: 400 },
    );
  }
}
