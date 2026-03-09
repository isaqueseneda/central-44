"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPreview } from "@/components/map-preview";
import { Check, X, CheckCheck, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface SuggestionItem {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  source: string | null;
}

interface StoreGroup {
  store: {
    id: string;
    code: string;
    sigla: string;
    city: string;
    state: string;
  };
  suggestions: SuggestionItem[];
}

const FIELD_LABELS: Record<string, string> = {
  address: "Endereço",
  phone: "Telefone",
  cep: "CEP",
  latitude: "Latitude",
  longitude: "Longitude",
  kmRoundTrip: "KM Ida/Volta",
  tollRoundTrip: "Pedágio Ida/Volta",
  tollCostGoing: "Pedágio Ida",
  tollCostReturn: "Pedágio Volta",
  storeNumber: "Nº da Loja",
};

const SOURCE_LABELS: Record<string, string> = {
  tollguru: "TollGuru",
  google_places: "Google Places",
  google_directions: "Google Directions",
  google_routes_toll: "Google Routes",
  estimated_from_distance: "Estimativa",
};

interface ReviewClientProps {
  groups: StoreGroup[];
}

export function ReviewClient({ groups: initialGroups }: ReviewClientProps) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkFieldLoading, setBulkFieldLoading] = useState<string | null>(null);

  // Count suggestions by field type across all groups
  const fieldCounts = useMemo(() => {
    const counts = new Map<string, { count: number; ids: string[] }>();
    for (const g of groups) {
      for (const s of g.suggestions) {
        const existing = counts.get(s.field) ?? { count: 0, ids: [] };
        existing.count++;
        existing.ids.push(s.id);
        counts.set(s.field, existing);
      }
    }
    return counts;
  }, [groups]);

  async function handleAction(id: string, status: "APPROVED" | "REJECTED") {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/data-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();

      // Remove from UI
      setGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            suggestions: g.suggestions.filter((s) => s.id !== id),
          }))
          .filter((g) => g.suggestions.length > 0),
      );

      toast.success(status === "APPROVED" ? "Aprovado" : "Rejeitado");
    } catch {
      toast.error("Erro ao processar sugestão");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleBulkAction(
    storeId: string,
    status: "APPROVED" | "REJECTED",
  ) {
    const group = groups.find((g) => g.store.id === storeId);
    if (!group) return;

    const ids = group.suggestions.map((s) => s.id);
    setBulkLoading(true);
    try {
      const res = await fetch("/api/data-suggestions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      if (!res.ok) throw new Error();

      setGroups((prev) => prev.filter((g) => g.store.id !== storeId));
      toast.success(
        `${ids.length} sugestões ${status === "APPROVED" ? "aprovadas" : "rejeitadas"}`,
      );
    } catch {
      toast.error("Erro ao processar sugestões em lote");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkFieldAction(
    field: string,
    status: "APPROVED" | "REJECTED",
  ) {
    const entry = fieldCounts.get(field);
    if (!entry) return;

    setBulkFieldLoading(field);
    try {
      const res = await fetch("/api/data-suggestions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: entry.ids, status }),
      });
      if (!res.ok) throw new Error();

      // Remove these suggestions from UI
      setGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            suggestions: g.suggestions.filter((s) => s.field !== field),
          }))
          .filter((g) => g.suggestions.length > 0),
      );
      toast.success(
        `${entry.count} ${FIELD_LABELS[field] ?? field} ${status === "APPROVED" ? "aprovados" : "rejeitados"}`,
      );
    } catch {
      toast.error("Erro ao processar sugestões em lote");
    } finally {
      setBulkFieldLoading(null);
    }
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Nenhuma sugestão pendente de revisão.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Execute o script de enriquecimento para gerar novas sugestões.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {groups.reduce((acc, g) => acc + g.suggestions.length, 0)} sugestões
        pendentes para {groups.length} lojas
      </p>

      {/* Bulk actions by field type */}
      {fieldCounts.size > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
            <span className="text-xs font-semibold text-foreground">
              Ações em lote por campo
            </span>
          </div>
          <div className="divide-y divide-border">
            {Array.from(fieldCounts.entries())
              .sort((a, b) => b[1].count - a[1].count)
              .map(([field, { count }]) => {
                const isLoading = bulkFieldLoading === field;
                return (
                  <div
                    key={field}
                    className="flex items-center justify-between px-4 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">
                        {FIELD_LABELS[field] ?? field}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {count}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleBulkFieldAction(field, "APPROVED")
                            }
                            disabled={bulkFieldLoading !== null}
                            className="text-green-500 hover:text-green-400 text-xs"
                          >
                            <CheckCheck className="h-3.5 w-3.5 mr-1" />
                            Aprovar {count}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleBulkFieldAction(field, "REJECTED")
                            }
                            disabled={bulkFieldLoading !== null}
                            className="text-red-500 hover:text-red-400 text-xs"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Rejeitar {count}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {groups.map((group) => {
        // Extract lat/lng from suggestions for map preview
        const latSuggestion = group.suggestions.find((s) => s.field === "latitude");
        const lngSuggestion = group.suggestions.find((s) => s.field === "longitude");
        const mapLat = latSuggestion ? parseFloat(latSuggestion.newValue) : null;
        const mapLng = lngSuggestion ? parseFloat(lngSuggestion.newValue) : null;
        const showMap = mapLat != null && mapLng != null && !isNaN(mapLat) && !isNaN(mapLng);

        return (
        <div
          key={group.store.id}
          className="rounded-lg border border-border bg-card overflow-hidden"
        >
          {/* Store header */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {group.store.sigla}
              </span>
              <span className="text-xs text-muted-foreground">
                {group.store.city}, {group.store.state}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {group.suggestions.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleBulkAction(group.store.id, "APPROVED")
                }
                disabled={bulkLoading}
                className="text-green-500 hover:text-green-400 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Aprovar tudo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleBulkAction(group.store.id, "REJECTED")
                }
                disabled={bulkLoading}
                className="text-red-500 hover:text-red-400 text-xs"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Rejeitar tudo
              </Button>
            </div>
          </div>

          {/* Map preview */}
          {showMap && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/10">
              <div className="w-[200px] h-[120px] shrink-0 rounded-md overflow-hidden">
                <MapPreview lat={mapLat} lng={mapLng} />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><span className="font-medium">Lat:</span> {mapLat}</p>
                <p><span className="font-medium">Lng:</span> {mapLng}</p>
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div className="divide-y divide-border">
            {group.suggestions.map((s) => {
              const processing = processingIds.has(s.id);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
                      {FIELD_LABELS[s.field] ?? s.field}
                    </span>
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <span className="text-zinc-500 truncate">
                        {s.oldValue || "\u2014"}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        &rarr;
                      </span>
                      <span className="text-emerald-400 font-medium truncate">
                        {s.newValue}
                      </span>
                    </div>
                    {s.source && (
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0"
                      >
                        {SOURCE_LABELS[s.source] ?? s.source}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                          onClick={() => handleAction(s.id, "APPROVED")}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleAction(s.id, "REJECTED")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}
