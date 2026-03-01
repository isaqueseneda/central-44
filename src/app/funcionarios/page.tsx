import { getEmployees } from "@/lib/queries";
import { EmployeesTable } from "./employees-table";
import { EmployeesHeader } from "./employees-header";

export default async function EmployeesPage() {
  const employees = await getEmployees();

  return (
    <div className="space-y-6">
      <EmployeesHeader />
      <EmployeesTable employees={employees} />
    </div>
  );
}
