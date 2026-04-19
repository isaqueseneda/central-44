"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  calcTotalCost,
  formatBRL,
  formatNumber,
  statusConfig,
  statusOptions,
  typeLabels,
  type OrderStatus,
} from "@/lib/format";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Download,
  FileText,
  MessageSquare,
  Package,
  Pencil,
  Route,
  Save,
  Store,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types (serialized from server)
// ---------------------------------------------------------------------------

export interface OSDetailData {
  id: string;
  orderNumber: number;
  name: string;
  status: string;
  priority: number;
  type: string;
  date: string | null;
  warranty: boolean;
  isObra: boolean;
  // Report fields
  numeroChamado: string | null;
  solicitadoPor: string | null;
  enderecoAtendimento: string | null;
  servicoSolicitado: string | null;
  // KM
  kmIdaVolta: number | null;
  kmRodada: number | null;
  precoKm: number | null;
  manHours: number | null;
  extraHours: number | null;
  // Financial
  mealAllowance: number | null;
  overnightAllowance: number | null;
  laborCost: number | null;
  materialCost: number | null;
  kmDiscount: number | null;
  tollDiscount: number | null;
  parking: number | null;
  transportCost: number | null;
  totalCost: number | null;
  // Notes
  servicesPerformed: string | null;
  managerComment: string | null;
  materialsUsedNotes: string | null;
  // Relations
  stores: {
    store: {
      id: string;
      sigla: string;
      city: string;
      state: string;
      address: string;
      kmRoundTrip: number | null;
      tollRoundTrip: number | null;
      tollCostGoing?: number | null;
      tollCostReturn?: number | null;
    };
  }[];
  employees: {
    hoursNormal: number | null;
    hoursExtra: number | null;
    pricePerHour: number | null;
    workDate: string | null;
    employee: { id: string; shortName: string };
  }[];
  vehicle: { id: string; name: string; licensePlate: string } | null;
  serviceTypes: { serviceType: { id: string; name: string } }[];
  materials: {
    quantity: number | null;
    unitPrice: number | null;
    material: { id: string; name: string };
  }[];
}

// ---------------------------------------------------------------------------
// Inline editable field
// ---------------------------------------------------------------------------

