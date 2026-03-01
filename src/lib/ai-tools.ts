import { prisma } from "./db";

// ============================================
// AI Tool Functions - These are called by the
// AI agent to query the database and perform
// business logic operations
// ============================================

export async function searchStores(query: string, state?: string) {
  return prisma.store.findMany({
    where: {
      AND: [
        state ? { state } : {},
        query
          ? {
              OR: [
                { city: { contains: query, mode: "insensitive" as const } },
                { sigla: { contains: query, mode: "insensitive" as const } },
                { code: { contains: query, mode: "insensitive" as const } },
                { address: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {},
      ],
    },
    orderBy: { code: "asc" },
    take: 20,
  });
}

export async function searchServiceOrders(params: {
  status?: string;
  storeName?: string;
  employeeName?: string;
  limit?: number;
}) {
  const { status, storeName, employeeName, limit = 10 } = params;

  return prisma.serviceOrder.findMany({
    where: {
      AND: [
        status
          ? { status: status as "NOT_STARTED" | "IN_PROGRESS" | "PAID" | "RETURN_VISIT" | "MEASUREMENT" | "REWORK" }
          : {},
        storeName
          ? {
              stores: {
                some: {
                  store: {
                    OR: [
                      { city: { contains: storeName, mode: "insensitive" as const } },
                      { sigla: { contains: storeName, mode: "insensitive" as const } },
                    ],
                  },
                },
              },
            }
          : {},
        employeeName
          ? {
              employees: {
                some: {
                  employee: {
                    shortName: { contains: employeeName, mode: "insensitive" as const },
                  },
                },
              },
            }
          : {},
      ],
    },
    include: {
      vehicle: true,
      stores: { include: { store: true } },
      employees: { include: { employee: true } },
      serviceTypes: { include: { serviceType: true } },
      materials: { include: { material: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getDashboardSummary() {
  const [
    totalOS,
    byStatus,
    totalStores,
    activeEmployees,
    totalRevenue,
    recentOS,
  ] = await Promise.all([
    prisma.serviceOrder.count(),
    prisma.serviceOrder.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.store.count(),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.serviceOrder.aggregate({
      where: { status: "PAID" },
      _sum: { totalCost: true },
    }),
    prisma.serviceOrder.findMany({
      include: {
        stores: { include: { store: true } },
        employees: { include: { employee: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    totalOS,
    statusBreakdown: byStatus.map((s) => ({
      status: s.status,
      count: s._count,
    })),
    totalStores,
    activeEmployees,
    totalRevenue: totalRevenue._sum.totalCost ?? 0,
    recentOS: recentOS.map((os) => ({
      id: os.id,
      name: os.name,
      status: os.status,
      totalCost: os.totalCost,
      stores: os.stores.map((s) => s.store.city).join(", "),
      employees: os.employees.map((e) => e.employee.shortName).join(", "),
    })),
  };
}

export async function getEmployeeWorkload() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: {
      assignments: {
        include: {
          serviceOrder: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { shortName: "asc" },
  });

  return employees.map((e) => ({
    name: e.shortName,
    totalAssignments: e.assignments.length,
    activeOS: e.assignments.filter(
      (a) => a.serviceOrder.status === "IN_PROGRESS"
    ).length,
    pendingOS: e.assignments.filter(
      (a) => a.serviceOrder.status === "NOT_STARTED"
    ).length,
    completedOS: e.assignments.filter(
      (a) => a.serviceOrder.status === "PAID"
    ).length,
  }));
}

export async function calculateOSCost(params: {
  kmRoundTrip: number;
  tollRoundTrip: number;
  numEmployees: number;
  estimatedHours?: number;
  materialIds?: string[];
}) {
  const {
    kmRoundTrip,
    tollRoundTrip,
    numEmployees,
    estimatedHours = 8,
    materialIds = [],
  } = params;

  // Standard rates (from research analysis)
  const hourlyRate = 405; // R$ 810/day for 2 employees = R$ 405/employee/day
  const kmRate = 0.5; // ~R$ 0.50/km for fuel/depreciation

  const laborCost = hourlyRate * numEmployees;
  const transportCost = kmRoundTrip * kmRate + tollRoundTrip;

  let materialCost = 0;
  if (materialIds.length > 0) {
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
    });
    materialCost = materials.reduce((sum, m) => sum + (m.salePrice ?? 0), 0);
  }

  const totalCost = laborCost + transportCost + materialCost;

  return {
    laborCost,
    transportCost,
    materialCost,
    totalCost,
    breakdown: {
      labor: `${numEmployees} funcionários x R$ ${hourlyRate.toFixed(2)} = R$ ${laborCost.toFixed(2)}`,
      transport: `${kmRoundTrip}km x R$ ${kmRate.toFixed(2)}/km + R$ ${tollRoundTrip.toFixed(2)} pedágio = R$ ${transportCost.toFixed(2)}`,
      material: `R$ ${materialCost.toFixed(2)}`,
      total: `R$ ${totalCost.toFixed(2)}`,
    },
  };
}

export async function getUnassignedOS() {
  return prisma.serviceOrder.findMany({
    where: {
      status: "NOT_STARTED",
      employees: { none: {} },
    },
    include: {
      stores: { include: { store: true } },
      serviceTypes: { include: { serviceType: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getStoresByRegion(state: string) {
  const stores = await prisma.store.findMany({
    where: { state },
    include: {
      serviceOrders: {
        include: {
          serviceOrder: {
            select: { status: true, totalCost: true },
          },
        },
      },
    },
    orderBy: { city: "asc" },
  });

  return stores.map((s) => ({
    code: s.code,
    sigla: s.sigla,
    city: s.city,
    kmRoundTrip: s.kmRoundTrip,
    tollRoundTrip: s.tollRoundTrip,
    totalOS: s.serviceOrders.length,
    pendingOS: s.serviceOrders.filter(
      (so) => so.serviceOrder.status === "NOT_STARTED"
    ).length,
    totalRevenue: s.serviceOrders
      .filter((so) => so.serviceOrder.status === "PAID")
      .reduce((sum, so) => sum + (so.serviceOrder.totalCost ?? 0), 0),
  }));
}

export async function getMaterialsInventory() {
  const materials = await prisma.material.findMany({
    include: {
      serviceOrders: {
        include: {
          serviceOrder: {
            select: { name: true, status: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return materials.map((m) => ({
    name: m.name,
    purchasePrice: m.purchasePrice,
    salePrice: m.salePrice,
    margin: m.purchasePrice && m.salePrice
      ? ((m.salePrice - m.purchasePrice) / m.purchasePrice * 100).toFixed(1) + "%"
      : "N/A",
    usedInOS: m.serviceOrders.length,
  }));
}

export async function getServiceTypeStats() {
  const serviceTypes = await prisma.serviceType.findMany({
    include: {
      serviceOrders: {
        include: {
          serviceOrder: {
            select: { status: true, totalCost: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return serviceTypes.map((st) => ({
    name: st.name,
    tags: st.tags,
    totalOS: st.serviceOrders.length,
    completedOS: st.serviceOrders.filter(
      (so) => so.serviceOrder.status === "PAID"
    ).length,
    pendingOS: st.serviceOrders.filter(
      (so) => so.serviceOrder.status === "NOT_STARTED"
    ).length,
    totalRevenue: st.serviceOrders
      .filter((so) => so.serviceOrder.status === "PAID")
      .reduce((sum, so) => sum + (so.serviceOrder.totalCost ?? 0), 0),
  }));
}
