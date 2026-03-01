import type { OSFormRefs } from "@/components/forms/os-form-dialog";
import {
  getEmployees,
  getMaterials,
  getServiceOrders,
  getServiceTypes,
  getSettings,
  getStores,
  getTeams,
  getVehicles,
} from "@/lib/queries";
import OSListClient, { type SerializedServiceOrder } from "./os-list-client";

export default async function OrdensDeServicoPage() {
  const [
    orders,
    stores,
    employees,
    vehicles,
    serviceTypes,
    materials,
    settings,
    teams,
  ] = await Promise.all([
    getServiceOrders(),
    getStores(),
    getEmployees(),
    getVehicles(),
    getServiceTypes(),
    getMaterials(),
    getSettings(),
    getTeams(),
  ]);

  const serialized: SerializedServiceOrder[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    name: order.name,
    status: order.status,
    priority: order.priority,
    type: order.type,
    date: order.date ? order.date.toISOString() : null,
    warranty: order.warranty,
    isObra: (order as any).isObra ?? false,
    vehicleId: order.vehicleId,
    // Report fields
    numeroChamado: order.numeroChamado,
    solicitadoPor: order.solicitadoPor,
    enderecoAtendimento: order.enderecoAtendimento,
    servicoSolicitado: order.servicoSolicitado,
    // Notes
    servicesPerformed: order.servicesPerformed,
    managerComment: order.managerComment,
    materialsUsedNotes: order.materialsUsedNotes,
    // KM fields
    kmIdaVolta: order.kmIdaVolta,
    kmRodada: order.kmRodada,
    manHours: order.manHours,
    precoKm: order.precoKm,
    // Financial
    laborCost: order.laborCost,
    materialCost: order.materialCost,
    transportCost: order.transportCost,
    totalCost: order.totalCost,
    mealAllowance: order.mealAllowance,
    overnightAllowance: order.overnightAllowance,
    tollDiscount: order.tollDiscount,
    parking: order.parking,
    // Relations
    stores: order.stores.map((s) => ({
      store: { id: s.store.id, sigla: s.store.sigla, city: s.store.city },
    })),
    serviceTypes: order.serviceTypes.map((st) => ({
      serviceType: { id: st.serviceType.id, name: st.serviceType.name },
    })),
    materials: order.materials.map((m) => ({
      quantity: m.quantity,
      unitPrice: m.unitPrice,
      material: { id: m.material.id, name: m.material.name },
    })),
    teams: order.teams.map((t) => ({
      team: {
        id: t.team.id,
        name: t.team.name,
        members: t.team.members.map((m) => ({
          employeeId: m.employeeId,
          employeeName: m.employee.shortName,
        })),
        driverName: t.team.driver?.shortName ?? null,
        vehicleName: t.team.vehicle
          ? `${t.team.vehicle.name} (${t.team.vehicle.licensePlate})`
          : null,
      },
    })),
    vehicle: order.vehicle
      ? {
          id: order.vehicle.id,
          name: order.vehicle.name,
          licensePlate: order.vehicle.licensePlate,
        }
      : null,
  }));

  const refs: OSFormRefs = {
    stores: stores.map((s) => ({
      id: s.id,
      sigla: s.sigla,
      city: s.city,
      code: s.code,
      kmRoundTrip: s.kmRoundTrip,
      tollRoundTrip: s.tollRoundTrip,
      storeNumber: s.storeNumber,
      state: s.state,
      address: s.address,
    })),
    employees: employees
      .filter((e) => e.isActive)
      .map((e) => ({ id: e.id, shortName: e.shortName, rg: e.rg })),
    vehicles: vehicles
      .filter((v) => v.isActive)
      .map((v) => ({ id: v.id, name: v.name, licensePlate: v.licensePlate })),
    serviceTypes: serviceTypes.map((s) => ({ id: s.id, name: s.name })),
    materials: materials.map((m) => ({
      id: m.id,
      name: m.name,
      salePrice: m.salePrice,
    })),
    teams: teams
      .filter((t) => t.isActive)
      .map((t) => ({
        id: t.id,
        name: t.name,
        memberNames: t.members.map((m) => m.employee.shortName),
      })),
  };

  return <OSListClient orders={serialized} refs={refs} settings={settings} />;
}
