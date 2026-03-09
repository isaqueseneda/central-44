import { prisma } from "./db";

export async function getStores() {
  return prisma.store.findMany({
    orderBy: { code: "asc" },
  });
}

export async function getEmployees() {
  return prisma.employee.findMany({
    orderBy: { shortName: "asc" },
  });
}

export async function getVehicles() {
  return prisma.vehicle.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getServiceTypes() {
  return prisma.serviceType.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getMaterials() {
  return prisma.material.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function getTeams() {
  return prisma.team.findMany({
    include: {
      driver: true,
      vehicle: true,
      members: { include: { employee: true }, orderBy: { rank: "asc" } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getTeamById(id: string) {
  return prisma.team.findUnique({
    where: { id },
    include: {
      driver: true,
      vehicle: true,
      members: { include: { employee: true }, orderBy: { rank: "asc" } },
    },
  });
}

export async function getTeamScheduleAssignments(weekStart: Date) {
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  return prisma.teamScheduleAssignment.findMany({
    where: {
      date: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
    include: {
      team: {
        include: {
          driver: true,
          vehicle: true,
          members: { include: { employee: true } },
        },
      },
      serviceOrder: {
        select: {
          id: true,
          orderNumber: true,
          name: true,
          status: true,
          priority: true,
          type: true,
          stores: {
            include: {
              store: { select: { id: true, sigla: true, city: true, latitude: true, longitude: true, address: true } },
            },
          },
          serviceTypes: {
            include: { serviceType: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: [{ date: "asc" }, { routeOrder: "asc" }, { team: { name: "asc" } }],
  });
}

export async function getServiceOrders() {
  return prisma.serviceOrder.findMany({
    include: {
      vehicle: true,
      stores: { include: { store: true } },
      serviceTypes: { include: { serviceType: true } },
      materials: { include: { material: true } },
      teams: {
        include: {
          team: {
            include: {
              members: { include: { employee: true } },
              driver: true,
              vehicle: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getServiceOrderById(id: string) {
  return prisma.serviceOrder.findUnique({
    where: { id },
    include: {
      vehicle: true,
      stores: { include: { store: true } },
      employees: { include: { employee: true } },
      serviceTypes: { include: { serviceType: true } },
      materials: { include: { material: true } },
      teams: {
        include: {
          team: {
            include: {
              members: { include: { employee: true } },
              driver: true,
              vehicle: true,
            },
          },
        },
      },
    },
  });
}

export async function getDashboardStats() {
  const [
    totalOS,
    pendingOS,
    inProgressOS,
    paidThisMonth,
    totalStores,
    totalEmployees,
  ] = await Promise.all([
    prisma.serviceOrder.count(),
    prisma.serviceOrder.count({
      where: { status: "NOT_STARTED" },
    }),
    prisma.serviceOrder.count({
      where: { status: "IN_PROGRESS" },
    }),
    prisma.serviceOrder.count({
      where: {
        status: "PAID",
        updatedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.store.count(),
    prisma.employee.count({ where: { isActive: true } }),
  ]);

  // Current week Monday
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekMonday = new Date(now);
  weekMonday.setDate(now.getDate() + diffToMonday);
  weekMonday.setHours(0, 0, 0, 0);

  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekMonday.getDate() + 6);
  weekSunday.setHours(23, 59, 59, 999);

  const [revenueThisMonth, weeklyExpenses] = await Promise.all([
    prisma.serviceOrder.aggregate({
      where: {
        status: "PAID",
        updatedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { totalCost: true },
    }),
    prisma.travelExpense.aggregate({
      where: {
        date: { gte: weekMonday, lte: weekSunday },
      },
      _sum: {
        cafe: true,
        almoco: true,
        jantar: true,
        hotel: true,
        combustivel: true,
        pedagio: true,
        estacionamento: true,
        reembolso: true,
        uberTaxi: true,
      },
    }),
  ]);

  const expenseSum = weeklyExpenses._sum;
  const weekExpenseTotal =
    (expenseSum.cafe ?? 0) +
    (expenseSum.almoco ?? 0) +
    (expenseSum.jantar ?? 0) +
    (expenseSum.hotel ?? 0) +
    (expenseSum.combustivel ?? 0) +
    (expenseSum.pedagio ?? 0) +
    (expenseSum.estacionamento ?? 0) +
    (expenseSum.reembolso ?? 0) +
    (expenseSum.uberTaxi ?? 0);

  return {
    totalOS,
    pendingOS,
    inProgressOS,
    paidThisMonth,
    totalStores,
    totalEmployees,
    revenueThisMonth: revenueThisMonth._sum.totalCost ?? 0,
    weekExpenseTotal,
  };
}
