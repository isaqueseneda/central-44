import { getVehicles } from "@/lib/queries";
import { FleetTable } from "./fleet-table";
import { FleetHeader } from "./fleet-header";

export default async function FleetPage() {
  const vehicles = await getVehicles();

  return (
    <div className="space-y-6">
      <FleetHeader />
      <FleetTable vehicles={vehicles} />
    </div>
  );
}
