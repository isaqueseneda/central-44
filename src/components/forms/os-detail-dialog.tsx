"use client";

import type { SerializedServiceOrder } from "@/app/ordens-de-servico/os-list-client";
import {
  OSFormDialog,
  type OSFormRefs,
} from "@/components/forms/os-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { statusConfig, statusOptions, type OrderStatus } from "@/lib/format";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DEFAULT_HOUR_PRICE, DEFAULT_HOURS_PER_DAY } from "@/lib/format";
import {
  Car,
  DollarSign,
  Download,
  FileText,
  Info,
  MapPin,
  Package,
  SquarePen,
  Star,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-zinc-600 hover:text-zinc-400 cursor-help inline-block ml-1 shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface OSDetailDialogProps {
  order: SerializedServiceOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refs?: OSFormRefs;
  settings?: Record<string, string>;
}

export function OSDetailDialog({
  order,
  open,
  onOpenChange,
  refs,
  settings,
}: OSDetailDialogProps) {
  const router = useRouter();
  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState(order?.status ?? "NOT_STARTED");

  // Sync status when order changes
  useEffect(() => {
    if (order) {
      setStatus(order.status);
    }
  }, [order?.id]);

  if (!order) return null;

  const storeName =
    order.stores[0]?.store.sigla ?? order.stores[0]?.store.city ?? order.name;
  const storeCity = order.stores[0]?.store.city ?? "";
  const services = order.serviceTypes.map((st) => st.serviceType.name);
  const dateStr = order.date
    ? new Date(order.date).toLocaleDateString("pt-BR")
    : "—";
  const s = statusConfig[status as OrderStatus] ?? statusConfig.NOT_STARTED;

  // Quick status change (PATCH)
  async function handleStatusChange(newStatus: string) {
    if (statusLoading) return;
    setStatus(newStatus);
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/ordens/${order!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      toast.success(
        `Status atualizado para ${statusConfig[newStatus as OrderStatus]?.label}`,
      );
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar status");
      setStatus(order!.status);
    } finally {
      setStatusLoading(false);
    }
  }

  // Financial display values
  const laborCost = order.laborCost;
  const materialCost = order.materialCost;
  const transportCost = order.transportCost;
  const totalCost = order.totalCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800 px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl text-zinc-100">
                  OS-{order.orderNumber}
                </DialogTitle>
                <Badge className={s.className}>{s.label}</Badge>
                {order.warranty && (
                  <Badge className="bg-yellow-600/20 text-yellow-400">
                    Garantia
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    window.open(`/api/ordens/${order.id}/pdf`, "_blank");
                  }}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Relatório
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    window.open(`/api/ordens/${order.id}/pdf/os`, "_blank");
                  }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  OS
                </Button>
                {refs && (
                  <OSFormDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-zinc-100"
                      >
                        <SquarePen className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    }
                    refs={refs}
                    settings={settings}
                    initialData={{
                      id: order.id,
                      name: order.name,
                      status: order.status,
                      priority: order.priority,
                      type: order.type,
                      date: order.date,
                      warranty: order.warranty,
                      isObra: (order as any).isObra ?? false,
                      vehicleId: order.vehicleId ?? null,
                      storeIds: order.stores.map((s) => s.store.id),
                      serviceTypeIds: order.serviceTypes.map(
                        (st) => st.serviceType.id,
                      ),
                      materialIds: order.materials.map((m) => m.material.id),
                      numeroChamado: order.numeroChamado,
                      solicitadoPor: order.solicitadoPor,
                      enderecoAtendimento: order.enderecoAtendimento,
                      servicoSolicitado: order.servicoSolicitado,
                      servicesPerformed: order.servicesPerformed,
                      managerComment: order.managerComment,
                      materialsUsedNotes: order.materialsUsedNotes,
                      kmIdaVolta: order.kmIdaVolta,
                      kmRodada: order.kmRodada,
                      precoKm: order.precoKm,
                      laborCost: order.laborCost,
                      materialCost: order.materialCost,
                      transportCost: order.transportCost,
                      totalCost: order.totalCost,
                      mealAllowance: order.mealAllowance,
                      overnightAllowance: order.overnightAllowance,
                      tollDiscount: order.tollDiscount,
                      parking: order.parking,
                      manHours: order.manHours,
                      extraHours: (order as any).extraHours,
                      materialDetails: order.materials
                        .filter(
                          (m) => m.quantity != null || m.unitPrice != null,
                        )
                        .map((m) => ({
                          materialId: m.material.id,
                          quantity: m.quantity ?? null,
                          unitPrice: m.unitPrice ?? null,
                        })),
                      teamIds: order.teams?.map((t) => t.team.id) ?? [],
                    }}
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-zinc-100 shrink-0"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Quick status change row */}
          <div className="flex items-center gap-2 mt-3">
            <Label className="text-xs text-zinc-500 shrink-0">Status:</Label>
            <div className="flex flex-wrap gap-1">
              {statusOptions.map((opt) => {
                const cfg = statusConfig[opt];
                return (
                  <button
                    key={opt}
                    onClick={() => handleStatusChange(opt)}
                    disabled={statusLoading}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      status === opt
                        ? cfg.className +
                          " ring-2 ring-offset-1 ring-offset-zinc-950 ring-current"
                        : "bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-5">
          {/* Info section */}
          <div className="grid grid-cols-2 gap-4">
            {/* Name & Store */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <MapPin className="h-3 w-3" />
                Loja
              </div>
              <p className="text-sm font-medium text-zinc-200">
                {storeName}{" "}
                {storeCity && storeCity !== storeName ? `(${storeCity})` : ""}
              </p>
              {order.stores.length > 1 && (
                <p className="text-xs text-zinc-500">
                  +{order.stores.length - 1} loja
                  {order.stores.length > 2 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Date & Type */}
            <div className="space-y-1">
              <div className="text-xs text-zinc-500">Data</div>
              <p className="text-sm text-zinc-200">{dateStr}</p>
              <p className="text-xs text-zinc-500">{order.type}</p>
            </div>

            {/* Vehicle */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Car className="h-3 w-3" />
                Veículo
              </div>
              {order.vehicle ? (
                <p className="text-sm text-zinc-200">
                  {order.vehicle.name}{" "}
                  <span className="text-zinc-500 font-mono text-xs">
                    {order.vehicle.licensePlate}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-zinc-600 italic">Nenhum</p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Star className="h-3 w-3" />
                Prioridade
              </div>
              <p className="text-sm text-zinc-200">
                {order.priority > 0
                  ? "\u2B50".repeat(order.priority)
                  : "Normal"}
              </p>
            </div>
          </div>

          {/* Teams */}
          {order.teams && order.teams.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <UsersRound className="h-3 w-3" />
                Equipes
              </div>
              <div className="flex flex-wrap gap-1">
                {order.teams.map((t) => (
                  <Badge
                    key={t.team.id}
                    variant="secondary"
                    className="bg-violet-600/10 text-violet-400 text-xs"
                  >
                    {t.team.name}
                    {t.team.members.length > 0 && (
                      <span className="text-violet-500 ml-1">
                        ({t.team.members.map((m) => m.employeeName).join(", ")})
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Wrench className="h-3 w-3" />
              Serviços
            </div>
            {services.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {services.map((svc) => (
                  <Badge
                    key={svc}
                    variant="secondary"
                    className="bg-blue-600/10 text-blue-400 text-xs"
                  >
                    {svc}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic">Nenhum serviço</p>
            )}
          </div>

          {/* Materials */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Package className="h-3 w-3" />
              Materiais
            </div>
            {order.materials.length > 0 ? (
              <div className="rounded-md border border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/50">
                      <th className="text-left px-3 py-1.5 text-xs font-medium text-zinc-500">
                        Material
                      </th>
                      <th className="text-right px-3 py-1.5 text-xs font-medium text-zinc-500 w-16">
                        Qtd
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.materials.map((m) => (
                      <tr
                        key={m.material.id}
                        className="border-b border-zinc-800/50 last:border-0"
                      >
                        <td className="px-3 py-1.5">
                          <span className="text-orange-400">
                            {m.material.name}
                          </span>
                        </td>
                        <td className="text-right px-3 py-1.5 text-zinc-400 text-xs">
                          {m.quantity ?? "\u2014"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic">Nenhum material</p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800" />

          {/* Financial section (read-only) */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <DollarSign className="h-3 w-3" />
              Financeiro
            </div>
            <div className="grid grid-cols-4 gap-3">
              {(order as any).manHours != null && (order as any).manHours > 0 && (
                <div className="space-y-0.5">
                  <p className="text-xs text-zinc-500 flex items-center">
                    Homem-Hora
                    <InfoTip text={`Total de horas trabalhadas pela equipe inteira. Ex: 2 técnicos × ${DEFAULT_HOURS_PER_DAY}h = ${2 * DEFAULT_HOURS_PER_DAY} homem-hora.`} />
                  </p>
                  <p className="text-sm text-zinc-300">
                    {Number((order as any).manHours)}h
                  </p>
                </div>
              )}
              {[
                { label: "Mão de obra", value: laborCost, tip: `Custo total de mão de obra. Calculado: Homem-Hora × Preço/Hora (R$ ${DEFAULT_HOUR_PRICE}/h).` },
                { label: "Material", value: materialCost },
                { label: "Transporte", value: transportCost, tip: "Custo total de transporte: KM Rodada × Preço/KM + Pedágios." },
                { label: "Total", value: totalCost, tip: "Soma de todos os custos: Mão de Obra + Material + Transporte + Refeição + Pernoite + Pedágio + Estacionamento." },
              ].map((item) => (
                <div key={item.label} className="space-y-0.5">
                  <p className="text-xs text-zinc-500 flex items-center">
                    {item.label}
                    {item.tip && <InfoTip text={item.tip} />}
                  </p>
                  <p
                    className={`text-sm ${item.label === "Total" ? "font-semibold text-zinc-100" : "text-zinc-300"}`}
                  >
                    {item.value
                      ? `R$ ${Number(item.value).toFixed(2)}`
                      : "\u2014"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800" />

          {/* Notes section (read-only) */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <FileText className="h-3 w-3" />
              Anotações
            </div>
            <div className="space-y-2">
              {[
                {
                  label: "Serviços realizados",
                  value: order.servicesPerformed,
                },
                {
                  label: "Materiais utilizados",
                  value: order.materialsUsedNotes,
                },
                {
                  label: "Comentário do gerente",
                  value: order.managerComment,
                },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-zinc-500">{item.label}</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                    {item.value || (
                      <span className="text-zinc-600 italic">&mdash;</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
