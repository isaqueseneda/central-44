import type { PersistentTeamRefs } from "@/components/forms/persistent-team-form";
import { getEmployees, getTeams, getVehicles } from "@/lib/queries";
import { TeamsHeader } from "./teams-header";
import { TeamsTable } from "./teams-table";

export const dynamic = "force-dynamic";

export default async function EquipesPage() {
  const [teams, employees, vehicles] = await Promise.all([
    getTeams(),
    getEmployees(),
    getVehicles(),
  ]);

  const refs: PersistentTeamRefs = {
    employees: employees
      .filter((e) => e.isActive)
      .map((e) => ({ id: e.id, shortName: e.shortName })),
    vehicles: vehicles
      .filter((v) => v.isActive)
      .map((v) => ({ id: v.id, name: v.name, licensePlate: v.licensePlate })),
  };

  const serializedTeams = teams.map((t) => ({
    id: t.id,
    name: t.name,
    driverId: t.driverId,
    driverName: t.driver?.shortName ?? null,
    vehicleId: t.vehicleId,
    vehicleName: t.vehicle
      ? `${t.vehicle.name} (${t.vehicle.licensePlate})`
      : null,
    isActive: t.isActive,
    memberIds: t.members.map((m) => m.employeeId),
    memberNames: t.members.map((m) => m.employee.shortName),
    members: t.members.map((m) => ({
      employeeId: m.employeeId,
      shortName: m.employee.shortName,
      rank: m.rank,
      isLeader: m.isLeader,
    })),
  }));

  return (
    <div className="space-y-6">
      <TeamsHeader refs={refs} />
      <TeamsTable teams={serializedTeams} refs={refs} />
    </div>
  );
}
