import { getServiceTypes } from "@/lib/queries";
import { ServicesTable } from "./services-table";
import { ServicesHeader } from "./services-header";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const serviceTypes = await getServiceTypes();

  const serialized = serviceTypes.map((s) => ({
    id: s.id,
    name: s.name,
    tags: s.tags,
  }));

  return (
    <div className="space-y-6">
      <ServicesHeader />
      <ServicesTable services={serialized} />
    </div>
  );
}
