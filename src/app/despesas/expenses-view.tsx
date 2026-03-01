"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface EmployeeRef {
  id: string;
  shortName: string;
}

interface ExpenseRow {
  id?: string; // undefined = new row
  employeeId: string;
  date: string; // ISO string
  city: string;
  cafe: number;
  almoco: number;
  jantar: number;
  hotel: number;
  combustivel: number;
  pedagio: number;
  estacionamento: number;
  reembolso: number;
  uberTaxi: number;
}

const EXPENSE_FIELDS = [
  { key: "city", label: "LOCAL", width: "w-24", align: "text-left", type: "text" },
  { key: "cafe", label: "CAFÉ", width: "w-16", align: "text-right", type: "number" },
  { key: "almoco", label: "ALM.", width: "w-16", align: "text-right", type: "number" },
  { key: "jantar", label: "JANTAR", width: "w-16", align: "text-right", type: "number" },
  { key: "hotel", label: "HOTEL", width: "w-16", align: "text-right", type: "number" },
  { key: "combustivel", label: "COMB.", width: "w-16", align: "text-right", type: "number" },
  { key: "pedagio", label: "PEDÁGIO", width: "w-16", align: "text-right", type: "number" },
  { key: "estacionamento", label: "ESTAC.", width: "w-16", align: "text-right", type: "number" },
  { key: "reembolso", label: "REEMB.", width: "w-16", align: "text-right", type: "number" },
  { key: "uberTaxi", label: "UBER", width: "w-16", align: "text-right", type: "number" },
] as const;

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatWeekLabel(monday: Date): string {
  const d = String(monday.getDate()).padStart(2, "0");
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  return `Semana de ${d}/${m}/${monday.getFullYear()}`;
}

function rowTotal(row: ExpenseRow): number {
  return (
    row.cafe + row.almoco + row.jantar + row.hotel +
    row.combustivel + row.pedagio + row.estacionamento +
    row.reembolso + row.uberTaxi
  );
}

function emptyRow(employeeId: string, dateISO: string): ExpenseRow {
  return {
    employeeId,
    date: dateISO,
    city: "",
    cafe: 0,
    almoco: 0,
    jantar: 0,
    hotel: 0,
    combustivel: 0,
    pedagio: 0,
    estacionamento: 0,
    reembolso: 0,
    uberTaxi: 0,
  };
}

// ──────────────────────────────────────────────
// Inline Cell
// ──────────────────────────────────────────────

