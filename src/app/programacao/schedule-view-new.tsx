"use client";

import {
  OSFormDialog,
  type OSFormRefs,
} from "@/components/forms/os-form-dialog";
import { PersistentTeamForm } from "@/components/forms/persistent-team-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { statusConfig, type OrderStatus } from "@/lib/format";
import {
  Calendar,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  HardHat,
  Maximize2,
  Minimize2,
  Paintbrush,
  Pencil,
  Plus,
  Search,
  Undo,
  User,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type DragEvent } from "react";
import { toast } from "sonner";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface TeamMember {
  employeeId: string;
  employeeName: string;
  rank: number;
  isLeader: boolean;
}

interface Team {
  id: string;
  name: string;
  driverId: string | null;
  driverName: string | null;
  vehicleId: string | null;
  vehicleName: string | null;
  vehiclePlate: string | null;
  isActive: boolean;
  memberIds: string[];
  members: TeamMember[];
}

interface Store {
  id: string;
  sigla: string;
  city: string;
}

interface ServiceType {
  serviceType: { id: string; name: string };
}

interface ServiceOrder {
  id: string;
  orderNumber: number;
  name: string;
  status: string;
  priority: number;
  type: "GENERAL" | "ALARM" | "LED";
  date?: string | null;
  isObra?: boolean;
  stores: { store: Store }[];
  serviceTypes?: ServiceType[];
  teamIds?: string[];
}

interface ScheduleAssignment {
  id: string;
  teamId: string;
  date: string;
  endDate?: string | null;
  serviceOrderId: string | null;
  serviceOrder: ServiceOrder | null;
  notes: string | null;
}

interface Props {
  teams: Team[];
  assignments: ScheduleAssignment[];
  serviceOrders: ServiceOrder[];
  employees: { id: string; shortName: string }[];
  vehicles: { id: string; name: string; licensePlate: string }[];
  scheduledOrderIds?: string[];
  stores?: { id: string; sigla: string; city: string; code: string }[];
  serviceTypes?: { id: string; name: string }[];
  materials?: { id: string; name: string }[];
}

