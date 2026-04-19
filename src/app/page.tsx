import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, statusConfig, type OrderStatus } from "@/lib/format";
import { getDashboardStats, getServiceOrders } from "@/lib/queries";
import {
  CheckCircle,
  ClipboardList,
  Clock,
  DollarSign,
  Loader,
  MapPin,
  Receipt,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, allOrders] = await Promise.all([
    getDashboardStats(),
    getServiceOrders(),
  ]);

  const recentOrders = allOrders.slice(0, 8);

  const statCards = [
    {
      label: "Total OS",
      value: String(stats.totalOS),
      icon: ClipboardList,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Pendentes",
      value: String(stats.pendingOS),
      icon: Clock,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
    },
    {
      label: "Em Andamento",
      value: String(stats.inProgressOS),
      icon: Loader,
      color: "text-sky-400",
      bg: "bg-sky-400/10",
    },
    {
      label: "Pagas Este Mês",
      value: String(stats.paidThisMonth),
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Faturamento Mensal",
      value: formatBRL(Number(stats.revenueThisMonth)),
      icon: DollarSign,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      label: "Lojas Atendidas",
      value: String(stats.totalStores),
      icon: MapPin,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      label: "Despesas da Semana",
      value: formatBRL(Number(stats.weekExpenseTotal)),
      icon: Receipt,
      color: "text-orange-400",
      bg: "bg-orange-400/10",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-zinc-100">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  {stat.label}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-zinc-100">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">
            Ordens Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">OS#</TableHead>
                <TableHead className="text-zinc-400">Nome</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Data</TableHead>
                <TableHead className="text-zinc-400">Funcionários</TableHead>
                <TableHead className="text-zinc-400">Veículo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => {
                const status = statusConfig[order.status as OrderStatus];
                const teamNames =
                  order.teams
                    ?.map((t) => t.team.name)
                    .join(", ") || "—";
                const dateStr = order.date
                  ? new Date(order.date).toLocaleDateString("pt-BR")
                  : "—";
                return (
                  <TableRow
                    key={order.id}
                    className="border-zinc-800 hover:bg-zinc-800/50"
                  >
                    <TableCell className="font-mono font-medium text-zinc-200">
                      <Link
                        href={`/ordens-de-servico/${order.id}`}
                        className="hover:text-blue-400 transition-colors"
                      >
                        OS-{order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium text-zinc-200">
                      {order.name}
                    </TableCell>
                    <TableCell>
                      <Badge className={status.className}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400">{dateStr}</TableCell>
                    <TableCell className="text-zinc-400">
                      {teamNames || "—"}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {order.vehicle?.name ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
