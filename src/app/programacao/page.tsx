import { prisma } from "@/lib/db";
import {
  getEmployees,
  getMaterials,
  getServiceOrders,
  getServiceTypes,
  getStores,
  getTeams,
  getTeamScheduleAssignments,
  getVehicles,
} from "@/lib/queries";
import { Calendar } from "lucide-react";
import { ScheduleViewNew } from "./schedule-view-new";

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default async function SchedulePage() {
  const monday = getMondayOfWeek(new Date());

  const [
    teams,
    assignments,
    serviceOrders,
    employees,
    vehicles,
    stores,
    serviceTypes,
    materials,
    settingsRows,
  ] = await Promise.all([
    getTeams(),
    getTeamScheduleAssignments(monday),
    getServiceOrders(),
    getEmployees(),
    getVehicles(),
    getStores(),
    getServiceTypes(),
    getMaterials(),
    prisma.setting.findMany(),
  ]);

  const settings: Record<string, string> = {};
  for (const s of settingsRows) {
    settings[s.key] = s.value;
  }

  const serializedTeams = teams
    .filter((t) => t.isActive)
    .map((t) => ({
      id: t.id,
      name: t.name,
      driverId: t.driverId,
      driverName: t.driver?.shortName ?? null,
      vehicleId: t.vehicleId,
      vehicleName: t.vehicle?.name ?? null,
      vehiclePlate: t.vehicle?.licensePlate ?? null,
      isActive: t.isActive,
      memberIds: t.members.map((m) => m.employeeId),
      members: t.members.map((m) => ({
        employeeId: m.employeeId,
        employeeName: m.employee.shortName,
        rank: m.rank,
        isLeader: m.isLeader,
      })),
    }));

  const serializedAssignments = assignments.map((a) => ({
    id: a.id,
    teamId: a.teamId,
    date: a.date.toISOString(),
    endDate: a.endDate?.toISOString() ?? null,
    serviceOrderId: a.serviceOrderId,
    serviceOrder: a.serviceOrder
      ? {
          id: a.serviceOrder.id,
          orderNumber: a.serviceOrder.orderNumber,
          name: a.serviceOrder.name,
          status: a.serviceOrder.status,
          priority: a.serviceOrder.priority,
          type: a.serviceOrder.type,
          stores: a.serviceOrder.stores.map((s) => ({
            store: {
              id: s.store.id,
              sigla: s.store.sigla,
              city: s.store.city,
            },
          })),
          serviceTypes: a.serviceOrder.serviceTypes.map((st) => ({
            serviceType: { id: st.serviceType.id, name: st.serviceType.name },
          })),
        }
      : null,
    notes: a.notes,
  }));

  const serializedOrders = serviceOrders.map((os) => ({
    id: os.id,
    orderNumber: os.orderNumber,
    name: os.name,
    status: os.status,
    priority: os.priority,
    type: os.type,
    date: os.date?.toISOString() ?? null,
    isObra: (os as any).isObra ?? false,
    stores: os.stores.map((s) => ({
      store: {
        id: s.store.id,
        sigla: s.store.sigla,
        city: s.store.city,
      },
    })),
    serviceTypes: os.serviceTypes.map((st) => ({
      serviceType: { id: st.serviceType.id, name: st.serviceType.name },
    })),
    teamIds: os.teams.map((t) => t.teamId),
  }));

  // Collect all service order IDs that already have schedule assignments
  const scheduledOrderIds = new Set(
    assignments.filter((a) => a.serviceOrderId).map((a) => a.serviceOrderId!),
  );

  const serializedEmployees = employees.map((e) => ({
    id: e.id,
    shortName: e.shortName,
    rg: e.rg,
  }));

  const serializedVehicles = vehicles.map((v) => ({
    id: v.id,
    name: v.name,
    licensePlate: v.licensePlate,
  }));

  const serializedStores = stores.map((s) => ({
    id: s.id,
    sigla: s.sigla,
    city: s.city,
    code: s.code,
    kmRoundTrip: s.kmRoundTrip,
    tollRoundTrip: s.tollRoundTrip,
    tollCostGoing: s.tollCostGoing,
    tollCostReturn: s.tollCostReturn,
    storeNumber: s.storeNumber,
    state: s.state,
    address: s.address,
  }));

  const serializedServiceTypes = serviceTypes.map((st) => ({
    id: st.id,
    name: st.name,
  }));

  const serializedMaterials = materials.map((m) => ({
    id: m.id,
    name: m.name,
    salePrice: m.salePrice,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-sky-400/10 p-2">
            <Calendar className="h-6 w-6 text-sky-400" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100">
            Programação Semanal
          </h1>
        </div>
      </div>

      <ScheduleViewNew
        teams={serializedTeams}
        assignments={serializedAssignments}
        serviceOrders={serializedOrders}
        employees={serializedEmployees}
        vehicles={serializedVehicles}
        scheduledOrderIds={[...scheduledOrderIds]}
        stores={serializedStores}
        serviceTypes={serializedServiceTypes}
        materials={serializedMaterials}
        settings={settings}
      />
    </div>
  );
}
