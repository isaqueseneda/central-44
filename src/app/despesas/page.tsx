import { Receipt } from "lucide-react";
import { getEmployees } from "@/lib/queries";
import { ExpensesView } from "./expenses-view";

export const dynamic = "force-dynamic";

export default async function DespesasPage() {
  const employees = await getEmployees();

  const serializedEmployees = employees
    .filter((e) => e.isActive)
    .map((e) => ({
      id: e.id,
      shortName: e.shortName,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-orange-400/10 p-2">
          <Receipt className="h-6 w-6 text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-100">
          Despesas de Viagem
        </h1>
      </div>

      <ExpensesView employees={serializedEmployees} />
    </div>
  );
}
