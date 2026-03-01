import Link from "next/link";
import { ClipboardList, FileText, Calendar } from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: "Não Iniciada", color: "bg-zinc-100 text-zinc-600" },
  IN_PROGRESS: { label: "Em Andamento", color: "bg-blue-100 text-blue-700" },
  RETURN_VISIT: { label: "Retorno", color: "bg-amber-100 text-amber-700" },
  MEASUREMENT: { label: "Medição", color: "bg-purple-100 text-purple-700" },
  PAID: { label: "Pago", color: "bg-emerald-100 text-emerald-700" },
  REWORK: { label: "Retrabalho", color: "bg-red-100 text-red-700" },
};

export default async function PortalPage() {
  const orders = await prisma.serviceOrder.findMany({
    include: {
      stores: { include: { store: true } },
      employees: { include: { employee: true } },
      vehicle: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const stats = {
    total: orders.length,
    inProgress: orders.filter((o) => o.status === "IN_PROGRESS").length,
    completed: orders.filter((o) => o.status === "PAID").length,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Ordens de Serviço
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Acompanhe o status das ordens de serviço
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-200 p-4 text-center">
          <div className="text-2xl font-bold text-zinc-900">{stats.total}</div>
          <div className="text-xs text-zinc-500 mt-1">Total</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{stats.inProgress}</div>
          <div className="text-xs text-blue-600 mt-1">Em Andamento</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700">{stats.completed}</div>
          <div className="text-xs text-emerald-600 mt-1">Concluídas</div>
        </div>
      </div>

      {/* Orders table */}
      <div className="rounded-lg border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="text-left px-4 py-3 font-medium text-zinc-600">OS#</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">Local</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">Data</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">Equipe</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const status = statusLabels[order.status] ?? { label: order.status, color: "bg-zinc-100 text-zinc-600" };
              const storeName = order.stores[0]?.store.city ?? order.name;
              const empNames = order.employees.map((e) => e.employee.shortName).join(", ");
              const dateStr = order.date
                ? new Date(order.date).toLocaleDateString("pt-BR")
                : "—";

              return (
                <tr key={order.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/portal/os/${order.id}`}
                      className="font-mono font-medium text-blue-600 hover:text-blue-800"
                    >
                      OS-{order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{storeName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{dateStr}</td>
                  <td className="px-4 py-3 text-zinc-500">{empNames || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Links */}
      <div className="flex gap-3">
        <Link
          href="/portal/medicao"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Resumo de Medição
        </Link>
      </div>
    </div>
  );
}
