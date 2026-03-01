"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Save, X, Pencil, MapPin, Users, UsersRound, Wrench, Package, Car, DollarSign, FileText, Star, SquarePen, Download } from "lucide-react";
import type { SerializedServiceOrder } from "@/app/ordens-de-servico/os-list-client";
import { OSFormDialog, type OSFormRefs } from "@/components/forms/os-form-dialog";
import { statusConfig, statusOptions, type OrderStatus } from "@/lib/format";

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

export function OSDetailDialog({ order, open, onOpenChange, refs, settings }: OSDetailDialogProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable fields
  const [status, setStatus] = useState(order?.status ?? "NOT_STARTED");
  const [priority, setPriority] = useState(order?.priority ?? 0);
  const [servicesPerformed, setServicesPerformed] = useState("");
  const [managerComment, setManagerComment] = useState("");
  const [materialsUsedNotes, setMaterialsUsedNotes] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [materialCost, setMaterialCost] = useState("");
  const [transportCost, setTransportCost] = useState("");
  const [totalCost, setTotalCost] = useState("");

  // Sync editable fields when order changes
  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setPriority(order.priority);
      setServicesPerformed(order.servicesPerformed ?? "");
      setManagerComment(order.managerComment ?? "");
      setMaterialsUsedNotes(order.materialsUsedNotes ?? "");
      setLaborCost(order.laborCost?.toString() ?? "");
      setMaterialCost(order.materialCost?.toString() ?? "");
      setTransportCost(order.transportCost?.toString() ?? "");
      setTotalCost(order.totalCost?.toString() ?? "");
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [order?.id]);

  if (!order) return null;

  const storeName =
    order.stores[0]?.store.sigla ?? order.stores[0]?.store.city ?? order.name;
  const storeCity = order.stores[0]?.store.city ?? "";
  const services = order.serviceTypes.map((st) => st.serviceType.name);
  const materials = order.materials.map(
    (m) => `${m.quantity ? m.quantity + "× " : ""}${m.material.name}`
  );
  const dateStr = order.date
    ? new Date(order.date).toLocaleDateString("pt-BR")
    : "—";
  const s = statusConfig[status as OrderStatus] ?? statusConfig.NOT_STARTED;

  // Quick status change (PATCH)
  async function handleStatusChange(newStatus: string) {
    if (statusLoading) return;
    setStatus(newStatus);
    if (!isEditing) {
      setStatusLoading(true);
      try {
        const res = await fetch(`/api/ordens/${order!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Erro ao atualizar status");
        toast.success(`Status atualizado para ${statusConfig[newStatus as OrderStatus]?.label}`);
        router.refresh();
      } catch {
        toast.error("Erro ao atualizar status");
        setStatus(order!.status);
      } finally {
        setStatusLoading(false);
      }
    }
  }

  // Save all editable fields
  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        status,
        priority,
        servicesPerformed: servicesPerformed || null,
        managerComment: managerComment || null,
        materialsUsedNotes: materialsUsedNotes || null,
      };
      if (laborCost) payload.laborCost = Number(laborCost);
      if (materialCost) payload.materialCost = Number(materialCost);
      if (transportCost) payload.transportCost = Number(transportCost);
      if (totalCost) payload.totalCost = Number(totalCost);

      const res = await fetch(`/api/ordens/${order!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar");
      }
      toast.success("OS atualizada com sucesso");
      setIsEditing(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar OS");
    } finally {
      setLoading(false);
    }
  }

  // Delete
  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/ordens/${order!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      toast.success("OS excluída com sucesso");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Erro ao excluir OS");
    } finally {
      setDeleting(false);
    }
  }

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
                  <Badge className="bg-yellow-600/20 text-yellow-400">Garantia</Badge>
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
                  PDF
                </Button>
                {refs && (
                  <OSFormDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300"
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
                      serviceTypeIds: order.serviceTypes.map((st) => st.serviceType.id),
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
                      materialDetails: order.materials
                        .filter((m) => m.quantity != null || m.unitPrice != null)
                        .map((m) => ({
                          materialId: m.material.id,
                          quantity: m.quantity ?? null,
                          unitPrice: m.unitPrice ?? null,
                        })),
                      teamIds: order.teams?.map((t) => t.team.id) ?? [],
                    }}
                  />
                )}
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-zinc-400 hover:text-zinc-100"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Rápido
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      // Reset fields from order
                      setStatus(order.status);
                      setPriority(order.priority);
                      setServicesPerformed(order.servicesPerformed ?? "");
                      setManagerComment(order.managerComment ?? "");
                      setMaterialsUsedNotes(order.materialsUsedNotes ?? "");
                      setLaborCost(order.laborCost?.toString() ?? "");
                      setMaterialCost(order.materialCost?.toString() ?? "");
                      setTransportCost(order.transportCost?.toString() ?? "");
                      setTotalCost(order.totalCost?.toString() ?? "");
                    }}
                    className="text-zinc-400 hover:text-zinc-100"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                )}
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
                        ? cfg.className + " ring-2 ring-offset-1 ring-offset-zinc-950 ring-current"
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
        <form onSubmit={handleSave} className="px-6 pb-6 space-y-5">
          {/* Info section */}
          <div className="grid grid-cols-2 gap-4">
            {/* Name & Store */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <MapPin className="h-3 w-3" />
                Loja
              </div>
              <p className="text-sm font-medium text-zinc-200">
                {storeName} {storeCity && storeCity !== storeName ? `(${storeCity})` : ""}
              </p>
              {order.stores.length > 1 && (
                <p className="text-xs text-zinc-500">
                  +{order.stores.length - 1} loja{order.stores.length > 2 ? "s" : ""}
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
                  <Badge key={svc} variant="secondary" className="bg-blue-600/10 text-blue-400 text-xs">
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
            {materials.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {materials.map((mat) => (
                  <Badge key={mat} variant="secondary" className="bg-orange-600/10 text-orange-400 text-xs">
                    {mat}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic">Nenhum material</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Star className="h-3 w-3" />
              Prioridade
            </div>
            {isEditing ? (
              <Select value={priority.toString()} onValueChange={(v) => setPriority(Number(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Normal</SelectItem>
                  <SelectItem value="1">⭐</SelectItem>
                  <SelectItem value="2">⭐⭐</SelectItem>
                  <SelectItem value="3">⭐⭐⭐</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-zinc-200">
                {priority > 0 ? "⭐".repeat(priority) : "Normal"}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800" />

          {/* Financial section (editable) */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <DollarSign className="h-3 w-3" />
              Financeiro
            </div>

            {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Mão de obra (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Material (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={materialCost}
                    onChange={(e) => setMaterialCost(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Transporte (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={transportCost}
                    onChange={(e) => setTransportCost(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400 font-semibold">Total (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    className="h-8 text-sm font-semibold"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Mão de obra", value: laborCost },
                  { label: "Material", value: materialCost },
                  { label: "Transporte", value: transportCost },
                  { label: "Total", value: totalCost },
                ].map((item) => (
                  <div key={item.label} className="space-y-0.5">
                    <p className="text-xs text-zinc-500">{item.label}</p>
                    <p className={`text-sm ${item.label === "Total" ? "font-semibold text-zinc-100" : "text-zinc-300"}`}>
                      {item.value ? `R$ ${Number(item.value).toFixed(2)}` : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800" />

          {/* Notes section (editable) */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <FileText className="h-3 w-3" />
              Anotações
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Serviços realizados</Label>
                  <Textarea
                    value={servicesPerformed}
                    onChange={(e) => setServicesPerformed(e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                    placeholder="Descreva os serviços realizados..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Materiais utilizados</Label>
                  <Textarea
                    value={materialsUsedNotes}
                    onChange={(e) => setMaterialsUsedNotes(e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                    placeholder="Anotações sobre materiais..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Comentário do gerente</Label>
                  <Textarea
                    value={managerComment}
                    onChange={(e) => setManagerComment(e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                    placeholder="Comentário..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: "Serviços realizados", value: servicesPerformed },
                  { label: "Materiais utilizados", value: materialsUsedNotes },
                  { label: "Comentário do gerente", value: managerComment },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-zinc-500">{item.label}</p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                      {item.value || <span className="text-zinc-600 italic">—</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {isEditing && (
            <>
              <div className="border-t border-zinc-800" />
              <div className="flex items-center justify-between">
                {!showDeleteConfirm ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-600/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir OS
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Tem certeza?</span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? "Excluindo..." : "Sim, excluir"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Não
                    </Button>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-1" />
                  {loading ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