function EditableField({
  label,
  value,
  type = "text",
  isEditing,
  onSave,
  isCurrency = false,
  highlight = false,
}: {
  label: string;
  value: string | number | null | undefined;
  type?: string;
  isEditing: boolean;
  onSave: (val: string) => void;
  isCurrency?: boolean;
  highlight?: boolean;
}) {
  const [editVal, setEditVal] = useState(value?.toString() ?? "");

  // Sync when value changes externally
  const displayVal = value?.toString() ?? "";
  if (!isEditing && editVal !== displayVal) {
    // keep in sync when not editing
  }

  if (!isEditing) {
    const formatted = isCurrency
      ? formatBRL(value ? Number(value) : null)
      : type === "number"
        ? formatNumber(value ? Number(value) : null)
        : value?.toString() || "—";

    return (
      <div className="space-y-1">
        <span
          className={`text-xs ${highlight ? "text-zinc-300 font-semibold" : "text-zinc-500"}`}
        >
          {label}
        </span>
        <p
          className={`text-sm ${highlight ? "text-zinc-100 font-semibold" : "text-zinc-200"}`}
        >
          {formatted}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <span className="text-xs text-zinc-400">{label}</span>
      <Input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onBlur={() => onSave(editVal)}
        className="h-8 text-sm"
        placeholder="0,00"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function OSDetailClient({ os }: { os: OSDetailData }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable state
  const [status, setStatus] = useState(os.status);
  const [laborCost, setLaborCost] = useState(os.laborCost);
  const [materialCost, setMaterialCost] = useState(os.materialCost);
  const [transportCost, setTransportCost] = useState(os.transportCost);
  const [mealAllowance, setMealAllowance] = useState(os.mealAllowance);
  const [overnightAllowance, setOvernightAllowance] = useState(
    os.overnightAllowance,
  );
  const [tollDiscount, setTollDiscount] = useState(os.tollDiscount);
  const [parking, setParking] = useState(os.parking);
  const [totalCost, setTotalCost] = useState(os.totalCost);
  const [servicesPerformed, setServicesPerformed] = useState(
    os.servicesPerformed ?? "",
  );
  const [managerComment, setManagerComment] = useState(os.managerComment ?? "");
  const [materialsUsedNotes, setMaterialsUsedNotes] = useState(
    os.materialsUsedNotes ?? "",
  );

  const statusCfg =
    statusConfig[status as OrderStatus] ?? statusConfig.NOT_STARTED;
  const typeLabel = typeLabels[os.type] ?? os.type;
  const dateStr = os.date ? new Date(os.date).toLocaleDateString("pt-BR") : "—";

  // Computed total
  const computedTotal = calcTotalCost({
    laborCost: laborCost ?? 0,
    materialCost: materialCost ?? 0,
    transportCost: transportCost ?? 0,
    mealAllowance: mealAllowance ?? 0,
    overnightAllowance: overnightAllowance ?? 0,
    tollDiscount: tollDiscount ?? 0,
    parking: parking ?? 0,
  });

  function resetEdits() {
    setStatus(os.status);
    setLaborCost(os.laborCost);
    setMaterialCost(os.materialCost);
    setTransportCost(os.transportCost);
    setMealAllowance(os.mealAllowance);
    setOvernightAllowance(os.overnightAllowance);
    setTollDiscount(os.tollDiscount);
    setParking(os.parking);
    setTotalCost(os.totalCost);
    setServicesPerformed(os.servicesPerformed ?? "");
    setManagerComment(os.managerComment ?? "");
    setMaterialsUsedNotes(os.materialsUsedNotes ?? "");
  }

  // Quick status PATCH
  async function handleStatusChange(newStatus: string) {
    const prev = status;
    setStatus(newStatus);
    try {
      const res = await fetch(`/api/ordens/${os.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        `Status → ${statusConfig[newStatus as OrderStatus]?.label}`,
      );
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar status");
      setStatus(prev);
    }
  }

  // Save all editable fields
  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        status,
        laborCost,
        materialCost,
        transportCost,
        mealAllowance,
        overnightAllowance,
        tollDiscount,
        parking,
        totalCost: computedTotal || totalCost,
        servicesPerformed: servicesPerformed || null,
        managerComment: managerComment || null,
        materialsUsedNotes: materialsUsedNotes || null,
      };

      const res = await fetch(`/api/ordens/${os.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      toast.success("OS atualizada com sucesso");
      setIsEditing(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  // Financial rows for display
  const financialRows = [
    { label: "Mão de Obra", value: laborCost, key: "labor" },
    { label: "Material", value: materialCost, key: "material" },
    { label: "Transporte", value: transportCost, key: "transport" },
    { label: "Refeição", value: mealAllowance, key: "meal" },
    { label: "Pernoite", value: overnightAllowance, key: "overnight" },
    { label: "Pedágio", value: tollDiscount, key: "toll" },
    { label: "Estacionamento", value: parking, key: "parking" },
    { label: "KM Desconto", value: os.kmDiscount, key: "kmDisc" },
    { label: "Homem-Hora", value: os.manHours, key: "manHours" },
  ];

  const setters: Record<string, (v: number | null) => void> = {
    labor: setLaborCost,
    material: setMaterialCost,
    transport: setTransportCost,
    meal: setMealAllowance,
    overnight: setOvernightAllowance,
    toll: setTollDiscount,
    parking: setParking,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Header */}
      <div className="space-y-4">
        <Link href="/ordens-de-servico">
          <Button
            variant="ghost"
            className="text-zinc-400 hover:text-zinc-200 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-zinc-100">
            OS-{os.orderNumber}
          </h1>
          <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
          <Badge variant="outline" className="border-zinc-700 text-zinc-400">
            {typeLabel}
          </Badge>
          {os.priority > 0 && (
            <span className="text-yellow-400 text-lg">
              {"⭐".repeat(os.priority)}
            </span>
          )}
          {os.warranty && (
            <Badge
              variant="outline"
              className="border-emerald-700 text-emerald-400"
            >
              Garantia
            </Badge>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Link href={`/api/ordens/${os.id}/pdf`} target="_blank">
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-700 text-emerald-400 hover:bg-emerald-600/10"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </Link>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                className="border-blue-700 text-blue-400 hover:bg-blue-600/10"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-400"
                  onClick={() => {
                    setIsEditing(false);
                    resetEdits();
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={saving}
                  onClick={handleSave}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Quick status pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 shrink-0">Status:</span>
          <div className="flex flex-wrap gap-1">
            {statusOptions.map((opt) => {
              const cfg = statusConfig[opt];
              return (
                <button
                  key={opt}
                  onClick={() => handleStatusChange(opt)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${
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

      {/* Info Gerais */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <FileText className="h-5 w-5 text-zinc-400" />
            Informações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Nome</span>
              <p className="text-sm text-zinc-200">{os.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Data</span>
              <p className="text-sm text-zinc-200">{dateStr}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Tipo</span>
              <p className="text-sm text-zinc-200">{typeLabel}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Garantia</span>
              <p className="text-sm text-zinc-200">
                {os.warranty ? "Sim" : "Não"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Relatório — always shown */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <FileText className="h-5 w-5 text-zinc-400" />
            Dados do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Nº Chamado</span>
              <p className="text-sm text-zinc-200 font-mono">
                {os.numeroChamado ?? "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Solicitado por</span>
              <p className="text-sm text-zinc-200">{os.solicitadoPor ?? "—"}</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <span className="text-xs text-zinc-500">
                Endereço de Atendimento
              </span>
              <p className="text-sm text-zinc-200">
                {os.enderecoAtendimento ?? "—"}
              </p>
            </div>
          </div>
          {os.servicoSolicitado && (
            <div className="space-y-1 mt-4">
              <span className="text-xs text-zinc-500">Serviço Solicitado</span>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-800/30 px-4 py-3">
                {os.servicoSolicitado}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KM & Transporte — always shown */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Route className="h-5 w-5 text-zinc-400" />
            Transporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">KM Ida/Volta</span>
              <p className="text-sm text-zinc-200">
                {os.kmIdaVolta != null ? `${os.kmIdaVolta} km` : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">KM Rodada</span>
              <p className="text-sm text-zinc-200">
                {os.kmRodada != null ? `${os.kmRodada} km` : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Preço/KM</span>
              <p className="text-sm text-zinc-200">
                {os.precoKm != null ? formatBRL(os.precoKm) : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-zinc-300 font-semibold">
                Custo Transporte
              </span>
              <p className="text-sm text-zinc-100 font-semibold">
                {formatBRL(os.transportCost)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loja */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Store className="h-5 w-5 text-zinc-400" />
            {os.stores.length > 1 ? "Lojas" : "Loja"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {os.stores.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhuma loja vinculada.</p>
          ) : (
            os.stores.map(({ store }) => (
              <div
                key={store.id}
                className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4 space-y-2"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-zinc-500">Nome / Sigla</span>
                    <p className="text-sm font-medium text-zinc-200">
                      {store.sigla} — {store.city}, {store.state}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500">KM Ida/Volta</span>
                    <p className="text-sm text-zinc-200">
                      {store.kmRoundTrip != null
                        ? `${store.kmRoundTrip} km`
                        : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500">
                      Pedágio Ida/Volta
                    </span>
                    <p className="text-sm text-zinc-200">
                      {(store.tollCostGoing != null || store.tollCostReturn != null)
                        ? formatBRL((store.tollCostGoing ?? 0) + (store.tollCostReturn ?? 0))
                        : store.tollRoundTrip != null
                          ? formatBRL(store.tollRoundTrip)
                          : "—"}
                    </p>
                  </div>
                </div>
                {store.address && (
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500">Endereço</span>
                    <p className="text-sm text-zinc-200">{store.address}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Equipe */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Users className="h-5 w-5 text-zinc-400" />
            Equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <span className="text-xs text-zinc-500">Funcionários</span>
              <div className="flex flex-wrap gap-2">
                {os.employees.length === 0 ? (
                  <span className="text-sm text-zinc-500">
                    Nenhum funcionário.
                  </span>
                ) : (
                  os.employees.map(({ employee }) => (
                    <Badge
                      key={employee.id}
                      variant="secondary"
                      className="bg-zinc-800 text-zinc-300 border border-zinc-700"
                    >
                      {employee.shortName}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Veículo</span>
              <p className="text-sm text-zinc-200">{os.vehicle?.name ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Placa</span>
              <p className="text-sm text-zinc-200">
                {os.vehicle?.licensePlate ?? "—"}
              </p>
            </div>
          </div>

          {/* Per-employee hours table */}
          {os.employees.some(
            (e) => e.hoursNormal != null || e.hoursExtra != null,
          ) && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                <Clock className="h-3 w-3" />
                Horas por Funcionário
              </div>
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-900/50 border-b border-zinc-800">
                      <th className="text-left px-3 py-2 text-zinc-500 font-medium">
                        Funcionário
                      </th>
                      <th className="text-right px-3 py-2 text-zinc-500 font-medium">
                        H.Normal
                      </th>
                      <th className="text-right px-3 py-2 text-zinc-500 font-medium">
                        H.Extra
                      </th>
                      <th className="text-right px-3 py-2 text-zinc-500 font-medium">
                        R$/Hora
                      </th>
                      <th className="text-right px-3 py-2 text-zinc-500 font-medium">
                        Data
                      </th>
                      <th className="text-right px-3 py-2 text-zinc-500 font-medium">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {os.employees
                      .filter(
                        (e) => e.hoursNormal != null || e.hoursExtra != null,
                      )
                      .map((e) => {
                        const normal =
                          (e.hoursNormal ?? 0) * (e.pricePerHour ?? 48);
                        const extra =
                          (e.hoursExtra ?? 0) * (e.pricePerHour ?? 48);
                        return (
                          <tr
                            key={e.employee.id}
                            className="border-b border-zinc-800/50 last:border-0"
                          >
                            <td className="px-3 py-2 text-zinc-300">
                              {e.employee.shortName}
                            </td>
                            <td className="px-3 py-2 text-right text-zinc-200">
                              {e.hoursNormal ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-right text-zinc-200">
                              {e.hoursExtra ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-right text-zinc-200">
                              {formatBRL(e.pricePerHour)}
                            </td>
                            <td className="px-3 py-2 text-right text-zinc-400">
                              {e.workDate
                                ? new Date(
                                    e.workDate + "T12:00:00",
                                  ).toLocaleDateString("pt-BR")
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-right text-zinc-200 font-medium">
                              {formatBRL(normal + extra)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Serviços */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Wrench className="h-5 w-5 text-zinc-400" />
            Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          {os.serviceTypes.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum serviço vinculado.</p>
          ) : (
            <ul className="space-y-2">
              {os.serviceTypes.map(({ serviceType }) => (
                <li
                  key={serviceType.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/30 px-4 py-3"
                >
                  <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-sm text-zinc-200">
                    {serviceType.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Materiais */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Package className="h-5 w-5 text-zinc-400" />
            Materiais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {os.materials.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum material vinculado.</p>
          ) : os.materials.some((m) => m.unitPrice != null) ? (
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-900/50 border-b border-zinc-800">
                    <th className="text-left px-3 py-2 text-zinc-500 font-medium">
                      Material
                    </th>
                    <th className="text-right px-3 py-2 text-zinc-500 font-medium">
                      Qtd
                    </th>
                    <th className="text-right px-3 py-2 text-zinc-500 font-medium">
                      Unit R$
                    </th>
                    <th className="text-right px-3 py-2 text-zinc-500 font-medium">
                      Total R$
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {os.materials.map(({ material, quantity, unitPrice }) => (
                    <tr
                      key={material.id}
                      className="border-b border-zinc-800/50 last:border-0"
                    >
                      <td className="px-3 py-2 text-zinc-300">
                        {material.name}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-200">
                        {quantity ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-200">
                        {formatBRL(unitPrice)}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-200 font-medium">
                        {quantity != null && unitPrice != null
                          ? formatBRL(quantity * unitPrice)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="space-y-2">
              {os.materials.map(({ material, quantity }) => (
                <li
                  key={material.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/30 px-4 py-3"
                >
                  {quantity != null && (
                    <Badge
                      variant="secondary"
                      className="bg-zinc-700 text-zinc-300 font-mono text-xs shrink-0"
                    >
                      {quantity}
                    </Badge>
                  )}
                  <span className="text-sm text-zinc-200">{material.name}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Financeiro — inline editable */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <DollarSign className="h-5 w-5 text-zinc-400" />
            Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {financialRows.map((row) => {
              const setter = setters[row.key];
              if (!isEditing || !setter) {
                return (
                  <div key={row.key} className="space-y-1">
                    <span className="text-xs text-zinc-500">{row.label}</span>
                    <p className="text-sm text-zinc-200">
                      {row.key === "manHours"
                        ? formatNumber(row.value)
                        : formatBRL(row.value)}
                    </p>
                  </div>
                );
              }
              return (
                <div key={row.key} className="space-y-1">
                  <span className="text-xs text-zinc-400">{row.label}</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={row.value?.toString() ?? ""}
                    onChange={(e) =>
                      setter(e.target.value ? Number(e.target.value) : null)
                    }
                    className="h-8 text-sm"
                    placeholder="0,00"
                  />
                </div>
              );
            })}
            {/* Total — always computed */}
            <div className="space-y-1">
              <span className="text-xs text-zinc-300 font-semibold">Total</span>
              <p className="text-sm text-zinc-100 font-semibold">
                {formatBRL(isEditing ? computedTotal : totalCost)}
              </p>
              {isEditing && computedTotal !== (totalCost ?? 0) && (
                <span className="text-[10px] text-emerald-500">
                  auto-calculado
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações — inline editable */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <MessageSquare className="h-5 w-5 text-zinc-400" />
            Observações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-1">
                <span className="text-xs text-zinc-400">
                  Serviços Realizados
                </span>
                <Textarea
                  value={servicesPerformed}
                  onChange={(e) => setServicesPerformed(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                  placeholder="Descreva os serviços realizados..."
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-zinc-400">
                  Comentário Gerente
                </span>
                <Textarea
                  value={managerComment}
                  onChange={(e) => setManagerComment(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                  placeholder="Comentário..."
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-zinc-400">
                  Notas de Materiais
                </span>
                <Textarea
                  value={materialsUsedNotes}
                  onChange={(e) => setMaterialsUsedNotes(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                  placeholder="Notas sobre materiais..."
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <span className="text-xs text-zinc-500">
                  Serviços Realizados
                </span>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-800/30 px-4 py-3 min-h-[60px]">
                  {servicesPerformed || "Nenhuma observação."}
                </p>
              </div>
              <Separator className="bg-zinc-800" />
              <div className="space-y-1">
                <span className="text-xs text-zinc-500">
                  Comentário Gerente
                </span>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-800/30 px-4 py-3 min-h-[60px]">
                  {managerComment || "Nenhum comentário."}
                </p>
              </div>
              {materialsUsedNotes && (
                <>
                  <Separator className="bg-zinc-800" />
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500">
                      Notas de Materiais
                    </span>
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-800/30 px-4 py-3">
                      {materialsUsedNotes}
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
