import {
  getServiceOrders,
  getStores,
  getTeams,
  getTeamScheduleAssignments,
} from "@/lib/queries";
import { Route } from "lucide-react";
import { ItinerariosView } from "./itinerarios-view";

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default async function ItinerariosPage() {
  const monday = getMondayOfWeek(new Date());

  const [teams, assignments, serviceOrders, stores] = await Promise.all([
    getTeams(),
    getTeamScheduleAssignments(monday),
    getServiceOrders(),
    getStores(),
  ]);

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
    routeOrder: a.routeOrder,
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
              latitude: s.store.latitude,
              longitude: s.store.longitude,
              address: s.store.address,
            },
          })),
          serviceTypes: a.serviceOrder.serviceTypes.map((st) => ({
            serviceType: { id: st.serviceType.id, name: st.serviceType.name },
          })),
        }
      : null,
    notes: a.notes,
  }));

  // Available service orders for adding to routes
  const serializedOrders = serviceOrders
    .filter((os) => os.status !== "PAID")
    .map((os) => ({
      id: os.id,
      orderNumber: os.orderNumber,
      name: os.name,
      status: os.status,
      priority: os.priority,
      type: os.type,
      stores: os.stores.map((s) => ({
        store: {
          id: s.store.id,
          sigla: s.store.sigla,
          city: s.store.city,
          latitude: s.store.latitude,
          longitude: s.store.longitude,
        },
      })),
      serviceTypes: os.serviceTypes.map((st) => ({
        serviceType: { id: st.serviceType.id, name: st.serviceType.name },
      })),
    }));

  // Stores with coordinates for depot selection
  const serializedStores = stores
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({
      id: s.id,
      sigla: s.sigla,
      city: s.city,
      latitude: s.latitude!,
      longitude: s.longitude!,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-400/10 p-2">
          <Route className="h-6 w-6 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-100">Itinerários</h1>
      </div>

      <ItinerariosView
        teams={serializedTeams}
        assignments={serializedAssignments}
        serviceOrders={serializedOrders}
        stores={serializedStores}
      />
    </div>
  );
}
