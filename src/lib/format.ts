// ─── Shared Formatting Utilities ───────────────────────────────────────────
// Single source of truth for currency, number, and status formatting.
// Replaces duplicated definitions in page.tsx, os-list-client.tsx,
// os-detail-dialog.tsx, and [id]/page.tsx.

// ---------------------------------------------------------------------------
// Currency & Number
// ---------------------------------------------------------------------------

export function formatBRL(value: number | null | undefined): string {
  if (value == null || value === 0) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Non-currency number with pt-BR grouping. Returns "—" for null/undefined. */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR");
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "RETURN_VISIT"
  | "MEASUREMENT"
  | "PAID"
  | "REWORK";

export const statusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  NOT_STARTED: {
    label: "Não iniciada",
    className: "bg-zinc-700 text-zinc-200 hover:bg-zinc-700",
  },
  IN_PROGRESS: {
    label: "Em andamento",
    className: "bg-blue-600/20 text-blue-400 hover:bg-blue-600/20",
  },
  RETURN_VISIT: {
    label: "Retorno",
    className: "bg-pink-600/20 text-pink-400 hover:bg-pink-600/20",
  },
  MEASUREMENT: {
    label: "Medição",
    className: "bg-green-600/20 text-green-400 hover:bg-green-600/20",
  },
  PAID: {
    label: "Pago",
    className: "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20",
  },
  REWORK: {
    label: "Retrabalho",
    className: "bg-red-600/20 text-red-400 hover:bg-red-600/20",
  },
};

/** Kanban column config for the OS list board view */
export const kanbanColumnConfig: {
  status: OrderStatus;
  label: string;
  color: string;
  headerBg: string;
}[] = [
  { status: "NOT_STARTED", label: "Não iniciada", color: "text-zinc-300", headerBg: "bg-zinc-700" },
  { status: "IN_PROGRESS", label: "Em andamento", color: "text-blue-400", headerBg: "bg-blue-600" },
  { status: "RETURN_VISIT", label: "Retorno", color: "text-pink-400", headerBg: "bg-pink-600" },
  { status: "MEASUREMENT", label: "Medição", color: "text-green-400", headerBg: "bg-green-600" },
  { status: "PAID", label: "Pago", color: "text-emerald-400", headerBg: "bg-emerald-600" },
  { status: "REWORK", label: "Retrabalho", color: "text-red-400", headerBg: "bg-red-600" },
];

export const statusOptions: OrderStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "RETURN_VISIT",
  "MEASUREMENT",
  "PAID",
  "REWORK",
];

// ---------------------------------------------------------------------------
// Type labels
// ---------------------------------------------------------------------------

export const typeLabels: Record<string, string> = {
  GENERAL: "Geral",
  ALARM: "Alarme",
  LED: "LED",
};

// ---------------------------------------------------------------------------
// Auto-calculation helpers (for OS form)
// ---------------------------------------------------------------------------

/** Default KM price (R$/km) */
export const DEFAULT_KM_PRICE = 1.6;

/** Default price per man-hour (R$/h) */
export const DEFAULT_HOUR_PRICE = 48;

/** Default hours per workday */
export const DEFAULT_HOURS_PER_DAY = 8;

/**
 * Compute transport cost from selected stores.
 * transportCost = Σ(store.kmRoundTrip × pricePerKm) + Σ(store.tollRoundTrip)
 */
export function calcTransportCost(
  stores: { kmRoundTrip?: number | null; tollRoundTrip?: number | null }[],
  pricePerKm = DEFAULT_KM_PRICE,
): number {
  return stores.reduce((acc, s) => {
    const km = (s.kmRoundTrip ?? 0) * pricePerKm;
    const toll = s.tollRoundTrip ?? 0;
    return acc + km + toll;
  }, 0);
}

/**
 * Compute default labor cost from employee count.
 * laborCost = count × hoursPerDay × pricePerHour
 */
export function calcLaborCost(
  employeeCount: number,
  hoursPerDay = DEFAULT_HOURS_PER_DAY,
  pricePerHour = DEFAULT_HOUR_PRICE,
): number {
  return employeeCount * hoursPerDay * pricePerHour;
}

/**
 * Compute total cost from all components.
 */
export function calcTotalCost(components: {
  laborCost?: number;
  materialCost?: number;
  transportCost?: number;
  mealAllowance?: number;
  overnightAllowance?: number;
  tollDiscount?: number;
  parking?: number;
}): number {
  return (
    (components.laborCost ?? 0) +
    (components.materialCost ?? 0) +
    (components.transportCost ?? 0) +
    (components.mealAllowance ?? 0) +
    (components.overnightAllowance ?? 0) +
    (components.tollDiscount ?? 0) +
    (components.parking ?? 0)
  );
}