interface UndoAction {
  type: "create" | "move" | "delete" | "resize";
  assignmentId: string;
  previousState?: {
    teamId: string;
    date: string;
    endDate?: string | null;
  };
  currentState?: {
    teamId: string;
    date: string;
    endDate?: string | null;
  };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(baseDate: Date): Date[] {
  const monday = getMondayOfWeek(baseDate);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatWeekLabel(monday: Date): string {
  const d = String(monday.getDate()).padStart(2, "0");
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  return `Semana de ${d}/${m}/${monday.getFullYear()}`;
}

function getDaysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ──────────────────────────────────────────────
// Service Order Card (in cell & draggable pool)
// ──────────────────────────────────────────────

function ServiceOrderCard({
  order,
  compact,
  onEdit,
}: {
  order: ServiceOrder;
  compact?: boolean;
  onEdit?: () => void;
}) {
  const typeConfig = {
    GENERAL: { icon: Wrench, color: "text-blue-400", bg: "bg-blue-600/20" },
    ALARM: { icon: Paintbrush, color: "text-amber-400", bg: "bg-amber-600/20" },
    LED: { icon: HardHat, color: "text-emerald-400", bg: "bg-emerald-600/20" },
  };
  const config = typeConfig[order.type] || typeConfig.GENERAL;
  const Icon = config.icon;
  const storeName =
    order.stores[0]?.store.sigla ?? order.stores[0]?.store.city ?? order.name;
  const services = order.serviceTypes?.map((st) => st.serviceType.name) ?? [];
  const s = statusConfig[order.status as OrderStatus];

  if (compact) {
    return (
      <Card className="border-zinc-700/60 bg-zinc-800/80 hover:border-zinc-600 transition-colors overflow-hidden">
        <div className="px-1 py-0.5 flex items-center gap-1 min-h-[16px] max-h-[16px]">
          <span className="text-[9px] font-semibold text-zinc-100 truncate flex-1 leading-none">
            {storeName}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            {order.isObra && <HardHat className="h-2 w-2 text-orange-400" />}
            {order.priority > 0 && (
              <span className="text-[9px] text-yellow-400 leading-none">★</span>
            )}
            <span
              className={`text-[8px] font-medium ${config.color} leading-none`}
            >
              #{order.orderNumber}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-700/60 bg-zinc-800/80 hover:border-zinc-600 transition-colors overflow-hidden">
      <CardContent className="p-2 space-y-1 max-w-full">
        <div className="flex items-start justify-between gap-1">
          <span className="text-xs font-semibold text-zinc-100 leading-tight truncate flex-1">
            {storeName}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            {order.isObra && (
              <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-bold bg-orange-600/20 text-orange-400">
                OBRA
              </span>
            )}
            <span
              className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium ${config.bg}`}
            >
              <Icon className={`h-2 w-2 ${config.color}`} />
              <span className={config.color}>OS-{order.orderNumber}</span>
            </span>
          </div>
        </div>
        {services.length > 0 && (
          <div className="text-[10px] text-zinc-400 truncate">
            {services.join(", ")}
          </div>
        )}
        <div className="flex items-center gap-1 flex-wrap">
          {order.priority > 0 && (
            <span className="text-[10px] text-yellow-400">
              {"★".repeat(order.priority)}
            </span>
          )}
          {s && (
            <Badge className={`${s.className} text-[9px] px-1 py-0 h-4`}>
              {s.label}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Draggable Cell Card with resize handles
// ──────────────────────────────────────────────

function DraggableCellCard({
  assignment,
  onRemove,
  onResize,
  compact = false,
  spanDays = 1,
  osFormRefs,
}: {
  assignment: ScheduleAssignment;
  onRemove: (assignmentId: string) => Promise<void>;
  onResize: (
    assignmentId: string,
    direction: "left" | "right",
    dateStr: string,
  ) => Promise<void>;
  compact?: boolean;
  spanDays?: number;
  osFormRefs?: OSFormRefs;
}) {
  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData("serviceOrderId", assignment.serviceOrderId ?? "");
    e.dataTransfer.setData("assignmentId", assignment.id);
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.style.opacity = "0.4";
  }

  function handleDragEnd(e: DragEvent<HTMLDivElement>) {
    e.currentTarget.style.opacity = "1";
  }

  function handleExtendRight(e: React.MouseEvent) {
    e.stopPropagation();
    const currentEndDate = assignment.endDate
      ? new Date(assignment.endDate)
      : new Date(assignment.date);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + 1);
    newEndDate.setUTCHours(0, 0, 0, 0);

    onResize(assignment.id, "right", newEndDate.toISOString().slice(0, 10));
  }

  function handleShrinkEndDate(e: React.MouseEvent) {
    e.stopPropagation();
    if (spanDays <= 1) return;

    if (spanDays === 2) {
      // Going back to single day — clear endDate
      onResize(assignment.id, "right", "");
    } else {
      // Reduce endDate by 1 day
      const currentEndDate = new Date(assignment.endDate!);
      const newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() - 1);
      newEndDate.setUTCHours(0, 0, 0, 0);
      onResize(assignment.id, "right", newEndDate.toISOString().slice(0, 10));
    }
  }

  if (!assignment.serviceOrder) return null;

  const orderData = assignment.serviceOrder;
  const typeConfig = {
    GENERAL: { icon: Wrench, color: "text-blue-400", bg: "bg-blue-600/20" },
    ALARM: { icon: Paintbrush, color: "text-amber-400", bg: "bg-amber-600/20" },
    LED: { icon: HardHat, color: "text-emerald-400", bg: "bg-emerald-600/20" },
  };
  const config = typeConfig[orderData.type] || typeConfig.GENERAL;
  const Icon = config.icon;
  const storeName =
    orderData.stores[0]?.store.sigla ??
    orderData.stores[0]?.store.city ??
    orderData.name;

  const initialData = {
    id: orderData.id,
    name: orderData.name,
    status: orderData.status,
    priority: orderData.priority,
    type: orderData.type,
    date: assignment.date,
    endDate: assignment.endDate ?? null,
    scheduleAssignmentId: assignment.id,
    warranty: false,
    isObra: orderData.isObra ?? false,
    vehicleId: null,
    storeIds: orderData.stores.map((s) => s.store.id),
    serviceTypeIds:
      orderData.serviceTypes?.map((st) => st.serviceType.id) ?? [],
    teamIds: orderData.teamIds ?? [],
    materialIds: [],
  };

  return (
    <div className="group/card relative w-full">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="cursor-grab active:cursor-grabbing w-full"
      >
        <Card
          className={`border-zinc-700/60 bg-zinc-800/80 hover:border-zinc-600 transition-colors w-full ${spanDays > 1 ? "border-sky-700/40 bg-zinc-800/90" : ""}`}
        >
          {compact ? (
            <div className="px-1 py-0.5 flex items-center gap-0.5 h-[18px] overflow-hidden">
              <span className="text-[9px] font-semibold text-zinc-100 truncate leading-none min-w-0 flex-1">
                {storeName}
              </span>
              {spanDays > 1 && (
                <span className="text-[8px] font-medium text-sky-400 leading-none shrink-0">
                  {spanDays}d
                </span>
              )}
              <span
                className={`text-[8px] font-medium ${config.color} leading-none shrink-0`}
              >
                #{orderData.orderNumber}
              </span>
              <div
                className="flex items-center shrink-0"
                draggable={false}
                onDragStart={(e) => e.stopPropagation()}
              >
                {osFormRefs && (
                  <OSFormDialog
                    trigger={
                      <button
                        draggable={false}
                        onClick={(e) => e.stopPropagation()}
                        className="p-0.5 hover:bg-zinc-700/50 rounded"
                        title="Editar OS"
                      >
                        <Pencil className="h-2.5 w-2.5 text-zinc-500 hover:text-zinc-200" />
                      </button>
                    }
                    refs={osFormRefs}
                    initialData={initialData}
                  />
                )}
                <button
                  draggable={false}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(assignment.id);
                  }}
                  className="p-0.5 hover:bg-red-600/20 rounded"
                  title="Remover"
                >
                  <X className="h-2.5 w-2.5 text-red-400 hover:text-red-300" />
                </button>
              </div>
            </div>
          ) : (
            <CardContent className="p-1.5 overflow-hidden">
              <div className="flex items-center gap-1 overflow-hidden">
                <span className="text-[11px] font-semibold text-zinc-100 truncate min-w-0 flex-1">
                  {storeName}
                </span>
                <div
                  className="flex items-center gap-0.5 shrink-0"
                  draggable={false}
                  onDragStart={(e) => e.stopPropagation()}
                >
                  {spanDays > 1 && (
                    <span className="text-[9px] font-medium text-sky-400 px-1 bg-sky-600/20 rounded">
                      {spanDays}d
                    </span>
                  )}
                  <span className={`text-[9px] font-medium ${config.color}`}>
                    #{orderData.orderNumber}
                  </span>
                  {osFormRefs && (
                    <OSFormDialog
                      trigger={
                        <button
                          draggable={false}
                          onClick={(e) => e.stopPropagation()}
                          className="p-0.5 hover:bg-zinc-700/50 rounded"
                          title="Editar OS"
                        >
                          <Pencil className="h-3 w-3 text-zinc-500 hover:text-zinc-200" />
                        </button>
                      }
                      refs={osFormRefs}
                      initialData={initialData}
                    />
                  )}
                  <button
                    draggable={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(assignment.id);
                    }}
                    className="p-0.5 hover:bg-red-600/20 rounded"
                    title="Remover"
                  >
                    <X className="h-3 w-3 text-red-400 hover:text-red-300" />
                  </button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Extend right (+1 day) */}
      <button
        onClick={handleExtendRight}
        className="absolute right-0 top-0 bottom-0 w-4 opacity-0 group-hover/card:opacity-100 hover:bg-blue-500/20 z-20 flex items-center justify-center transition-opacity"
        title="+1 dia"
      >
        <ChevronRight className="h-3 w-3 text-blue-400" />
      </button>
      {/* Shrink from right (-1 day / clear endDate) */}
      {spanDays > 1 && (
        <button
          onClick={handleShrinkEndDate}
          className="absolute left-0 top-0 bottom-0 w-4 opacity-0 group-hover/card:opacity-100 hover:bg-red-500/20 z-20 flex items-center justify-center transition-opacity"
          title={spanDays === 2 ? "Remover data fim" : "-1 dia"}
        >
          <ChevronLeft className="h-3 w-3 text-red-400" />
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Schedule Cell (Team × Day intersection)
// ──────────────────────────────────────────────

function ScheduleCell({
  team,
  date,
  assignments,
  onDrop,
  onRemove,
  onResize,
  compactView = false,
  osFormRefs,
}: {
  team: Team;
  date: Date;
  assignments: ScheduleAssignment[];
  onDrop: (
    teamId: string,
    date: string,
    serviceOrderId: string,
    assignmentId?: string,
  ) => Promise<void>;
  onRemove: (assignmentId: string) => Promise<void>;
  onResize: (
    assignmentId: string,
    direction: "left" | "right",
    dateStr: string,
  ) => Promise<void>;
  compactView?: boolean;
  osFormRefs?: OSFormRefs;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dateStr = date.toISOString().slice(0, 10);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);

    const serviceOrderId = e.dataTransfer.getData("serviceOrderId");
    const assignmentId = e.dataTransfer.getData("assignmentId");
    if (!serviceOrderId) return;

    await onDrop(team.id, dateStr, serviceOrderId, assignmentId || undefined);
  }

  const hasCards = assignments.some((a) => a.serviceOrder);

  return (
    <div
      className={`schedule-cell relative border border-zinc-800 rounded transition-colors overflow-hidden h-full ${
        compactView ? "min-h-8 p-0.5" : "min-h-20 p-1"
      } ${isDragOver ? "ring-2 ring-sky-400 bg-sky-400/10" : "bg-zinc-900/50"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`grid ${compactView ? "gap-0.5" : "gap-1"} w-full`}>
        {assignments
          .filter((a) => a.serviceOrder && a.date.slice(0, 10) === dateStr)
          .map((a) => {
            const spanDays = a.endDate
              ? getDaysBetween(a.date, a.endDate) + 1
              : 1;
            return (
              <DraggableCellCard
                key={a.id}
                assignment={a}
                onRemove={onRemove}
                onResize={onResize}
                compact={compactView}
                spanDays={spanDays}
                osFormRefs={osFormRefs}
              />
            );
          })}
      </div>
      {isDragOver && (
        <div
          className={`flex items-center justify-center ${
            hasCards
              ? compactView
                ? "py-0.5"
                : "py-1"
              : compactView
                ? "h-full min-h-10"
                : "h-full min-h-15"
          }`}
        >
          <span
            className={`text-sky-400 font-medium animate-pulse ${compactView ? "text-[10px]" : "text-xs"}`}
          >
            Soltar aqui
          </span>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Schedule View
// ──────────────────────────────────────────────

export function ScheduleViewNew({
  teams,
  assignments,
  serviceOrders,
  employees,
  vehicles,
  scheduledOrderIds = [],
  stores = [],
  serviceTypes = [],
  materials = [],
}: Props) {
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [compactView, setCompactView] = useState(true);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const weekDates = getWeekDates(currentWeek);
  const monday = weekDates[0];
  const weekLabel = formatWeekLabel(monday);

  const teamFormRefs = { employees, vehicles };

  const osFormRefsShared: OSFormRefs = {
    stores: stores.map((s) => ({
      ...s,
      kmRoundTrip: null,
      tollRoundTrip: null,
      storeNumber: null,
    })),
    employees,
    vehicles,
    serviceTypes,
    materials,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      memberNames: t.members.map((m) => m.employeeName),
    })),
  };

  // Build a map: teamId -> date -> assignment[]
  const assignmentMap = new Map<string, Map<string, ScheduleAssignment[]>>();
  for (const assignment of assignments) {
    const dateKey = assignment.date.slice(0, 10);
    if (!assignmentMap.has(assignment.teamId)) {
      assignmentMap.set(assignment.teamId, new Map());
    }
    const teamMap = assignmentMap.get(assignment.teamId)!;
    if (!teamMap.has(dateKey)) {
      teamMap.set(dateKey, []);
    }
    teamMap.get(dateKey)!.push(assignment);
  }

  // Ctrl+Z handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStack]);

  async function handleUndo() {
    if (undoStack.length === 0) {
      toast.error("Nada para desfazer");
      return;
    }

    const action = undoStack[undoStack.length - 1];
    try {
      if (action.type === "create") {
        // Undo create = delete
        await fetch(`/api/team-schedule/${action.assignmentId}`, {
          method: "DELETE",
        });
        toast.success("Criação desfeita");
      } else if (action.type === "delete") {
        // Undo delete = recreate (not implemented - would need to store full assignment)
        toast.error("Não é possível desfazer exclusão");
        return;
      } else if (action.type === "move" || action.type === "resize") {
        // Undo move/resize = restore previous state
        if (!action.previousState) return;
        const dateObj = new Date(action.previousState.date);
        dateObj.setUTCHours(0, 0, 0, 0);

        const endDateObj = action.previousState.endDate
          ? new Date(action.previousState.endDate)
          : null;
        if (endDateObj) endDateObj.setUTCHours(0, 0, 0, 0);

        await fetch(`/api/team-schedule/${action.assignmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId: action.previousState.teamId,
            date: dateObj.toISOString(),
            endDate: endDateObj?.toISOString() ?? null,
          }),
        });
        toast.success(
          action.type === "move"
            ? "Movimentação desfeita"
            : "Redimensionamento desfeito",
        );
      }

      setUndoStack((prev) => prev.slice(0, -1));
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao desfazer");
    }
  }

  async function handleDrop(
    teamId: string,
    date: string,
    serviceOrderId: string,
    assignmentId?: string,
  ) {
    try {
      const dateObj = new Date(date);
      dateObj.setUTCHours(0, 0, 0, 0);

      if (assignmentId) {
        // Moving an existing assignment - record previous state
        const existingAssignment = assignments.find(
          (a) => a.id === assignmentId,
        );
        if (existingAssignment) {
          const previousState = {
            teamId: existingAssignment.teamId,
            date: existingAssignment.date,
            endDate: existingAssignment.endDate ?? null,
          };

          const response = await fetch(`/api/team-schedule/${assignmentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              teamId,
              date: dateObj.toISOString(),
            }),
          });
          if (!response.ok) throw new Error("Failed to move assignment");

          setUndoStack((prev) => [
            ...prev,
            {
              type: "move",
              assignmentId,
              previousState,
              currentState: {
                teamId,
                date,
                endDate: existingAssignment.endDate ?? null,
              },
            },
          ]);
          toast.success("Atribuição movida");
        }
      } else {
        // New assignment from the pool
        const response = await fetch("/api/team-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId,
            date: dateObj.toISOString(),
            serviceOrderId,
          }),
        });
        if (!response.ok) throw new Error("Failed to assign service order");

        const newAssignment = await response.json();
        setUndoStack((prev) => [
          ...prev,
          { type: "create", assignmentId: newAssignment.id },
        ]);
        toast.success("Ordem de serviço atribuída");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atribuir ordem de serviço");
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    try {
      const response = await fetch(`/api/team-schedule/${assignmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove assignment");

      setUndoStack((prev) => [...prev, { type: "delete", assignmentId }]);
      toast.success("Atribuição removida");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover atribuição");
    }
  }

  async function handleResize(
    assignmentId: string,
    direction: "left" | "right",
    dateStr: string,
  ) {
    try {
      const existingAssignment = assignments.find((a) => a.id === assignmentId);
      if (!existingAssignment) return;

      const previousState = {
        teamId: existingAssignment.teamId,
        date: existingAssignment.date,
        endDate: existingAssignment.endDate ?? null,
      };

      let updatePayload: any = {};

      if (direction === "right") {
        if (dateStr) {
          // Set or update endDate
          const newDateObj = new Date(dateStr);
          newDateObj.setUTCHours(0, 0, 0, 0);
          updatePayload.endDate = newDateObj.toISOString();
        } else {
          // Clear endDate (back to single day)
          updatePayload.endDate = null;
        }
      } else {
        // Adjust start date
        const newDateObj = new Date(dateStr);
        newDateObj.setUTCHours(0, 0, 0, 0);
        updatePayload.date = newDateObj.toISOString();
      }

      const response = await fetch(`/api/team-schedule/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("API Error - Status:", response.status, "Body:", text);
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = { error: text || response.statusText };
        }
        throw new Error(
          `Failed to resize assignment: ${errorData.error || response.statusText}`,
        );
      }

      setUndoStack((prev) => [
        ...prev,
        {
          type: "resize",
          assignmentId,
          previousState,
          currentState: {
            teamId: existingAssignment.teamId,
            date: direction === "left" ? dateStr : existingAssignment.date,
            endDate:
              direction === "right"
                ? dateStr || null
                : (existingAssignment.endDate ?? null),
          },
        },
      ]);

      toast.success("Duração ajustada");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao ajustar duração");
    }
  }

  function goToPreviousWeek() {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeek(newWeek);
  }

  function goToNextWeek() {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeek(newWeek);
  }

  function goToToday() {
    setCurrentWeek(new Date());
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            <CalendarDays className="h-4 w-4 mr-1" />
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="flex items-center gap-1.5"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
            <span className="text-xs">Desfazer ({undoStack.length})</span>
          </Button>
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">{weekLabel}</h2>
        <div className="flex items-center gap-2">
          <OSFormDialog
            trigger={
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nova OS
              </Button>
            }
            refs={osFormRefsShared}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompactView(!compactView)}
            className="flex items-center gap-1.5"
            title={
              compactView ? "Visualização expandida" : "Visualização compacta"
            }
          >
            {compactView ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
            <span className="text-xs">
              {compactView ? "Expandir" : "Compacto"}
            </span>
          </Button>
        </div>
      </div>

      {/* Grid: Teams (rows) × Days (columns) */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header Row: Day labels */}
          <div
            className={`grid grid-cols-8 ${compactView ? "gap-0.5 mb-0.5" : "gap-2 mb-2"}`}
          >
            <div
              className={`text-xs font-medium text-zinc-500 ${compactView ? "p-0.5" : "p-2"}`}
            >
              Equipe
            </div>
            {weekDates.map((date, idx) => {
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={idx}
                  className={`text-center ${compactView ? "p-0.5" : "p-2"} rounded ${
                    isToday ? "bg-sky-600/20" : ""
                  }`}
                >
                  <div
                    className={`text-xs font-medium ${isWeekend ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    {dayLabels[(idx + 1) % 7]}
                  </div>
                  <div
                    className={`text-xs ${isWeekend ? "text-zinc-600" : "text-zinc-500"}`}
                  >
                    {date.getDate()}/{date.getMonth() + 1}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Team Rows */}
          {teams
            .filter((t) => t.members && t.members.length > 0)
            .map((team) => {
              const teamAssignments = assignmentMap.get(team.id);

              // Collect multi-day assignments for this team
              const multiDayAssignments: ScheduleAssignment[] = [];
              if (teamAssignments) {
                for (const dateAssignments of teamAssignments.values()) {
                  for (const a of dateAssignments) {
                    if (
                      a.endDate &&
                      a.endDate.slice(0, 10) !== a.date.slice(0, 10)
                    ) {
                      multiDayAssignments.push(a);
                    }
                  }
                }
              }
              const multiDayIds = new Set(multiDayAssignments.map((a) => a.id));

              return (
                <div
                  key={team.id}
                  className={`grid grid-cols-8 ${compactView ? "gap-0.5 mb-0.5" : "gap-2 mb-2"}`}
                >
                  {/* Team Info Column */}
                  <div
                    style={{ gridColumn: 1, gridRow: 1 }}
                    className={`flex flex-col justify-center border border-zinc-800 rounded bg-zinc-900/50 ${compactView ? "gap-0 p-0.5" : "gap-1.5 p-2"}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`font-semibold text-zinc-100 ${compactView ? "text-[9px] leading-none" : "text-sm"}`}
                      >
                        {team.name}
                      </span>
                      {!compactView && (
                        <PersistentTeamForm
                          trigger={
                            <button
                              className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                              title="Editar equipe"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          }
                          refs={teamFormRefs}
                          initialData={{
                            id: team.id,
                            name: team.name,
                            driverId: team.driverId,
                            vehicleId: team.vehicleId,
                            isActive: team.isActive,
                            memberIds: team.memberIds,
                          }}
                        />
                      )}
                    </div>
                    {!compactView && (
                      <>
                        <div className="flex flex-wrap gap-0.5">
                          {team.members.map((m) => (
                            <span
                              key={m.employeeId}
                              className={`text-[10px] rounded px-1 py-0.5 ${
                                m.isLeader
                                  ? "bg-amber-600/20 text-amber-300 font-semibold"
                                  : "bg-violet-600/20 text-violet-400"
                              }`}
                            >
                              {m.isLeader && "👑 "}
                              {m.employeeName}
                            </span>
                          ))}
                        </div>
                        {team.driverName && (
                          <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                            <User className="h-2.5 w-2.5" />
                            <span>{team.driverName}</span>
                          </div>
                        )}
                        {team.vehicleName && (
                          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <Car className="h-2.5 w-2.5" />
                            <span>{team.vehicleName}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Day Columns - explicitly positioned so multi-day overlays work */}
                  {weekDates.map((date, idx) => {
                    const dateKey = date.toISOString().slice(0, 10);
                    const cellAssignments = (
                      teamAssignments?.get(dateKey) ?? []
                    ).filter((a) => !multiDayIds.has(a.id));
                    return (
                      <div
                        key={idx}
                        style={{ gridColumn: idx + 2, gridRow: 1 }}
                      >
                        <ScheduleCell
                          team={team}
                          date={date}
                          assignments={cellAssignments}
                          onDrop={handleDrop}
                          onRemove={handleRemoveAssignment}
                          onResize={handleResize}
                          compactView={compactView}
                          osFormRefs={osFormRefsShared}
                        />
                      </div>
                    );
                  })}

                  {/* Multi-day assignments spanning across day columns */}
                  {multiDayAssignments.map((a) => {
                    const startDateStr = a.date.slice(0, 10);
                    const endDateStr = (a.endDate ?? a.date).slice(0, 10);

                    let startIdx = weekDates.findIndex(
                      (d) => d.toISOString().slice(0, 10) === startDateStr,
                    );
                    let endIdx = weekDates.findIndex(
                      (d) => d.toISOString().slice(0, 10) === endDateStr,
                    );

                    // Clip to visible week
                    if (startIdx === -1) startIdx = 0;
                    if (endIdx === -1) endIdx = 6;

                    // Grid columns: col 1 = team info, cols 2-8 = days
                    // Grid lines: 1|col1|2|col2|3|col3|4|...|8|col8|9
                    const gridColStart = startIdx + 2;
                    const gridColEnd = endIdx + 3;
                    const spanDays = endIdx - startIdx + 1;

                    return (
                      <div
                        key={`span-${a.id}`}
                        style={{
                          gridColumn: `${gridColStart} / ${gridColEnd}`,
                          gridRow: 1,
                        }}
                        className="relative z-10 self-start"
                      >
                        <DraggableCellCard
                          assignment={a}
                          onRemove={handleRemoveAssignment}
                          onResize={handleResize}
                          compact={compactView}
                          spanDays={spanDays}
                          osFormRefs={osFormRefsShared}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

          {/* Unassigned Row - Service Orders with dates but no team */}
          {(() => {
            // Check if there are any unassigned service orders in this week
            const hasAnyUnassigned = weekDates.some((date) => {
              const dateKey = date.toISOString().slice(0, 10);
              return serviceOrders.some((os) => {
                if (!os.date) return false;
                const osDate = new Date(os.date).toISOString().slice(0, 10);
                if (osDate !== dateKey) return false;
                return !assignments.some((a) => a.serviceOrderId === os.id);
              });
            });

            if (!hasAnyUnassigned) return null;

            return (
              <div
                className={`grid grid-cols-8 ${compactView ? "gap-0.5 mb-0.5" : "gap-2 mb-2"} border-t border-dashed border-zinc-700/50 pt-2 mt-2`}
              >
                <div
                  className={`flex items-center ${compactView ? "px-1 py-0.5" : "px-3 py-2"} bg-zinc-900/50 rounded`}
                >
                  <span
                    className={`font-semibold text-zinc-500 italic ${compactView ? "text-[10px]" : "text-sm"}`}
                  >
                    Sem Equipe
                  </span>
                </div>
                {weekDates.map((date, idx) => {
                  const dateKey = date.toISOString().slice(0, 10);
                  const unassignedForDate = serviceOrders.filter((os) => {
                    if (!os.date) return false;
                    const osDate = new Date(os.date).toISOString().slice(0, 10);
                    if (osDate !== dateKey) return false;
                    return !assignments.some((a) => a.serviceOrderId === os.id);
                  });

                  return (
                    <div
                      key={idx}
                      className={`rounded border border-dashed border-zinc-700/30 bg-zinc-900/30 overflow-hidden ${
                        compactView
                          ? "min-h-5 p-0.5 space-y-0.5"
                          : "min-h-14 p-1 space-y-1"
                      }`}
                    >
                      {unassignedForDate.map((os) => (
                        <div
                          key={os.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("serviceOrderId", os.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.currentTarget.style.opacity = "0.4";
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                          className="cursor-grab active:cursor-grabbing w-full overflow-hidden"
                        >
                          <ServiceOrderCard order={os} compact={compactView} />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Unscheduled Service Orders - Draggable cards */}
      <div className="border-t border-zinc-800 pt-4 mt-6">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Ordens de Serviço Disponíveis
          </h3>
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                placeholder="Buscar OS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm bg-zinc-900 border-zinc-700"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {serviceOrders
            .filter((os) => {
              // Filter out if assigned to ANY date in current assignments
              const isAssigned = assignments.some(
                (a) => a.serviceOrderId === os.id,
              );
              if (isAssigned) return false;

              // Filter by status
              if (os.status !== "NOT_STARTED" && os.status !== "IN_PROGRESS")
                return false;

              // Filter by search query
              if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesOrderNumber = os.orderNumber
                  .toString()
                  .includes(query);
                const matchesName = os.name.toLowerCase().includes(query);
                const matchesStore = os.stores.some(
                  (s) =>
                    s.store.sigla.toLowerCase().includes(query) ||
                    s.store.city.toLowerCase().includes(query),
                );
                const matchesService = os.serviceTypes?.some((st) =>
                  st.serviceType.name.toLowerCase().includes(query),
                );
                return (
                  matchesOrderNumber ||
                  matchesName ||
                  matchesStore ||
                  matchesService
                );
              }

              return true;
            })
            .map((os) => (
              <div
                key={os.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("serviceOrderId", os.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.currentTarget.style.opacity = "0.4";
                }}
                onDragEnd={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                className="cursor-grab active:cursor-grabbing group/available-card relative"
              >
                <ServiceOrderCard order={os} />
                <OSFormDialog
                  trigger={
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-1 right-1 p-1 opacity-0 group-hover/available-card:opacity-100 hover:bg-zinc-700/50 rounded transition-opacity z-10"
                      title="Editar OS"
                    >
                      <Pencil className="h-3 w-3 text-zinc-400 hover:text-zinc-200" />
                    </button>
                  }
                  refs={osFormRefsShared}
                  initialData={{
                    id: os.id,
                    name: os.name,
                    status: os.status,
                    priority: os.priority,
                    type: os.type,
                    date: os.date ?? null,
                    warranty: false,
                    isObra: os.isObra ?? false,
                    vehicleId: null,
                    storeIds: os.stores.map((s) => s.store.id),
                    serviceTypeIds:
                      os.serviceTypes?.map((st) => st.serviceType.id) ?? [],
                    teamIds: os.teamIds ?? [],
                    materialIds: [],
                  }}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
