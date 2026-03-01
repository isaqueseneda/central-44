"use client";

import { OSDetailDialog } from "@/components/forms/os-detail-dialog";
import {
  OSFormDialog,
  type OSFormRefs,
} from "@/components/forms/os-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  formatBRL,
  kanbanColumnConfig,
  statusConfig,
  type OrderStatus,
} from "@/lib/format";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileSpreadsheet,
  Filter,
  Pencil,
  Plus,
  Search,
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
}: {
  order: SerializedServiceOrder;
  onClick: () => void;
  refs: OSFormRefs;
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
      <Card className="border-zinc-700/60 bg-zinc-800/80 hover:border-zinc-600 transition-colors">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-sm text-zinc-100 leading-tight">
              {storeName}
            </span>
            {order.warranty && (
              <Badge className="bg-yellow-600/20 text-yellow-400 text-[10px] px-1.5 py-0">
                GAR
              </Badge>
            )}
            {order.isObra && (
              <Badge className="bg-orange-600/20 text-orange-400 text-[10px] px-1.5 py-0 font-bold">
                OBRA
              </Badge>
            )}
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            OS-{order.orderNumber}
          </span>
          {teams.length > 0 && (
            <div className="space-y-1">
              {teams.map((t) => (
                <div key={t.team.id} className="space-y-0.5">
                  <Badge className="bg-violet-600/20 text-violet-300 text-[10px] px-1.5 py-0">
                    {t.team.name}
                  </Badge>
                  {t.team.members.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 pl-0.5">
                      {t.team.members.map((m, idx) => (
                        <span
                          key={`${m.employeeName}-${idx}`}
                          className="text-[9px] text-zinc-500"
                        >
                          {m.employeeName}
                          {idx < t.team.members.length - 1 ? "," : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {services.length > 0 && (
            <ul className="space-y-0.5">
              {services.map((s) => (
                <li key={s} className="text-xs text-zinc-400 truncate">
                  {s}
                </li>
              ))}
            </ul>
          )}
          {order.priority > 0 && (
            <div className="text-xs text-yellow-400">
              {"★".repeat(order.priority)}
            </div>
          )}
        </CardContent>
        <OSFormDialog
          trigger={
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="absolute top-2 right-2 p-1 opacity-0 group-hover/kanban-card:opacity-100 hover:bg-zinc-700/50 rounded transition-opacity z-10"
              title="Editar OS"
            >
              <Pencil className="h-3 w-3 text-zinc-400 hover:text-zinc-200" />
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
                        materialIds: [],
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
}: {
  status: string;
  label: string;
  color: string;
  headerBg: string;
  cards: SerializedServiceOrder[];
  onCardClick: (order: SerializedServiceOrder) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  refs: OSFormRefs;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    // Only leave if we're truly exiting the column, not entering a child
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
      className="w-64 shrink-0 space-y-3"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${headerBg}`} />
        <h3 className={`text-sm font-semibold ${color}`}>{label}</h3>
        <Badge
          variant="secondary"
          className="ml-auto bg-zinc-800 text-zinc-400 text-xs"
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
          <div className="flex items-center justify-center py-2 text-xs text-sky-400 animate-pulse">
            Soltar aqui
          </div>
        )}
        {cards.length === 0 && !isDragOver ? (
          <div className="rounded-lg border border-dashed border-zinc-700/50 p-6 text-center text-xs text-zinc-600">
            Nenhuma OS
          </div>
        ) : (
          cards.map((order) => (
            <KanbanCardComponent
              key={order.id}
              order={order}
              onClick={() => onCardClick(order)}
              refs={refs}
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

  const grouped = kanbanColumnConfig.map((col) => ({
    ...col,
    cards: orders.filter((o) => o.status === col.status),
  }));

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

  return (
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
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
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
      className="text-zinc-400 cursor-pointer select-none hover:text-zinc-200 transition-colors"
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
        <TableRow className="border-zinc-800 hover:bg-transparent">
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
          <TableHead className="text-zinc-400">Equipe</TableHead>
          <SortableHead
            label="Data"
            sortKey="date"
            currentKey={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          />
          <TableHead className="text-zinc-400">Serviços</TableHead>
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
              className="border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
              onClick={() => onRowClick(order)}
            >
              <TableCell className="font-mono font-medium text-zinc-200">
                OS-{order.orderNumber}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Badge className={s?.className}>{s?.label}</Badge>
                  {order.isObra && (
                    <Badge className="bg-orange-600/20 text-orange-400 text-[9px] px-1 py-0 font-bold">
                      OBRA
                    </Badge>
                  )}
                  {order.warranty && (
                    <Badge className="bg-yellow-600/20 text-yellow-400 text-[9px] px-1 py-0">
                      GAR
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium text-zinc-200">
                {order.name}
              </TableCell>
              <TableCell className="text-zinc-400">
                {teamInfo || <span className="text-zinc-600">—</span>}
              </TableCell>
              <TableCell className="text-zinc-400">{dateStr}</TableCell>
              <TableCell className="text-zinc-400 max-w-[180px] truncate">
                {serviceNames || "—"}
              </TableCell>
              <TableCell className="text-zinc-300 font-mono text-sm">
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
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-zinc-400">Nº OS</TableHead>
          <TableHead className="text-zinc-400">Nome</TableHead>
          <TableHead className="text-zinc-400">Equipes</TableHead>
          <TableHead className="text-zinc-400">Serviços</TableHead>
          <TableHead className="text-zinc-400">Materiais</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pendingOrders.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-zinc-500 py-8">
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
                className="border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
                onClick={() => onRowClick(order)}
              >
                <TableCell className="font-mono font-medium text-zinc-200">
                  OS-{order.orderNumber}
                </TableCell>
                <TableCell className="font-medium text-zinc-200">
                  {order.name}
                </TableCell>
                <TableCell className="text-zinc-400">
                  {teamNames || (
                    <span className="text-red-400 text-xs">Sem equipe</span>
                  )}
                </TableCell>
                <TableCell className="text-zinc-400 max-w-[200px] truncate">
                  {serviceNames || "—"}
                </TableCell>
                <TableCell className="text-zinc-400 max-w-[160px] truncate">
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
        className="w-full bg-zinc-700 border border-sky-500/50 rounded px-1.5 py-0.5 text-xs text-zinc-100 outline-none text-right"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`block w-full cursor-text px-1.5 py-0.5 text-xs rounded hover:bg-zinc-700/50 transition-colors text-right ${
        value != null && value !== 0 ? "text-zinc-300" : "text-zinc-600"
      }`}
    >
      {display}
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
}: {
  orders: SerializedServiceOrder[];
  onRowClick: (order: SerializedServiceOrder) => void;
  onRefresh: () => void;
}) {
  // Column totals
  const sum = (fn: (o: SerializedServiceOrder) => number) =>
    orders.reduce((acc, o) => acc + fn(o), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs whitespace-nowrap">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-800/50">
            <th className="sticky left-0 bg-zinc-800 z-10 px-2 py-2 text-left text-zinc-500 font-semibold w-10">
              #
            </th>
            <th className="sticky left-10 bg-zinc-800 z-10 px-2 py-2 text-left text-zinc-500 font-semibold w-16">
              O.S.
            </th>
            <th className="px-2 py-2 text-left text-zinc-500 font-semibold w-16">
              FILIAL
            </th>
            <th className="px-2 py-2 text-left text-zinc-500 font-semibold w-28">
              CIDADE
            </th>
            <th className="px-2 py-2 text-right text-zinc-500 font-semibold w-20">
              IDA/VOLTA
            </th>
            <th className="px-2 py-2 text-right text-zinc-500 font-semibold w-20">
              KM RODADA
            </th>
            <th className="px-2 py-2 text-right text-zinc-500 font-semibold w-16">
              H/hs
            </th>
            <th className="px-2 py-2 text-right text-zinc-500 font-semibold w-20">
              MÃO OBRA
            </th>
            <th className="px-2 py-2 text-right text-zinc-500 font-semibold w-20">
              MATERIAL
            </th>
            <th className="px-2 py-2 text-right text-zinc-500 font-semibold w-20">
              TRANSPORTE
            </th>
            <th className="px-2 py-2 text-right text-zinc-500 font-semibold w-18">
              REFEIÇÃO
            </th>
            <th className="px-2 py-2 text-right text-zinc-500 font-semibold w-18">
              PERNOITE
            </th>
            <th className="px-2 py-2 text-right text-zinc-500 font-semibold w-18">
              PEDÁGIO
            </th>
            <th className="px-2 py-2 text-right text-zinc-500 font-semibold w-18">
              ESTAC.
            </th>
            <th className="px-2 py-2 text-right text-zinc-400 font-bold w-22">
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
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 group"
              >
                <td className="sticky left-0 bg-zinc-900 z-10 px-2 py-1 text-zinc-600 font-mono">
                  {idx + 1}
                </td>
                <td
                  className="sticky left-10 bg-zinc-900 z-10 px-2 py-1 font-mono font-medium text-zinc-300 cursor-pointer hover:text-blue-400"
                  onClick={() => onRowClick(order)}
                >
                  {order.orderNumber}
                </td>
                <td className="px-2 py-1 text-zinc-400">
                  {store?.sigla ?? "—"}
                </td>
                <td className="px-2 py-1 text-zinc-300 font-medium">
                  {store?.city ?? order.name}
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
                  <SpreadsheetCell
                    value={order.manHours ?? null}
                    orderId={order.id}
                    field="manHours"
                    onSaved={onRefresh}
                  />
                </td>
                <td className="px-2 py-1">
                  <SpreadsheetCell
                    value={order.laborCost ?? null}
                    orderId={order.id}
                    field="laborCost"
                    onSaved={onRefresh}
                  />
                </td>
                <td className="px-2 py-1">
                  <SpreadsheetCell
                    value={order.materialCost ?? null}
                    orderId={order.id}
                    field="materialCost"
                    onSaved={onRefresh}
                  />
                </td>
                <td className="px-2 py-1">
                  <SpreadsheetCell
                    value={order.transportCost ?? null}
                    orderId={order.id}
                    field="transportCost"
                    onSaved={onRefresh}
                  />
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
                <td className="px-2 py-1 text-right font-mono font-bold text-zinc-200">
                  {order.totalCost ? formatBRL(order.totalCost) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-zinc-700 bg-zinc-800/60">
            <td
              colSpan={4}
              className="sticky left-0 bg-zinc-800/60 z-10 px-2 py-2 text-zinc-400 font-bold text-xs"
            >
              TOTAL ({orders.length} OS)
            </td>
            <td className="px-2 py-2 text-right text-zinc-300 font-bold text-xs">
              {sum((o) => o.kmIdaVolta ?? 0).toLocaleString("pt-BR")}
            </td>
            <td className="px-2 py-2 text-right text-zinc-300 font-bold text-xs">
              {sum((o) => o.kmRodada ?? 0).toLocaleString("pt-BR")}
            </td>
            <td className="px-2 py-2 text-right text-zinc-300 font-bold text-xs">
              {sum((o) => o.manHours ?? 0).toLocaleString("pt-BR")}
            </td>
            <td className="px-2 py-2 text-right text-zinc-300 font-bold text-xs">
              {formatBRL(sum((o) => o.laborCost ?? 0))}
            </td>
            <td className="px-2 py-2 text-right text-zinc-300 font-bold text-xs">
              {formatBRL(sum((o) => o.materialCost ?? 0))}
            </td>
            <td className="px-2 py-2 text-right text-zinc-300 font-bold text-xs">
              {formatBRL(sum((o) => o.transportCost ?? 0))}
            </td>
            <td className="px-2 py-2 text-right text-zinc-300 font-bold text-xs">
              {formatBRL(sum((o) => o.mealAllowance ?? 0))}
            </td>
            <td className="px-2 py-2 text-right text-zinc-300 font-bold text-xs">
              {formatBRL(sum((o) => o.overnightAllowance ?? 0))}
            </td>
            <td className="px-2 py-2 text-right text-zinc-300 font-bold text-xs">
              {formatBRL(sum((o) => o.tollDiscount ?? 0))}
            </td>
            <td className="px-2 py-2 text-right text-zinc-300 font-bold text-xs">
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

  // Medição export state
  const [medicaoFrom, setMedicaoFrom] = useState("");
  const [medicaoTo, setMedicaoTo] = useState("");

  function handleCardClick(order: SerializedServiceOrder) {
    setSelectedOrder(order);
    setDialogOpen(true);
  }

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !search ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber.toString().includes(search) ||
      o.stores.some(
        (s) =>
          s.store.city.toLowerCase().includes(search.toLowerCase()) ||
          s.store.sigla.toLowerCase().includes(search.toLowerCase()),
      ) ||
      (o.teams?.some((t) =>
        t.team.members.some((m) =>
          m.employeeName.toLowerCase().includes(search.toLowerCase()),
        ),
      ) ??
        false);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-zinc-100">Ordens de Serviço</h1>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Medição
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-zinc-100">
                  Exportar Resumo de Medição
                </h4>
                <p className="text-xs text-zinc-500">
                  Selecione o período para gerar o PDF de medições.
                </p>
                {/* Quick buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs border-zinc-700"
                    onClick={() => {
                      const now = new Date();
                      const day = now.getDay(); // 0=Sun, 1=Mon...
                      const diffToMon = day === 0 ? -6 : 1 - day;
                      const mon = new Date(now);
                      mon.setDate(now.getDate() + diffToMon);
                      const fri = new Date(mon);
                      fri.setDate(mon.getDate() + 4);
                      const fmt = (d: Date) => d.toISOString().slice(0, 10);
                      setMedicaoFrom(fmt(mon));
                      setMedicaoTo(fmt(fri));
                    }}
                  >
                    Esta Semana
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs border-zinc-700"
                    onClick={() => {
                      const now = new Date();
                      const first = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        1,
                      );
                      const last = new Date(
                        now.getFullYear(),
                        now.getMonth() + 1,
                        0,
                      );
                      const fmt = (d: Date) => d.toISOString().slice(0, 10);
                      setMedicaoFrom(fmt(first));
                      setMedicaoTo(fmt(last));
                    }}
                  >
                    Este Mês
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">De</Label>
                    <Input
                      type="date"
                      value={medicaoFrom}
                      onChange={(e) => setMedicaoFrom(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Até</Label>
                    <Input
                      type="date"
                      value={medicaoTo}
                      onChange={(e) => setMedicaoTo(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!medicaoFrom || !medicaoTo}
                  onClick={() => {
                    if (medicaoFrom && medicaoTo) {
                      window.open(
                        `/api/ordens/medicao/pdf?from=${medicaoFrom}&to=${medicaoTo}`,
                        "_blank",
                      );
                    }
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Gerar PDF
                </Button>
              </div>
            </PopoverContent>
          </Popover>
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
            className="pl-9 border-zinc-800 bg-zinc-900/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 border-zinc-800 bg-zinc-900/50">
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
        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
          {filteredOrders.length} OS
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="status">
        <TabsList className="bg-zinc-800/60">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="planilha">Planilha</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-6">
          <KanbanBoard orders={filteredOrders} onCardClick={handleCardClick} refs={refs} />
        </TabsContent>

        <TabsContent value="todas" className="mt-6">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-0">
              <AllOrdersTable
                orders={filteredOrders}
                onRowClick={handleCardClick}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planilha" className="mt-6">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-0">
              <SpreadsheetTable
                orders={filteredOrders}
                onRowClick={handleCardClick}
                onRefresh={() => router.refresh()}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendentes" className="mt-6">
          <Card className="border-zinc-800 bg-zinc-900/50">
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