function InlineCell({
  value,
  type,
  align,
  onSave,
}: {
  value: string | number;
  type: "text" | "number";
  align: string;
  onSave: (val: string | number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleBlur() {
    setEditing(false);
    const trimmed = localVal.trim();
    if (type === "number") {
      const parsed = parseFloat(trimmed.replace(",", ".")) || 0;
      if (parsed !== value) onSave(parsed);
    } else {
      if (trimmed !== value) onSave(trimmed);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Tab") {
      // Let default tab behavior work
      handleBlur();
    }
    if (e.key === "Escape") {
      setLocalVal(String(value));
      setEditing(false);
    }
  }

  const displayVal = type === "number"
    ? (value === 0 ? "" : Number(value).toFixed(2).replace(".", ","))
    : value;

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type === "number" ? "text" : "text"}
        inputMode={type === "number" ? "decimal" : "text"}
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full bg-zinc-700 border border-sky-500/50 rounded px-1.5 py-0.5 text-xs text-zinc-100 outline-none ${align}`}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`block w-full cursor-text px-1.5 py-0.5 text-xs rounded hover:bg-zinc-700/50 transition-colors ${align} ${
        displayVal ? "text-zinc-300" : "text-zinc-600"
      }`}
    >
      {displayVal || (type === "number" ? "—" : "·")}
    </span>
  );
}

// ──────────────────────────────────────────────
// Main View
// ──────────────────────────────────────────────

export function ExpensesView({ employees }: { employees: EmployeeRef[] }) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [data, setData] = useState<Map<string, ExpenseRow>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(new Set<string>());

  const monday = getMondayOfWeek(currentDate);
  const weekDates = getWeekDates(monday);
  const mondayKey = toDateKey(monday);

  // Fetch data for current week
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/despesas?weekStart=${mondayKey}`);
      const json = await res.json();
      const map = new Map<string, ExpenseRow>();

      if (json.data) {
        for (const exp of json.data) {
          const dateKey = exp.date.slice(0, 10);
          const key = `${exp.employeeId}__${dateKey}`;
          map.set(key, {
            id: exp.id,
            employeeId: exp.employeeId,
            date: exp.date,
            city: exp.city ?? "",
            cafe: exp.cafe,
            almoco: exp.almoco,
            jantar: exp.jantar,
            hotel: exp.hotel,
            combustivel: exp.combustivel,
            pedagio: exp.pedagio,
            estacionamento: exp.estacionamento,
            reembolso: exp.reembolso,
            uberTaxi: exp.uberTaxi,
          });
        }
      }

      setData(map);
      setDirty(new Set());
    } catch {
      toast.error("Erro ao carregar despesas");
    } finally {
      setLoading(false);
    }
  }, [mondayKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getRow(employeeId: string, date: Date): ExpenseRow {
    const dateKey = toDateKey(date);
    const key = `${employeeId}__${dateKey}`;
    return data.get(key) ?? emptyRow(employeeId, date.toISOString());
  }

  function updateCell(employeeId: string, date: Date, field: string, value: string | number) {
    const dateKey = toDateKey(date);
    const key = `${employeeId}__${dateKey}`;
    const existing = data.get(key) ?? emptyRow(employeeId, date.toISOString());
    const updated = { ...existing, [field]: value };

    setData((prev) => {
      const next = new Map(prev);
      next.set(key, updated);
      return next;
    });
    setDirty((prev) => new Set(prev).add(key));
  }

  async function saveAll() {
    if (dirty.size === 0) return;
    setSaving(true);
    let saved = 0;
    let errors = 0;

    for (const key of dirty) {
      const row = data.get(key);
      if (!row) continue;

      // Skip completely empty rows
      const total = rowTotal(row);
      if (total === 0 && !row.city && !row.id) continue;

      try {
        const dateKey = key.split("__")[1];
        const payload = {
          employeeId: row.employeeId,
          date: dateKey + "T12:00:00.000Z",
          city: row.city || null,
          cafe: row.cafe,
          almoco: row.almoco,
          jantar: row.jantar,
          hotel: row.hotel,
          combustivel: row.combustivel,
          pedagio: row.pedagio,
          estacionamento: row.estacionamento,
          reembolso: row.reembolso,
          uberTaxi: row.uberTaxi,
        };

        const res = await fetch("/api/despesas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          saved++;
          const result = await res.json();
          // Update with server ID
          setData((prev) => {
            const next = new Map(prev);
            const existing = next.get(key);
            if (existing) {
              next.set(key, { ...existing, id: result.id });
            }
            return next;
          });
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    setDirty(new Set());
    setSaving(false);

    if (errors > 0) {
      toast.error(`${errors} erro(s) ao salvar`);
    } else if (saved > 0) {
      toast.success(`${saved} despesa(s) salva(s)`);
    }
  }

  function navigateWeek(direction: number) {
    if (dirty.size > 0) {
      saveAll();
    }
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + direction * 7);
      return next;
    });
  }

  function goToToday() {
    if (dirty.size > 0) {
      saveAll();
    }
    setCurrentDate(new Date());
  }

  function handleExportPDF() {
    window.open(`/api/despesas/pdf?weekStart=${mondayKey}`, "_blank");
  }

  // Compute column totals
  function getColumnTotal(field: string): number {
    let total = 0;
    for (const emp of employees) {
      for (const date of weekDates) {
        const row = getRow(emp.id, date);
        total += (row as any)[field] ?? 0;
      }
    }
    return total;
  }

  // Compute employee week total
  function getEmployeeTotal(employeeId: string): number {
    let total = 0;
    for (const date of weekDates) {
      const row = getRow(employeeId, date);
      total += rowTotal(row);
    }
    return total;
  }

  // Grand total
  const grandTotal = employees.reduce((acc, emp) => acc + getEmployeeTotal(emp.id), 0);

  return (
    <>
      {/* Week navigation */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek(-1)}
            className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek(1)}
            className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold text-zinc-200">
          {formatWeekLabel(monday)}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
        >
          Hoje
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 gap-1.5"
        >
          <FileText className="h-3.5 w-3.5" />
          Exportar PDF
        </Button>
        {dirty.size > 0 && (
          <Button
            size="sm"
            onClick={saveAll}
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar ({dirty.size})
          </Button>
        )}
        {grandTotal > 0 && (
          <span className="text-sm font-medium text-zinc-400">
            Total: <span className="text-zinc-100">{formatBRL(grandTotal)}</span>
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
        </div>
      ) : (
        /* Spreadsheet grid — one table per employee */
        <div className="space-y-4">
          {employees.map((emp) => {
            const empTotal = getEmployeeTotal(emp.id);

            return (
              <Card key={emp.id} className="border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <CardHeader className="py-2.5 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-zinc-200">
                      {emp.shortName}
                    </CardTitle>
                    {empTotal > 0 && (
                      <span className="text-xs font-medium text-zinc-400">
                        Semana: <span className="text-orange-400">{formatBRL(empTotal)}</span>
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="sticky left-0 bg-zinc-900 text-zinc-500 font-medium text-left px-2 py-1.5 w-14">
                            DIA
                          </th>
                          {EXPENSE_FIELDS.map((f) => (
                            <th
                              key={f.key}
                              className={`text-zinc-500 font-medium px-1 py-1.5 ${f.width} ${f.align}`}
                            >
                              {f.label}
                            </th>
                          ))}
                          <th className="text-zinc-400 font-semibold px-2 py-1.5 w-20 text-right">
                            TOTAL
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekDates.map((date, dayIdx) => {
                          const row = getRow(emp.id, date);
                          const total = rowTotal(row);
                          const isWeekend = dayIdx >= 5;

                          return (
                            <tr
                              key={dayIdx}
                              className={`border-b border-zinc-800/50 ${
                                isWeekend ? "opacity-50" : ""
                              }`}
                            >
                              <td className="sticky left-0 bg-zinc-900 px-2 py-0.5 font-medium text-zinc-500">
                                {DAY_LABELS[dayIdx]}
                              </td>
                              {EXPENSE_FIELDS.map((f) => (
                                <td key={f.key} className={`px-0.5 py-0.5 ${f.width}`}>
                                  <InlineCell
                                    value={(row as any)[f.key]}
                                    type={f.type}
                                    align={f.align}
                                    onSave={(val) =>
                                      updateCell(emp.id, date, f.key, val)
                                    }
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-0.5 text-right font-medium text-zinc-300 w-20">
                                {total > 0 ? formatBRL(total) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Column totals */}
          {employees.length > 0 && (
            <Card className="border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="bg-zinc-800/50">
                        <td className="sticky left-0 bg-zinc-800/50 px-2 py-2 font-bold text-zinc-300 w-14">
                          TOTAL
                        </td>
                        {EXPENSE_FIELDS.map((f) => (
                          <td
                            key={f.key}
                            className={`px-1.5 py-2 font-bold text-zinc-200 ${f.width} ${f.align}`}
                          >
                            {f.type === "number"
                              ? (getColumnTotal(f.key) > 0
                                  ? formatBRL(getColumnTotal(f.key))
                                  : "—")
                              : ""}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-right font-bold text-orange-400 w-20">
                          {formatBRL(grandTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
