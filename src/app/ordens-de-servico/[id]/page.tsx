import { getServiceOrderById } from "@/lib/queries";
import { notFound } from "next/navigation";
import OSDetailClient, { type OSDetailData } from "./os-detail-client";

// ---------------------------------------------------------------------------
// Server page: fetch data, serialize, pass to client
// ---------------------------------------------------------------------------

export default async function OSDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const os = await getServiceOrderById(id);

  if (!os) {
    notFound();
  }

  // Serialize for client component
  const data: OSDetailData = {
    id: os.id,
    orderNumber: os.orderNumber,
    name: os.name,
    status: os.status,
    priority: os.priority,
    type: os.type,
    date: os.date ? os.date.toISOString() : null,
    warranty: os.warranty,
    isObra: (os as any).isObra ?? false,
    // Report fields
    numeroChamado: os.numeroChamado,
    solicitadoPor: os.solicitadoPor,
    enderecoAtendimento: os.enderecoAtendimento,
    servicoSolicitado: os.servicoSolicitado,
    // KM
    kmIdaVolta: os.kmIdaVolta,
    kmRodada: os.kmRodada,
    precoKm: os.precoKm,
    manHours: os.manHours,
    // Financial
    mealAllowance: os.mealAllowance,
    overnightAllowance: os.overnightAllowance,
    laborCost: os.laborCost,
    materialCost: os.materialCost,
    kmDiscount: os.kmDiscount,
    tollDiscount: os.tollDiscount,
    parking: os.parking,
    transportCost: os.transportCost,
    totalCost: os.totalCost,
    // Notes
    servicesPerformed: os.servicesPerformed,
    managerComment: os.managerComment,
    materialsUsedNotes: os.materialsUsedNotes,
    // Relations
    stores: os.stores.map(({ store }) => ({
      store: {
        id: store.id,
        sigla: store.sigla,
        city: store.city,
        state: store.state,
        address: store.address,
        kmRoundTrip: store.kmRoundTrip,
        tollRoundTrip: store.tollRoundTrip,
      },
    })),
    employees: os.employees.map((e) => ({
      hoursNormal: e.hoursNormal,
      hoursExtra: e.hoursExtra,
      pricePerHour: e.pricePerHour,
      workDate: e.workDate ? e.workDate.toISOString().slice(0, 10) : null,
      employee: { id: e.employee.id, shortName: e.employee.shortName },
    })),
    vehicle: os.vehicle
      ? {
          id: os.vehicle.id,
          name: os.vehicle.name,
          licensePlate: os.vehicle.licensePlate,
        }
      : null,
    serviceTypes: os.serviceTypes.map(({ serviceType }) => ({
      serviceType: { id: serviceType.id, name: serviceType.name },
    })),
    materials: os.materials.map((m) => ({
      quantity: m.quantity,
      unitPrice: m.unitPrice,
      material: { id: m.material.id, name: m.material.name },
    })),
  };

  return <OSDetailClient os={data} />;
}
