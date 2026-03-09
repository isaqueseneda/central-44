"use client";

import { OSDetailDialog } from "@/components/forms/os-detail-dialog";
import {
  OSFormDialog,
  type OSFormRefs,
} from "@/components/forms/os-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_HOUR_PRICE,
  DEFAULT_HOURS_PER_DAY,
  formatBRL,
  kanbanColumnConfig,
  statusConfig,
  type OrderStatus,
} from "@/lib/format";
import { includesNormalized } from "@/lib/utils";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  FileSpreadsheet,
  Filter,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SerializedServiceOrder {
  id: string;
  orderNumber: number;
  name: string;
  status: string;
  priority: number;
  type: string;
  date: string | null;
  warranty: boolean;
  isObra: boolean;
  vehicleId?: string | null;
  // Report fields
  numeroChamado?: string | null;
  solicitadoPor?: string | null;
  enderecoAtendimento?: string | null;
  servicoSolicitado?: string | null;
  // Notes
  servicesPerformed?: string | null;
  managerComment?: string | null;
  materialsUsedNotes?: string | null;
  // KM
  kmIdaVolta?: number | null;
  kmRodada?: number | null;
  manHours?: number | null;
  extraHours?: number | null;
  horasDia?: number | null;
  precoKm?: number | null;
  // Financial
  laborCost?: number | null;
  materialCost?: number | null;
  transportCost?: number | null;
  totalCost?: number | null;
  mealAllowance?: number | null;
  overnightAllowance?: number | null;
  tollDiscount?: number | null;
  parking?: number | null;
  // Relations
  stores: { store: { id: string; sigla: string; city: string } }[];
  serviceTypes: { serviceType: { id: string; name: string } }[];
  materials: {
    quantity: number | null;
    unitPrice?: number | null;
    material: { id: string; name: string };
  }[];
  teams: {
    team: {
      id: string;
      name: string;
      members: { employeeId: string; employeeName: string }[];
      driverName: string | null;
      vehicleName: string | null;
    };
  }[];
  vehicle: { id: string; name: string; licensePlate: string } | null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KanbanCardComponent({
  order,
  onClick,
  refs,
  isSelected,
  onToggleSelect,
}: {
  order: SerializedServiceOrder;
  onClick: () => void;
  refs: OSFormRefs;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const storeName =
    order.stores[0]?.store.sigla ?? order.stores[0]?.store.city ?? order.name;
  const services = order.serviceTypes.map((st) => st.serviceType.name);
  const teams = order.teams ?? [];

  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData("orderId", order.id);
    e.dataTransfer.setData("sourceStatus", order.status);
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.style.opacity = "0.4";
  }

  function handleDragEnd(e: DragEvent<HTMLDivElement>) {
    e.currentTarget.style.opacity = "1";
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing group/kanban-card relative"
    >
      <Card className={`border-border hover:border-border/80 bg-muted/80 transition-colors py-0 gap-0 rounded-lg ${isSelected ? "ring-2 ring-blue-500/60 bg-blue-500/5" : ""}`}>
        <CardContent className="px-2 py-1 space-y-0">
          {/* Selection checkbox — visible on hover or when selected */}
          <div
            className={`absolute top-1 left-1 z-10 ${isSelected ? "opacity-100" : "opacity-0 group-hover/kanban-card:opacity-100"} transition-opacity`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(order.id)}
              className="h-4 w-4 border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
          </div>
          {/* Row 1: OS number badge + name + warranty/obra badges */}
          <div className="flex items-start gap-1.5 pl-4">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <Badge variant="secondary" className="shrink-0 text-[10px] font-mono px-1 py-0 bg-zinc-700 text-zinc-300">
                {order.orderNumber}
              </Badge>
              <span className="font-medium text-sm text-foreground leading-tight line-clamp-2">
                {storeName}
              </span>
            </div>
            <div className="flex gap-0.5 shrink-0">
              {order.priority > 0 && (
                <span className="text-xs text-yellow-400">{"★".repeat(order.priority)}</span>
              )}
              {order.warranty && (
                <Badge className="bg-yellow-600/20 text-yellow-400 text-[10px] px-1 py-0">GAR</Badge>
              )}
              {order.isObra && (
                <Badge className="bg-orange-600/20 text-orange-400 text-[10px] px-1 py-0 font-bold">OBRA</Badge>
              )}
            </div>
          </div>
          {/* Row 2: Team badge + members */}
          {teams.length > 0 &&
            teams.map((t) => (
              <div key={t.team.id}>
                <div className="flex items-center gap-1 text-xs leading-tight">
                  <Badge className="bg-violet-600/20 text-violet-300 text-[11px] px-1 py-0 shrink-0">
                    🏢 {t.team.name}
                  </Badge>
                  <span className="text-muted-foreground truncate">
                    👷 {t.team.members.map((m) => m.employeeName).join(", ")}
                  </span>
                </div>
                {t.team.vehicleName && (
                  <div className="text-[11px] text-zinc-500 pl-0.5 leading-tight">
                    🚗 {t.team.vehicleName}
                  </div>
                )}
              </div>
            ))}
        </CardContent>
        <OSFormDialog
          trigger={
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="absolute top-1 right-1 p-0.5 opacity-0 group-hover/kanban-card:opacity-100 hover:bg-muted/50 rounded transition-opacity z-10"
              title="Editar OS"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          }
          refs={refs}
          initialData={{
            id: order.id,
            name: order.name,
            status: order.status,
            priority: order.priority,
            type: order.type,
            date: order.date ?? null,
            warranty: order.warranty ?? false,
            isObra: order.isObra ?? false,
            vehicleId: order.vehicleId ?? null,
            storeIds: order.stores.map((s) => s.store.id),
            serviceTypeIds: order.serviceTypes.map((st) => st.serviceType.id),
            teamIds: order.teams?.map((t) => t.team.id) ?? [],
            materialIds: order.materials.map((m) => m.material.id),
            materialDetails: order.materials
              .filter((m) => m.quantity != null || m.unitPrice != null)
              .map((m) => ({
                materialId: m.material.id,
                quantity: m.quantity ?? null,
                unitPrice: m.unitPrice ?? null,
              })),
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
            extraHours: order.extraHours,
          }}
        />
      </Card>
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  color,
  headerBg,
  cards,
  onCardClick,
  onStatusChange,
  refs,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  status: string;
  label: string;
  color: string;
  headerBg: string;
  cards: SerializedServiceOrder[];
  onCardClick: (order: SerializedServiceOrder) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  refs: OSFormRefs;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (status: string, cardIds: string[]) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const columnCardIds = cards.map((c) => c.id);
  const selectedInColumn = columnCardIds.filter((id) => selectedIds.has(id));
  const allSelected = cards.length > 0 && selectedInColumn.length === cards.length;
  const someSelected = selectedInColumn.length > 0 && !allSelected;

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const orderId = e.dataTransfer.getData("orderId");
    const sourceStatus = e.dataTransfer.getData("sourceStatus");
    if (!orderId || sourceStatus === status) return;
    onStatusChange(orderId, status);
  }

  return (
    <div
      className="w-72 shrink-0 space-y-3"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2">
        {cards.length > 0 && (
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={() => onToggleSelectAll(status, columnCardIds)}
            className="h-4 w-4 border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        )}
        <div className={`h-2 w-2 rounded-full ${headerBg}`} />
        <h3 className={`text-base font-semibold ${color}`}>{label}</h3>
        <Badge
          variant="secondary"
          className="ml-auto bg-muted text-muted-foreground text-sm"
        >
          {cards.length}
        </Badge>
      </div>
      <div className={`h-1 w-full rounded-full ${headerBg} opacity-60`} />
      <div
        className={`space-y-2 min-h-[60px] rounded-lg transition-all ${
          isDragOver ? "ring-2 ring-sky-400/60 bg-sky-400/5" : ""
        }`}
      >
        {isDragOver && (
          <div className="flex items-center justify-center py-2 text-sm text-sky-400 animate-pulse">
            Soltar aqui
          </div>
        )}
        {cards.length === 0 && !isDragOver ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma OS
          </div>
        ) : (
          cards.map((order) => (
            <KanbanCardComponent
              key={order.id}
              order={order}
              onClick={() => onCardClick(order)}
              refs={refs}
              isSelected={selectedIds.has(order.id)}
              onToggleSelect={onToggleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

function KanbanBoard({
  orders,
  onCardClick,
  refs,
}: {
  orders: SerializedServiceOrder[];
  onCardClick: (order: SerializedServiceOrder) => void;
  refs: OSFormRefs;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoving, setBulkMoving] = useState(false);

  const grouped = kanbanColumnConfig.map((col) => ({
    ...col,
    cards: orders.filter((o) => o.status === col.status),
  }));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(status: string, cardIds: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = cardIds.every((id) => next.has(id));
      if (allSelected) {
        cardIds.forEach((id) => next.delete(id));
      } else {
        cardIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/ordens/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      const cfg = statusConfig[newStatus as OrderStatus];
      toast.success(`Status atualizado para ${cfg?.label ?? newStatus}`);
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  }

  async function handleBulkMove(newStatus: string) {
    if (selectedIds.size === 0) return;
    setBulkMoving(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/ordens/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }),
      );
      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        toast.error(`${failed} OS falharam ao atualizar`);
      } else {
        const cfg = statusConfig[newStatus as OrderStatus];
        toast.success(
          `${selectedIds.size} OS movidas para ${cfg?.label ?? newStatus}`,
        );
      }
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      toast.error("Erro ao mover OS em lote");
    } finally {
      setBulkMoving(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-600/30 bg-blue-600/10 px-4 py-2">
          <span className="text-sm font-medium text-blue-400">
            {selectedIds.size} OS selecionada{selectedIds.size > 1 ? "s" : ""}
          </span>
          <ArrowRight className="h-4 w-4 text-zinc-500" />
          <div className="flex items-center gap-1.5">
            {kanbanColumnConfig.map((col) => {
              const cfg = statusConfig[col.status];
              return (
                <button
                  key={col.status}
                  onClick={() => handleBulkMove(col.status)}
                  disabled={bulkMoving}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all disabled:opacity-50 ${cfg.className} hover:opacity-80`}
                >
                  {col.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-zinc-500 hover:text-zinc-300 p-1"
            title="Limpar seleção"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {grouped.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              color={col.color}
              headerBg={col.headerBg}
              cards={col.cards}
              onCardClick={onCardClick}
              onStatusChange={handleStatusChange}
              refs={refs}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

type SortKey = "orderNumber" | "status" | "name" | "date" | "totalCost";
type SortDir = "asc" | "desc";

function SortableHead({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <TableHead
      className="text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3 w-3 text-blue-400" />
          ) : (
            <ArrowDown className="h-3 w-3 text-blue-400" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </TableHead>
  );
}

function AllOrdersTable({
  orders,
  onRowClick,
}: {
  orders: SerializedServiceOrder[];
  onRowClick: (order: SerializedServiceOrder) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("orderNumber");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...orders].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "orderNumber":
        return (a.orderNumber - b.orderNumber) * dir;
      case "status":
        return a.status.localeCompare(b.status) * dir;
      case "name":
        return a.name.localeCompare(b.name) * dir;
      case "date": {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return (da - db) * dir;
      }
      case "totalCost":
        return ((a.totalCost ?? 0) - (b.totalCost ?? 0)) * dir;
      default:
        return 0;
    }
  });

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <SortableHead
            label="Nº OS"
            sortKey="orderNumber"
            currentKey={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          />
          <SortableHead
            label="Status"
            sortKey="status"
            currentKey={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          />
          <SortableHead
            label="Nome"
            sortKey="name"
            currentKey={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          />
          <TableHead className="text-muted-foreground">Equipe</TableHead>
          <SortableHead
            label="Data"
            sortKey="date"
            currentKey={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          />
          <TableHead className="text-muted-foreground">Serviços</TableHead>
          <SortableHead
            label="Total"
            sortKey="totalCost"
            currentKey={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((order) => {
          const s = statusConfig[order.status as OrderStatus];
          const serviceNames = order.serviceTypes
            .map((st) => st.serviceType.name)
            .join(", ");
          const dateStr = order.date
            ? new Date(order.date).toLocaleDateString("pt-BR")
            : "—";
          const teamInfo =
            order.teams?.map((t) => t.team.name).join(", ") ?? "";
          return (
            <TableRow
              key={order.id}
              className="border-border hover:bg-muted/50 cursor-pointer"
              onClick={() => onRowClick(order)}
            >
              <TableCell className="font-mono font-medium text-foreground">
                OS-{order.orderNumber}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Badge className={s?.className}>{s?.label}</Badge>
                  {order.isObra && (
                    <Badge className="bg-orange-600/20 text-orange-400 text-xs px-1 py-0 font-bold">
                      OBRA
                    </Badge>
                  )}
                  {order.warranty && (
                    <Badge className="bg-yellow-600/20 text-yellow-400 text-xs px-1 py-0">
                      GAR
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium text-foreground">
                {order.name}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {teamInfo || <span className="text-muted-foreground/60">—</span>}
              </TableCell>
              <TableCell className="text-muted-foreground">{dateStr}</TableCell>
              <TableCell className="text-muted-foreground max-w-[180px] truncate">
                {serviceNames || "—"}
              </TableCell>
              <TableCell className="text-foreground font-mono text-sm">
                {order.totalCost ? `R$ ${order.totalCost.toFixed(2)}` : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function PendingOrdersTable({
  orders,
  onRowClick,
}: {
  orders: SerializedServiceOrder[];
  onRowClick: (order: SerializedServiceOrder) => void;
}) {
  const pendingOrders = orders.filter((o) => o.status === "NOT_STARTED");
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-muted-foreground">Nº OS</TableHead>
          <TableHead className="text-muted-foreground">Nome</TableHead>
          <TableHead className="text-muted-foreground">Equipes</TableHead>
          <TableHead className="text-muted-foreground">Serviços</TableHead>
          <TableHead className="text-muted-foreground">Materiais</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pendingOrders.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              Nenhuma OS pendente 🎉
            </TableCell>
          </TableRow>
        ) : (
          pendingOrders.map((order) => {
            const serviceNames = order.serviceTypes
              .map((st) => st.serviceType.name)
              .join(", ");
            const materialNames = order.materials
              .map(
                (m) =>
                  `${m.quantity ? m.quantity + " " : ""}${m.material.name}`,
              )
              .join(", ");
            const teamNames =
              order.teams?.map((t) => t.team.name).join(", ") ?? "";
            return (
              <TableRow
                key={order.id}
                className="border-border hover:bg-muted/50 cursor-pointer"
                onClick={() => onRowClick(order)}
              >
                <TableCell className="font-mono font-medium text-foreground">
                  OS-{order.orderNumber}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {order.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {teamNames || (
                    <span className="text-red-400 text-sm">Sem equipe</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                  {serviceNames || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[160px] truncate">
                  {materialNames || "—"}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Inline Spreadsheet Cell
// ---------------------------------------------------------------------------

function SpreadsheetCell({
  value,
  orderId,
  field,
  type = "number",
  onSaved,
}: {
  value: number | null;
  orderId: string;
  field: string;
  type?: "number";
  onSaved?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value != null ? String(value) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalVal(value != null ? String(value) : "");
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function handleBlur() {
    setEditing(false);
    const parsed = parseFloat(localVal.replace(",", ".")) || 0;
    const original = value ?? 0;
    if (parsed === original) return;

    try {
      const res = await fetch(`/api/ordens/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: parsed }),
      });
      if (!res.ok) throw new Error("Failed");
      onSaved?.();
    } catch {
      toast.error("Erro ao salvar");
      setLocalVal(value != null ? String(value) : "");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
    if (e.key === "Escape") {
      setLocalVal(value != null ? String(value) : "");
      setEditing(false);
    }
  }

  const display =
    value != null && value !== 0
      ? value.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "—";

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full bg-muted border border-sky-500/50 rounded px-1.5 py-0.5 text-sm text-foreground outline-none text-right"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`block w-full cursor-text px-1.5 py-0.5 text-sm rounded hover:bg-muted/50 transition-colors text-right ${
        value != null && value !== 0 ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {display}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Read-only cell for computed fields (greyed out)
// ---------------------------------------------------------------------------

function ReadOnlyCell({ value }: { value: number | null | undefined }) {
  const display =
    value != null && value !== 0
      ? value.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "—";
  return (
    <span className="block w-full px-1.5 py-0.5 text-sm text-right text-zinc-500">
      {display}
    </span>
  );
}

// ---------------------------------------------------------------------------
// HorasDia cell — editable, auto-recalcs manHours + laborCost on save
// ---------------------------------------------------------------------------

function HorasDiaCell({
  order,
  globalHorasDia,
  globalPrecoHora,
  onSaved,
}: {
  order: SerializedServiceOrder;
  globalHorasDia: number;
  globalPrecoHora: number;
  onSaved?: () => void;
}) {
  const currentVal = order.horasDia ?? globalHorasDia;
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(String(currentVal));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalVal(String(order.horasDia ?? globalHorasDia));
  }, [order.horasDia, globalHorasDia]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Count employees from teams
  function getEmployeeCount(): number {
    if (!order.teams || order.teams.length === 0) return 0;
    return order.teams.reduce(
      (acc, t) => acc + (t.team.members?.length ?? 0),
      0,
    );
  }

  async function handleBlur() {
    setEditing(false);
    const parsed = parseFloat(localVal.replace(",", ".")) || 0;
    if (parsed === currentVal) return;

    const employees = getEmployeeCount();
    const mh = employees * parsed;
    const labor = mh * globalPrecoHora;

    try {
      const res = await fetch(`/api/ordens/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horasDia: parsed,
          manHours: mh,
          laborCost: labor,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error("HorasDia save error:", res.status, errBody);
        throw new Error(errBody);
      }
      onSaved?.();
    } catch (err) {
      console.error("HorasDia save failed:", err);
      toast.error("Erro ao salvar");
      setLocalVal(String(currentVal));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
    if (e.key === "Escape") {
      setLocalVal(String(currentVal));
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full bg-muted border border-sky-500/50 rounded px-1.5 py-0.5 text-sm text-foreground outline-none text-right"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`block w-full cursor-text px-1.5 py-0.5 text-sm rounded hover:bg-muted/50 transition-colors text-right ${
        currentVal ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {currentVal}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Spreadsheet (Planilha) Table — matches MEDICAO layout
// ---------------------------------------------------------------------------

function SpreadsheetTable({
  orders,
  onRowClick,
  onRefresh,
  settings,
}: {
  orders: SerializedServiceOrder[];
  onRowClick: (order: SerializedServiceOrder) => void;
  onRefresh: () => void;
  settings?: Record<string, string>;
}) {
  const globalHorasDia = Number(settings?.horasDia) || DEFAULT_HOURS_PER_DAY;
  const globalPrecoHora = Number(settings?.precoHora) || DEFAULT_HOUR_PRICE;

  // Column totals
  const sum = (fn: (o: SerializedServiceOrder) => number) =>
    orders.reduce((acc, o) => acc + fn(o), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs whitespace-nowrap">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="sticky left-0 bg-muted z-10 px-2 py-2 text-left text-muted-foreground font-semibold w-10">
              #
            </th>
            <th className="sticky left-10 bg-muted z-10 px-2 py-2 text-left text-muted-foreground font-semibold w-16">
              O.S.
            </th>
            <th className="px-2 py-2 text-left text-muted-foreground font-semibold w-16">
              FILIAL
            </th>
            <th className="px-2 py-2 text-right text-muted-foreground font-semibold w-20">
              IDA/VOLTA
            </th>
            <th className="px-2 py-2 text-right text-muted-foreground font-semibold w-20">
              KM RODADA
            </th>
            <th className="px-2 py-2 text-right text-muted-foreground font-semibold w-20">
              TRANSPORTE
            </th>
            <th className="px-2 py-2 text-right text-muted-foreground font-semibold w-14">
              H/DIA
            </th>
            <th className="px-2 py-2 text-right text-zinc-600 font-semibold w-16">
              H/hs
            </th>
            <th className="px-2 py-2 text-right text-zinc-600 font-semibold w-20">
              MÃO OBRA
            </th>
            <th className="px-2 py-2 text-right text-muted-foreground font-semibold w-20">
              MATERIAL
            </th>
            <th className="px-2 py-2 text-right text-muted-foreground font-semibold w-18">
              REFEIÇÃO
            </th>
            <th className="px-2 py-2 text-right text-muted-foreground font-semibold w-18">
              PERNOITE
            </th>
            <th className="px-2 py-2 text-right text-muted-foreground font-semibold w-18">
              PEDÁGIO
            </th>
            <th className="px-2 py-2 text-right text-muted-foreground font-semibold w-18">
              ESTAC.
            </th>
            <th className="px-2 py-2 text-right text-muted-foreground font-bold w-22">
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, idx) => {
            const store = order.stores[0]?.store;
            return (
              <tr
                key={order.id}
                className="border-b border-border/50 hover:bg-muted/30 group"
              >
                <td className="sticky left-0 bg-background z-10 px-2 py-1 text-muted-foreground font-mono">
                  {idx + 1}
                </td>
                <td
                  className="sticky left-10 bg-background z-10 px-2 py-1 font-mono font-medium text-foreground cursor-pointer hover:text-blue-400"
                  onClick={() => onRowClick(order)}
                >
                  {order.orderNumber}
                </td>
                <td className="px-2 py-1 text-muted-foreground">
                  {store?.sigla ?? "—"}
                </td>
                <td className="px-2 py-1">
                  <SpreadsheetCell
                    value={order.kmIdaVolta ?? null}
                    orderId={order.id}
                    field="kmIdaVolta"
                    onSaved={onRefresh}
                  />
                </td>
                <td className="px-2 py-1">
                  <SpreadsheetCell
                    value={order.kmRodada ?? null}
                    orderId={order.id}
                    field="kmRodada"
                    onSaved={onRefresh}
                  />
                </td>
                <td className="px-2 py-1">
                  <ReadOnlyCell value={order.transportCost} />
                </td>
                <td className="px-2 py-1">
                  <HorasDiaCell
                    order={order}
                    globalHorasDia={globalHorasDia}
                    globalPrecoHora={globalPrecoHora}
                    onSaved={onRefresh}
                  />
                </td>
                <td className="px-2 py-1">
                  <ReadOnlyCell value={order.manHours} />
                </td>
                <td className="px-2 py-1">
                  <ReadOnlyCell value={order.laborCost} />
                </td>
                <td className="px-2 py-1">
                  <ReadOnlyCell value={order.materialCost} />
                </td>
                <td className="px-2 py-1">
                  <SpreadsheetCell
                    value={order.mealAllowance ?? null}
                    orderId={order.id}
                    field="mealAllowance"

                    onSaved={onRefresh}
                  />
                </td>
                <td className="px-2 py-1">
                  <SpreadsheetCell
                    value={order.overnightAllowance ?? null}
                    orderId={order.id}
                    field="overnightAllowance"

                    onSaved={onRefresh}
                  />
                </td>
                <td className="px-2 py-1">
                  <SpreadsheetCell
                    value={order.tollDiscount ?? null}
                    orderId={order.id}
                    field="tollDiscount"

                    onSaved={onRefresh}
                  />
                </td>
                <td className="px-2 py-1">
                  <SpreadsheetCell
                    value={order.parking ?? null}
                    orderId={order.id}
                    field="parking"

                    onSaved={onRefresh}
                  />
                </td>
                <td className="px-2 py-1 text-right font-mono font-bold text-foreground">
                  {order.totalCost ? formatBRL(order.totalCost) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/60">
            <td
              colSpan={3}
              className="sticky left-0 bg-muted/60 z-10 px-2 py-2 text-muted-foreground font-bold text-xs"
            >
              TOTAL ({orders.length} OS)
            </td>
            <td className="px-2 py-2 text-right text-foreground font-bold text-xs">
              {sum((o) => o.kmIdaVolta ?? 0).toLocaleString("pt-BR")}
            </td>
            <td className="px-2 py-2 text-right text-foreground font-bold text-xs">
              {sum((o) => o.kmRodada ?? 0).toLocaleString("pt-BR")}
            </td>
            <td className="px-2 py-2 text-right text-foreground font-bold text-xs">
              {formatBRL(sum((o) => o.transportCost ?? 0))}
            </td>
            <td className="px-2 py-2 text-right text-zinc-600 font-bold text-xs">
              —
            </td>
            <td className="px-2 py-2 text-right text-zinc-600 font-bold text-xs">
              {sum((o) => o.manHours ?? 0).toLocaleString("pt-BR")}
            </td>
            <td className="px-2 py-2 text-right text-zinc-600 font-bold text-xs">
              {formatBRL(sum((o) => o.laborCost ?? 0))}
            </td>
            <td className="px-2 py-2 text-right text-foreground font-bold text-xs">
              {formatBRL(sum((o) => o.materialCost ?? 0))}
            </td>
            <td className="px-2 py-2 text-right text-foreground font-bold text-xs">
              {formatBRL(sum((o) => o.mealAllowance ?? 0))}
            </td>
            <td className="px-2 py-2 text-right text-foreground font-bold text-xs">
              {formatBRL(sum((o) => o.overnightAllowance ?? 0))}
            </td>
            <td className="px-2 py-2 text-right text-foreground font-bold text-xs">
              {formatBRL(sum((o) => o.tollDiscount ?? 0))}
            </td>
            <td className="px-2 py-2 text-right text-foreground font-bold text-xs">
              {formatBRL(sum((o) => o.parking ?? 0))}
            </td>
            <td className="px-2 py-2 text-right font-mono font-bold text-orange-400 text-xs">
              {formatBRL(sum((o) => o.totalCost ?? 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

export default function OSListClient({
  orders,
  refs,
  settings,
}: {
  orders: SerializedServiceOrder[];
  refs: OSFormRefs;
  settings?: Record<string, string>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] =
    useState<SerializedServiceOrder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // (medicao date state removed — now status-only)

  function handleCardClick(order: SerializedServiceOrder) {
    setSelectedOrder(order);
    setDialogOpen(true);
  }

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !search ||
      includesNormalized(o.name, search) ||
      o.orderNumber.toString().includes(search) ||
      o.stores.some(
        (s) =>
          includesNormalized(s.store.city, search) ||
          includesNormalized(s.store.sigla, search),
      ) ||
      (o.teams?.some((t) =>
        t.team.members.some((m) => includesNormalized(m.employeeName, search)),
      ) ??
        false);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Ordens de Serviço</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-border text-foreground hover:bg-muted"
            onClick={() => {
              window.open(
                `/api/ordens/medicao/pdf?status=MEASUREMENT`,
                "_blank",
              );
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Medição
          </Button>
          <OSFormDialog
            trigger={
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4" />
                Nova OS
              </Button>
            }
            refs={refs}
            settings={settings}
          />
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Buscar por nome, OS, loja ou funcionário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-border bg-muted/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 border-border bg-muted/50">
            <Filter className="h-3.5 w-3.5 mr-1 text-zinc-500" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="NOT_STARTED">Não iniciada</SelectItem>
            <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
            <SelectItem value="RETURN_VISIT">Retorno</SelectItem>
            <SelectItem value="MEASUREMENT">Medição</SelectItem>
            <SelectItem value="PAID">Pago</SelectItem>
            <SelectItem value="REWORK">Retrabalho</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          {filteredOrders.length} OS
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="status">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="planilha">Planilha</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-6">
          <KanbanBoard
            orders={filteredOrders}
            onCardClick={handleCardClick}
            refs={refs}
          />
        </TabsContent>

        <TabsContent value="todas" className="mt-6">
          <Card className="border-border bg-muted/50">
            <CardContent className="p-0">
              <AllOrdersTable
                orders={filteredOrders}
                onRowClick={handleCardClick}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planilha" className="mt-6">
          <Card className="border-border bg-muted/50">
            <CardContent className="p-0">
              <SpreadsheetTable
                orders={orders.filter((o) => {
                  if (o.status !== "MEASUREMENT") return false;
                  if (!search) return true;
                  return (
                    includesNormalized(o.name, search) ||
                    o.orderNumber.toString().includes(search) ||
                    o.stores.some(
                      (s) =>
                        includesNormalized(s.store.city, search) ||
                        includesNormalized(s.store.sigla, search),
                    )
                  );
                })}
                onRowClick={handleCardClick}
                onRefresh={() => router.refresh()}
                settings={settings}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendentes" className="mt-6">
          <Card className="border-border bg-muted/50">
            <CardContent className="p-0">
              <PendingOrdersTable
                orders={filteredOrders}
                onRowClick={handleCardClick}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <OSDetailDialog
        order={selectedOrder}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        refs={refs}
        settings={settings}
      />
    </div>
  );
}
