"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { includesNormalized } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface StoreData {
  id: string;
  code: string;
  sigla: string;
  city: string;
  state: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  tollCostGoing: number | null;
  tollCostReturn: number | null;
  tollRoundTrip: number | null;
}

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function DiagnosticSection({
  label,
  count,
  siglas,
  color,
  icon: Icon,
}: {
  label: string;
  count: number;
  siglas: string[];
  color: "red" | "amber" | "muted";
  icon: React.ElementType;
}) {
  const [expanded, setExpanded] = useState(false);

  if (count === 0) return null;

  const colorMap = {
    red: {
      text: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      icon: "text-red-400",
    },
    amber: {
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      icon: "text-amber-400",
    },
    muted: {
      text: "text-zinc-400",
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/20",
      icon: "text-zinc-400",
    },
  };

  const c = colorMap[color];

  return (
    <div className={`rounded-md border ${c.border} ${c.bg} p-3`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Icon className={`h-4 w-4 ${c.icon} shrink-0`} />
        <span className={`text-sm font-medium ${c.text}`}>
          {count} {label}
        </span>
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-zinc-500 ml-auto" />
        ) : (
          <ChevronRight className="h-3 w-3 text-zinc-500 ml-auto" />
        )}
      </button>
      {expanded && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {siglas.map((s) => (
            <span
              key={s}
              className={`text-xs px-1.5 py-0.5 rounded ${c.bg} ${c.text} border ${c.border}`}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function TollUpdateClient({ stores }: { stores: StoreData[] }) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"missing" | "all" | null>(
    null,
  );
  const [batchSize, setBatchSize] = useState(75);
  const [result, setResult] = useState<{
    storesProcessed: number;
    storesUpdated: number;
    storesWithNoTolls?: number;
    errors?: string[];
  } | null>(null);

  // Diagnostics
  const storesWithoutCoords = stores.filter(
    (s) => s.latitude == null || s.longitude == null,
  );
  const storesWithCoords = stores.filter(
    (s) => s.latitude != null && s.longitude != null,
  );
  const storesWithoutTolls = storesWithCoords.filter(
    (s) => s.tollCostGoing == null,
  );
  const storesWithoutAddress = stores.filter(
    (s) => !s.address || s.address.trim() === "",
  );

  const filtered = stores.filter(
    (s) =>
      includesNormalized(s.city, search) ||
      includesNormalized(s.code, search) ||
      includesNormalized(s.sigla, search),
  );

  async function handleCalculate(mode: "missing" | "all") {
    setLoading(true);
    setLoadingMode(mode);
    setResult(null);
    try {
      const res = await fetch("/api/toll-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: batchSize,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      toast.success(
        `${data.storesUpdated} lojas atualizadas de ${data.storesProcessed} processadas`,
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao calcular pedágios");
    } finally {
      setLoading(false);
      setLoadingMode(null);
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Diagnostic Report */}
        {(storesWithoutCoords.length > 0 ||
          storesWithoutTolls.length > 0 ||
          storesWithoutAddress.length > 0) && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Diagnóstico de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DiagnosticSection
                label="sem coordenadas (não é possível calcular)"
                count={storesWithoutCoords.length}
                siglas={storesWithoutCoords.map((s) => s.sigla)}
                color="red"
                icon={MapPin}
              />
              <DiagnosticSection
                label="sem pedágio (calculável)"
                count={storesWithoutTolls.length}
                siglas={storesWithoutTolls.map((s) => s.sigla)}
                color="amber"
                icon={CircleDollarSign}
              />
              <DiagnosticSection
                label="sem endereço"
                count={storesWithoutAddress.length}
                siglas={storesWithoutAddress.map((s) => s.sigla)}
                color="muted"
                icon={Info}
              />
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <Card className="border-border bg-card">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {storesWithCoords.length} lojas com coordenadas &middot;{" "}
                  <span className="text-amber-400">
                    {storesWithoutTolls.length} sem pedágio
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Google Routes: 2 chamadas por loja (ida + volta)
                </p>
                {result && (
                  <p className="text-sm text-emerald-400 mt-1">
                    {result.storesUpdated} lojas atualizadas de{" "}
                    {result.storesProcessed} processadas.
                    {result.storesWithNoTolls != null &&
                      result.storesWithNoTolls > 0 && (
                        <span className="text-amber-400">
                          {" "}
                          {result.storesWithNoTolls} sem pedágio na rota.
                        </span>
                      )}
                  </p>
                )}
                {result?.errors && result.errors.length > 0 && (
                  <p className="text-sm text-amber-400 mt-1">
                    {result.errors.length} erros
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    Lojas:
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-zinc-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px]">
                        Número de lojas para processar por vez. Cada loja usa 2
                        chamadas da API (ida + volta).
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={150}
                    value={batchSize}
                    onChange={(e) =>
                      setBatchSize(Math.min(150, Math.max(1, +e.target.value)))
                    }
                    className="w-20 h-9 border-zinc-800 bg-zinc-900/50"
                  />
                </div>
                <Button
                  onClick={() => handleCalculate("missing")}
                  disabled={loading}
                  className="gap-2"
                >
                  {loadingMode === "missing" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CircleDollarSign className="h-4 w-4" />
                  )}
                  {loadingMode === "missing"
                    ? "Calculando..."
                    : "Calcular Faltantes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCalculate("all")}
                  disabled={loading}
                  className="gap-2"
                >
                  {loadingMode === "all" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {loadingMode === "all"
                    ? "Recalculando..."
                    : "Recalcular Todos"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Buscar por cidade, código ou sigla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-zinc-800 bg-zinc-900/50"
          />
        </div>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">
              {filtered.length} loja{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Sigla</TableHead>
                  <TableHead className="text-zinc-400">Cidade</TableHead>
                  <TableHead className="text-zinc-400">UF</TableHead>
                  <TableHead className="text-zinc-400">Coords</TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    Pedágio Ida
                  </TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    Pedágio Volta
                  </TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((store) => {
                  const total =
                    store.tollCostGoing != null || store.tollCostReturn != null
                      ? (store.tollCostGoing ?? 0) + (store.tollCostReturn ?? 0)
                      : store.tollRoundTrip;
                  const hasCoordIssue =
                    store.latitude == null || store.longitude == null;
                  const hasTollIssue =
                    !hasCoordIssue && store.tollCostGoing == null;
                  return (
                    <TableRow
                      key={store.id}
                      className="border-zinc-800 hover:bg-zinc-800/50"
                    >
                      <TableCell className="text-zinc-200 font-medium flex items-center gap-1.5">
                        {hasCoordIssue && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>Sem coordenadas</TooltipContent>
                          </Tooltip>
                        )}
                        {hasTollIssue && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CircleDollarSign className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>Sem pedágio</TooltipContent>
                          </Tooltip>
                        )}
                        {store.sigla}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {store.city}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {store.state}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-xs">
                        {store.latitude && store.longitude
                          ? `${store.latitude.toFixed(3)}, ${store.longitude.toFixed(3)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        {formatCurrency(store.tollCostGoing)}
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        {formatCurrency(store.tollCostReturn)}
                      </TableCell>
                      <TableCell className="text-right text-zinc-100 font-medium">
                        {formatCurrency(total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
