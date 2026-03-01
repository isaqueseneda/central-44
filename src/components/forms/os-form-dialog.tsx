"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  calcTotalCost,
  DEFAULT_HOUR_PRICE,
  DEFAULT_KM_PRICE,
  formatBRL,
} from "@/lib/format";
import {
  Calculator,
  Car,
  ChevronDown,
  FileText,
  HardHat,
  Loader2,
  MapPin,
  Package,
  Plus,
  Search,
  Trash2,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface RefStore {
  id: string;
  sigla: string;
  city: string;
  code: string;
  kmRoundTrip?: number | null;
  tollRoundTrip?: number | null;
  storeNumber?: number | null;
  state?: string;
  address?: string;
}

export interface RefEmployee {
  id: string;
  shortName: string;
  rg?: string | null;
}

export interface RefVehicle {
  id: string;
  name: string;
  licensePlate: string;
}

export interface RefServiceType {
  id: string;
  name: string;
}

export interface RefMaterial {
  id: string;
  name: string;
  salePrice?: number | null;
}

export interface RefTeam {
  id: string;
  name: string;
  memberNames: string[];
}

export interface OSFormRefs {
  stores: RefStore[];
  employees: RefEmployee[];
  vehicles: RefVehicle[];
  serviceTypes: RefServiceType[];
  materials: RefMaterial[];
  teams?: RefTeam[];
}

export interface MaterialDetailEntry {
  materialId: string;
  quantity: number | null;
  unitPrice: number | null;
}

interface OSInitialData {
  id: string;
  name: string;
  status: string;
  priority: number;
  type: string;
  date: string | null;
  endDate?: string | null;
  scheduleAssignmentId?: string | null;
  warranty: boolean;
  isObra: boolean;
  vehicleId: string | null;
  storeIds: string[];
  serviceTypeIds: string[];
  materialIds: string[];
  servicesPerformed?: string | null;
  managerComment?: string | null;
  materialsUsedNotes?: string | null;
  numeroChamado?: string | null;
  solicitadoPor?: string | null;
  enderecoAtendimento?: string | null;
  servicoSolicitado?: string | null;
  kmIdaVolta?: number | null;
  kmRodada?: number | null;
  precoKm?: number | null;
  laborCost?: number | null;
  materialCost?: number | null;
  transportCost?: number | null;
  totalCost?: number | null;
  mealAllowance?: number | null;
  overnightAllowance?: number | null;
  tollDiscount?: number | null;
  parking?: number | null;
  manHours?: number | null;
  materialDetails?: MaterialDetailEntry[];
  teamIds?: string[];
}

interface OSFormDialogProps {
  trigger: ReactNode;
  refs: OSFormRefs;
  initialData?: OSInitialData;
  settings?: Record<string, string>;
}

// ──────────────────────────────────────────────
// Multi-select search component
// ──────────────────────────────────────────────

function MultiSelectSearch<T extends { id: string }>({
  label,
  icon: Icon,
  items,
  selected,
  onToggle,
  renderItem,
  searchFn,
  onCreateNew,
  createLabel,
}: {
  label: string;
  icon: typeof MapPin;
  items: T[];
  selected: string[];
  onToggle: (id: string) => void;
  renderItem: (item: T) => string;
  searchFn: (item: T, query: string) => boolean;
  onCreateNew?: (name: string) => Promise<void>;
  createLabel?: string;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);

  const filtered = search
    ? items.filter((item) => searchFn(item, search.toLowerCase()))
    : items;
  const selectedItems = items.filter((i) => selected.includes(i.id));
  const displayItems = expanded ? filtered : filtered.slice(0, 6);

  async function handleCreateNew() {
    if (!onCreateNew || !search.trim()) return;
    setCreating(true);
    try {
      await onCreateNew(search.trim().toUpperCase());
      setSearch("");
      toast.success(`${createLabel ?? "Item"} criado`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
        <Icon className="h-3 w-3" />
        {label}
        {selected.length > 0 && (
          <Badge
            variant="secondary"
            className="bg-zinc-800 text-zinc-400 text-[10px] h-4 px-1.5"
          >
            {selected.length}
          </Badge>
        )}
      </div>

      {/* Selected badges */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedItems.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="bg-blue-600/10 text-blue-400 text-xs cursor-pointer hover:bg-blue-600/20"
              onClick={() => onToggle(item.id)}
            >
              {renderItem(item)}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder={`Buscar ${label.toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm border-zinc-800 bg-zinc-900/50"
        />
      </div>

      {/* Options list */}
      <div className="max-h-32 overflow-y-auto space-y-0.5 rounded-lg border border-zinc-800 bg-zinc-900/30 p-1.5">
        {displayItems.length === 0 && !onCreateNew && (
          <p className="text-xs text-zinc-600 text-center py-2">
            Nenhum resultado
          </p>
        )}
        {displayItems.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-800/50 cursor-pointer text-xs"
          >
            <Checkbox
              checked={selected.includes(item.id)}
              onCheckedChange={() => onToggle(item.id)}
              className="h-3.5 w-3.5"
            />
            <span className="text-zinc-300">{renderItem(item)}</span>
          </label>
        ))}
        {!expanded && filtered.length > 6 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-2"
          >
            +{filtered.length - 6} mais...
          </button>
        )}
        {/* Inline create new */}
        {onCreateNew && search.trim() && filtered.length === 0 && (
          <button
            type="button"
            onClick={handleCreateNew}
            disabled={creating}
            className="flex items-center gap-1.5 w-full rounded-md px-2 py-1.5 hover:bg-emerald-800/30 text-xs text-emerald-400"
          >
            <Plus className="h-3 w-3" />
            {creating ? "Criando..." : `Criar "${search.trim().toUpperCase()}"`}
          </button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Form
// ──────────────────────────────────────────────

export function OSFormDialog({
  trigger,
  refs,
  initialData,
  settings,
}: OSFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isEdit = !!initialData;

  // Global settings
  const globalPrecoKm = Number(settings?.precoKm) || DEFAULT_KM_PRICE;
  const globalPrecoHora = Number(settings?.precoHora) || DEFAULT_HOUR_PRICE;

  // Local refs state (for inline creates)
  const [localServiceTypes, setLocalServiceTypes] = useState(refs.serviceTypes);
  const [localMaterials, setLocalMaterials] = useState(refs.materials);

  // Form state
  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState(initialData?.type ?? "GENERAL");
  const [priority, setPriority] = useState(
    initialData?.priority?.toString() ?? "0",
  );
  const [warranty, setWarranty] = useState(initialData?.warranty ?? false);
  const [date, setDate] = useState(initialData?.date?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(initialData?.endDate?.slice(0, 10) ?? "");
  const [vehicleId, setVehicleId] = useState(initialData?.vehicleId ?? "none");
  const [isObra, setIsObra] = useState(initialData?.isObra ?? false);
  const [storeIds, setStoreIds] = useState<string[]>(
    initialData?.storeIds ?? [],
  );
  const [serviceTypeIds, setServiceTypeIds] = useState<string[]>(
    initialData?.serviceTypeIds ?? [],
  );
  const [materialIds, setMaterialIds] = useState<string[]>(
    initialData?.materialIds ?? [],
  );
  const [teamIds, setTeamIds] = useState<string[]>(initialData?.teamIds ?? []);

  // Report fields
  const [numeroChamado, setNumeroChamado] = useState(
    initialData?.numeroChamado ?? "",
  );
  const [solicitadoPor, setSolicitadoPor] = useState(
    initialData?.solicitadoPor ?? "",
  );
  const [enderecoAtendimento, setEnderecoAtendimento] = useState(
    initialData?.enderecoAtendimento ?? "",
  );
  const [servicoSolicitado, setServicoSolicitado] = useState(
    initialData?.servicoSolicitado ?? "",
  );

  // Notes
  const [servicesPerformed, setServicesPerformed] = useState(
    initialData?.servicesPerformed ?? "",
  );
  const [managerComment, setManagerComment] = useState(
    initialData?.managerComment ?? "",
  );

  // KM fields
  const [kmIdaVolta, setKmIdaVolta] = useState(
    initialData?.kmIdaVolta?.toString() ?? "",
  );
  const [kmRodada, setKmRodada] = useState(
    initialData?.kmRodada?.toString() ?? "",
  );
  const [precoKm, setPrecoKm] = useState(
    initialData?.precoKm?.toString() ?? globalPrecoKm.toString(),
  );

  // Financial
  const [laborCost, setLaborCost] = useState(
    initialData?.laborCost?.toString() ?? "",
  );
  const [materialCost, setMaterialCost] = useState(
    initialData?.materialCost?.toString() ?? "",
  );
  const [transportCost, setTransportCost] = useState(
    initialData?.transportCost?.toString() ?? "",
  );
  const [totalCost, setTotalCost] = useState(
    initialData?.totalCost?.toString() ?? "",
  );
  const [mealAllowance, setMealAllowance] = useState(
    initialData?.mealAllowance?.toString() ?? "",
  );
  const [overnightAllowance, setOvernightAllowance] = useState(
    initialData?.overnightAllowance?.toString() ?? "",
  );
  const [tollDiscount, setTollDiscount] = useState(
    initialData?.tollDiscount?.toString() ?? "",
  );
  const [parking, setParking] = useState(
    initialData?.parking?.toString() ?? "",
  );

  // Per-material details
  const [materialDetailsList, setMaterialDetailsList] = useState<
    MaterialDetailEntry[]
  >(initialData?.materialDetails ?? []);

  // Sections default OPEN
  const [materialsDetailOpen, setMaterialsDetailOpen] = useState(true);

  // Quick-entry mode
  const [quickEntry, setQuickEntry] = useState(false);

  // Auto-calc control
  const [manualOverride, setManualOverride] = useState<Record<string, boolean>>(
    {},
  );

  // Auto-save debounce ref
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirty = useRef(false);

  function resetForm() {
    setName(initialData?.name ?? "");
    setType(initialData?.type ?? "GENERAL");
    setPriority(initialData?.priority?.toString() ?? "0");
    setWarranty(initialData?.warranty ?? false);
    setDate(initialData?.date?.slice(0, 10) ?? "");
    setEndDate(initialData?.endDate?.slice(0, 10) ?? "");
    setVehicleId(initialData?.vehicleId ?? "none");
    setIsObra(initialData?.isObra ?? false);
    setStoreIds(initialData?.storeIds ?? []);
    setServiceTypeIds(initialData?.serviceTypeIds ?? []);
    setMaterialIds(initialData?.materialIds ?? []);
    setTeamIds(initialData?.teamIds ?? []);
    setNumeroChamado(initialData?.numeroChamado ?? "");
    setSolicitadoPor(initialData?.solicitadoPor ?? "");
    setEnderecoAtendimento(initialData?.enderecoAtendimento ?? "");
    setServicoSolicitado(initialData?.servicoSolicitado ?? "");
    setServicesPerformed(initialData?.servicesPerformed ?? "");
    setManagerComment(initialData?.managerComment ?? "");
    setKmIdaVolta(initialData?.kmIdaVolta?.toString() ?? "");
    setKmRodada(initialData?.kmRodada?.toString() ?? "");
    setPrecoKm(initialData?.precoKm?.toString() ?? globalPrecoKm.toString());
    setLaborCost(initialData?.laborCost?.toString() ?? "");
    setMaterialCost(initialData?.materialCost?.toString() ?? "");
    setTransportCost(initialData?.transportCost?.toString() ?? "");
    setTotalCost(initialData?.totalCost?.toString() ?? "");
    setMealAllowance(initialData?.mealAllowance?.toString() ?? "");
    setOvernightAllowance(initialData?.overnightAllowance?.toString() ?? "");
    setTollDiscount(initialData?.tollDiscount?.toString() ?? "");
    setParking(initialData?.parking?.toString() ?? "");
    setMaterialDetailsList(initialData?.materialDetails ?? []);
    setMaterialsDetailOpen(true);
    setManualOverride({});
    setShowDeleteConfirm(false);
    isDirty.current = false;
    setLocalServiceTypes(refs.serviceTypes);
    setLocalMaterials(refs.materials);
  }

  // ── Auto-save for edit mode ───────────────────────
  const scheduleAutoSave = useCallback(() => {
    if (!isEdit) return;
    isDirty.current = true;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      doAutoSave();
    }, 1500);
  }, [isEdit]);

  async function doAutoSave() {
    if (!isEdit || !initialData) return;
    setAutoSaving(true);
    try {
      const payload = buildPayload();
      const res = await fetch(`/api/ordens/${initialData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar");
      }
      // Also update the schedule assignment's endDate if applicable
      if (initialData.scheduleAssignmentId) {
        const endDateVal = endDate ? (() => { const d = new Date(endDate + "T12:00:00"); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); })() : null;
        const schedRes = await fetch(`/api/team-schedule/${initialData.scheduleAssignmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endDate: endDateVal }),
        });
        if (!schedRes.ok) {
          console.error("[Auto-save] Failed to update schedule assignment endDate");
        }
      }
      isDirty.current = false;
    } catch {
      // Silent fail for auto-save, user can still manual save
    } finally {
      setAutoSaving(false);
    }
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  // ── Auto-calculation helpers ───────────────────────

  function recalcKmAndTransport(ids: string[]) {
    if (manualOverride.km) return;
    const selectedStores = ids
      .map((id) => refs.stores.find((s) => s.id === id))
      .filter(Boolean) as RefStore[];
    const totalKm = selectedStores.reduce(
      (acc, s) => acc + (s.kmRoundTrip ?? 0),
      0,
    );
    setKmIdaVolta(totalKm > 0 ? totalKm.toString() : "");
    if (!manualOverride.kmRodada) {
      setKmRodada(totalKm > 0 ? totalKm.toString() : "");
    }
    if (!manualOverride.transport) {
      const km = manualOverride.kmRodada ? Number(kmRodada) || 0 : totalKm;
      const price = Number(precoKm) || globalPrecoKm;
      const tolls = selectedStores.reduce(
        (acc, s) => acc + (s.tollRoundTrip ?? 0),
        0,
      );
      const cost = km * price + tolls;
      setTransportCost(cost > 0 ? cost.toFixed(2) : "");
    }
  }

  function recalcTransportFromKm(newKmRodada?: string, newPrecoKm?: string) {
    if (manualOverride.transport) return;
    const km = Number(newKmRodada ?? kmRodada) || 0;
    const price = Number(newPrecoKm ?? precoKm) || globalPrecoKm;
    const selectedStores = storeIds
      .map((id) => refs.stores.find((s) => s.id === id))
      .filter(Boolean) as RefStore[];
    const tolls = selectedStores.reduce(
      (acc, s) => acc + (s.tollRoundTrip ?? 0),
      0,
    );
    const cost = km * price + tolls;
    setTransportCost(cost > 0 ? cost.toFixed(2) : "");
    return cost;
  }

  function recalcMaterialCostFromDetails(details: MaterialDetailEntry[]) {
    if (manualOverride.material) return;
    const cost = details.reduce(
      (acc, md) => acc + (md.quantity ?? 0) * (md.unitPrice ?? 0),
      0,
    );
    setMaterialCost(cost > 0 ? cost.toFixed(2) : "");
    return cost;
  }

  function recalcTotal(overrides?: {
    labor?: string;
    material?: string;
    transport?: string;
    meal?: string;
    overnight?: string;
    toll?: string;
    park?: string;
  }) {
    if (manualOverride.total) return;
    const total = calcTotalCost({
      laborCost: Number(overrides?.labor ?? laborCost) || 0,
      materialCost: Number(overrides?.material ?? materialCost) || 0,
      transportCost: Number(overrides?.transport ?? transportCost) || 0,
      mealAllowance: Number(overrides?.meal ?? mealAllowance) || 0,
      overnightAllowance:
        Number(overrides?.overnight ?? overnightAllowance) || 0,
      tollDiscount: Number(overrides?.toll ?? tollDiscount) || 0,
      parking: Number(overrides?.park ?? parking) || 0,
    });
    setTotalCost(total > 0 ? total.toFixed(2) : "");
  }

  function autoFillAddress(ids: string[]) {
    if (manualOverride.address) return;
    const first = refs.stores.find((s) => s.id === ids[0]);
    if (first?.address) setEnderecoAtendimento(first.address);
  }

  function getWeekendBadge(
    dateStr: string | null,
  ): { label: string; className: string } | null {
    if (!dateStr) return null;
    const day = new Date(dateStr + "T12:00:00").getDay();
    if (day === 6)
      return {
        label: "SAB 60%",
        className: "bg-yellow-600/20 text-yellow-400",
      };
    if (day === 0)
      return { label: "DOM 100%", className: "bg-red-600/20 text-red-400" };
    return null;
  }

  function syncMaterialDetails(
    matIds: string[],
    currentDetails: MaterialDetailEntry[],
  ): MaterialDetailEntry[] {
    const existing = new Map(currentDetails.map((md) => [md.materialId, md]));
    return matIds.map((id) => {
      if (existing.has(id)) return existing.get(id)!;
      const mat = localMaterials.find((m) => m.id === id);
      return {
        materialId: id,
        quantity: null,
        unitPrice: mat?.salePrice ?? null,
      };
    });
  }

  function toggleId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function autoName(ids: string[]) {
    if (!name || name === autoNameFromIds(storeIds))
      setName(autoNameFromIds(ids));
  }

  function autoNameFromIds(ids: string[]): string {
    if (ids.length === 0) return "";
    return ids
      .map((id) => refs.stores.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => s!.sigla || s!.city)
      .join(", ");
  }

  // Get service type names for tags in Serviço Solicitado
  const selectedServiceNames = serviceTypeIds
    .map((id) => localServiceTypes.find((s) => s.id === id)?.name)
    .filter(Boolean) as string[];

  // Build payload for save
  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      name: name.trim(),
      type,
      priority: Number(priority),
      warranty,
      date: date ? new Date(date + "T12:00:00").toISOString() : null,
      vehicleId: vehicleId === "none" ? null : vehicleId,
      isObra,
      storeIds,
      serviceTypeIds,
      materialIds,
      teamIds,
    };

    if (numeroChamado) payload.numeroChamado = numeroChamado;
    if (solicitadoPor) payload.solicitadoPor = solicitadoPor;
    if (enderecoAtendimento) payload.enderecoAtendimento = enderecoAtendimento;
    if (servicoSolicitado) payload.servicoSolicitado = servicoSolicitado;

    if (kmIdaVolta) payload.kmIdaVolta = Number(kmIdaVolta);
    if (kmRodada) payload.kmRodada = Number(kmRodada);
    if (precoKm) payload.precoKm = Number(precoKm);

    if (servicesPerformed) payload.servicesPerformed = servicesPerformed;
    if (managerComment) payload.managerComment = managerComment;

    if (laborCost) payload.laborCost = Number(laborCost);
    if (materialCost) payload.materialCost = Number(materialCost);
    if (transportCost) payload.transportCost = Number(transportCost);
    if (totalCost) payload.totalCost = Number(totalCost);
    if (mealAllowance) payload.mealAllowance = Number(mealAllowance);
    if (overnightAllowance)
      payload.overnightAllowance = Number(overnightAllowance);
    if (tollDiscount) payload.tollDiscount = Number(tollDiscount);
    if (parking) payload.parking = Number(parking);

    if (materialDetailsList.length > 0) {
      payload.materialDetails = materialDetailsList.map((md) => ({
        materialId: md.materialId,
        quantity: md.quantity,
        unitPrice: md.unitPrice,
      }));
    }

    return payload;
  }

  // Inline create service type
  async function handleCreateServiceType(name: string) {
    const res = await fetch("/api/servicos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Erro ao criar serviço");
    const created = await res.json();
    setLocalServiceTypes((prev) => [
      ...prev,
      { id: created.id, name: created.name },
    ]);
    setServiceTypeIds((prev) => [...prev, created.id]);
    scheduleAutoSave();
  }

  // Inline create material
  async function handleCreateMaterial(name: string) {
    const res = await fetch("/api/materiais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Erro ao criar material");
    const created = await res.json();
    setLocalMaterials((prev) => [
      ...prev,
      { id: created.id, name: created.name, salePrice: created.salePrice },
    ]);
    const newIds = [...materialIds, created.id];
    setMaterialIds(newIds);
    const newDetails = syncMaterialDetails(newIds, materialDetailsList);
    setMaterialDetailsList(newDetails);
    scheduleAutoSave();
  }

  // Delete handler
  async function handleDelete() {
    if (!initialData) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/ordens/${initialData.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir");
      toast.success("OS excluída com sucesso");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erro ao excluir OS");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (storeIds.length === 0) {
      toast.error("Selecione pelo menos uma loja");
      return;
    }
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const payload = buildPayload();
      const url = isEdit ? `/api/ordens/${initialData.id}` : "/api/ordens";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar OS");
      }

      const created = await res.json();
      // Also update the schedule assignment's endDate if applicable
      if (isEdit && initialData?.scheduleAssignmentId) {
        const endDateVal = endDate ? (() => { const d = new Date(endDate + "T12:00:00"); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); })() : null;
        const schedRes = await fetch(`/api/team-schedule/${initialData.scheduleAssignmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endDate: endDateVal }),
        });
        if (!schedRes.ok) {
          console.error("[OS Form] Failed to update schedule assignment endDate");
        }
      }
      toast.success(isEdit ? "OS atualizada" : "OS criada");
      setOpen(false);
      if (!isEdit) resetForm();
      if (quickEntry && !isEdit && created?.id) {
        router.push(`/ordens-de-servico/${created.id}`);
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar OS");
    } finally {
      setLoading(false);
    }
  }

  // Prevent accidental close when form is dirty
  function handleInteractOutside(e: Event) {
    if (isEdit && isDirty.current) {
      e.preventDefault();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isEdit && isDirty.current) {
          // Force save before closing
          if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
          doAutoSave();
        }
        setOpen(v);
        if (v) resetForm();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="max-w-[92vw] w-full max-h-[92vh] overflow-y-auto lg:max-w-6xl"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={(e) => {
          if (isEdit && isDirty.current) e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle>
                {isEdit
                  ? `Editar OS-${initialData?.id?.slice(-4)}`
                  : "Nova Ordem de Serviço"}
              </DialogTitle>
              {autoSaving && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando...
                </span>
              )}
              {isEdit && !autoSaving && !isDirty.current && (
                <span className="text-xs text-emerald-500">Salvo</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => setQuickEntry(!quickEntry)}
                  className={`text-sm px-4 py-2 rounded-full transition-colors ${
                    quickEntry
                      ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-600/50"
                      : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {quickEntry ? "Modo Completo" : "Entrada Rápida"}
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className={`space-y-4 ${quickEntry ? "[&_input]:h-12 [&_input]:text-base" : ""}`}
        >
          {/* ═══ TOP ROW: Name, Type, Priority, Date, Vehicle ═══ */}
          {!quickEntry && (
            <div className="grid grid-cols-12 gap-3">
              <div className={`${initialData?.scheduleAssignmentId ? "col-span-3" : "col-span-4"} space-y-1.5`}>
                <Label className="text-xs text-zinc-400">Nome da OS *</Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    scheduleAutoSave();
                  }}
                  placeholder="Auto-preenchido pela loja..."
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-zinc-400">Tipo</Label>
                <Select
                  value={type}
                  onValueChange={(v) => {
                    setType(v);
                    scheduleAutoSave();
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">Geral</SelectItem>
                    <SelectItem value="ALARM">Alarme</SelectItem>
                    <SelectItem value="LED">LED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={`${initialData?.scheduleAssignmentId ? "col-span-1" : "col-span-2"} space-y-1.5`}>
                <Label className="text-xs text-zinc-400">Prioridade</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => {
                    setPriority(v);
                    scheduleAutoSave();
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Normal</SelectItem>
                    <SelectItem value="1">⭐</SelectItem>
                    <SelectItem value="2">⭐⭐</SelectItem>
                    <SelectItem value="3">⭐⭐⭐</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-zinc-400">{initialData?.scheduleAssignmentId ? "Data Início" : "Data"}</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    scheduleAutoSave();
                  }}
                  className="h-9 text-sm"
                />
              </div>
              {initialData?.scheduleAssignmentId && (
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs text-zinc-400">Data Fim</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      scheduleAutoSave();
                    }}
                    className="h-9 text-sm"
                  />
                </div>
              )}
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-zinc-400 flex items-center gap-1">
                  <HardHat className="h-3 w-3" /> Obra
                </Label>
                <div className="flex items-center gap-2 h-9">
                  <Checkbox
                    checked={isObra}
                    onCheckedChange={(v) => {
                      setIsObra(v === true);
                      scheduleAutoSave();
                    }}
                    className="h-4 w-4"
                  />
                  <span
                    className={`text-sm ${isObra ? "text-orange-400 font-medium" : "text-zinc-500"}`}
                  >
                    {isObra ? "Sim (sem medição)" : "Não"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick-entry: Date only */}
          {quickEntry && (
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-400">Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          )}

          <div className="border-t border-zinc-800" />

          {/* ═══ 3-COLUMN LAYOUT: Lojas+Func | Serviços+Materiais | Report+KM ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* ── Column 1: Lojas + Funcionários ── */}
            <div className="space-y-4">
              <MultiSelectSearch
                label="Lojas"
                icon={MapPin}
                items={refs.stores}
                selected={storeIds}
                onToggle={(id) => {
                  const newIds = toggleId(storeIds, id);
                  setStoreIds(newIds);
                  autoName(newIds);
                  autoFillAddress(newIds);
                  recalcKmAndTransport(newIds);
                  const selectedStores = newIds
                    .map((sid) => refs.stores.find((s) => s.id === sid))
                    .filter(Boolean) as RefStore[];
                  const totalKm = selectedStores.reduce(
                    (acc, s) => acc + (s.kmRoundTrip ?? 0),
                    0,
                  );
                  const price = Number(precoKm) || globalPrecoKm;
                  const tolls = selectedStores.reduce(
                    (acc, s) => acc + (s.tollRoundTrip ?? 0),
                    0,
                  );
                  const newTransport = totalKm * price + tolls;
                  recalcTotal({
                    transport: newTransport > 0 ? newTransport.toFixed(2) : "",
                  });
                  scheduleAutoSave();
                }}
                renderItem={(s) =>
                  `${s.sigla} - ${s.city}${s.kmRoundTrip ? ` (${s.kmRoundTrip}km)` : ""}`
                }
                searchFn={(s, q) =>
                  s.sigla.toLowerCase().includes(q) ||
                  s.city.toLowerCase().includes(q) ||
                  s.code.toLowerCase().includes(q)
                }
              />

              {/* Teams selector */}
              {!quickEntry && refs.teams && refs.teams.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                    <UsersRound className="h-3 w-3" />
                    Equipes
                    {teamIds.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-zinc-800 text-zinc-400 text-[10px] h-4 px-1.5"
                      >
                        {teamIds.length}
                      </Badge>
                    )}
                  </div>
                  {teamIds.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {teamIds.map((tid) => {
                        const t = refs.teams!.find((x) => x.id === tid);
                        return t ? (
                          <Badge
                            key={tid}
                            variant="secondary"
                            className="bg-violet-600/10 text-violet-400 text-xs cursor-pointer hover:bg-violet-600/20"
                            onClick={() => {
                              setTeamIds(teamIds.filter((x) => x !== tid));
                              scheduleAutoSave();
                            }}
                          >
                            {t.name}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="max-h-28 overflow-y-auto space-y-0.5 rounded-lg border border-zinc-800 bg-zinc-900/30 p-1.5">
                    {refs.teams.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-800/50 cursor-pointer text-xs"
                      >
                        <Checkbox
                          checked={teamIds.includes(t.id)}
                          onCheckedChange={() => {
                            setTeamIds(
                              teamIds.includes(t.id)
                                ? teamIds.filter((x) => x !== t.id)
                                : [...teamIds, t.id],
                            );
                            scheduleAutoSave();
                          }}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-zinc-300">{t.name}</span>
                        <span className="text-[10px] text-zinc-600 ml-auto">
                          {t.memberNames.join(", ")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Warranty checkbox */}
              {!quickEntry && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={warranty}
                    onCheckedChange={(v) => {
                      setWarranty(v === true);
                      scheduleAutoSave();
                    }}
                  />
                  <span className="text-sm text-zinc-300">Garantia</span>
                </label>
              )}
            </div>

            {/* ── Column 2: Serviços + Materiais ── */}
            {!quickEntry && (
              <div className="space-y-4">
                <MultiSelectSearch
                  label="Serviços"
                  icon={Wrench}
                  items={localServiceTypes}
                  selected={serviceTypeIds}
                  onToggle={(id) => {
                    setServiceTypeIds(toggleId(serviceTypeIds, id));
                    scheduleAutoSave();
                  }}
                  renderItem={(s) => s.name}
                  searchFn={(s, q) => s.name.toLowerCase().includes(q)}
                  onCreateNew={handleCreateServiceType}
                  createLabel="Serviço"
                />

                <MultiSelectSearch
                  label="Materiais"
                  icon={Package}
                  items={localMaterials}
                  selected={materialIds}
                  onToggle={(id) => {
                    const newIds = toggleId(materialIds, id);
                    setMaterialIds(newIds);
                    const newDetails = syncMaterialDetails(
                      newIds,
                      materialDetailsList,
                    );
                    setMaterialDetailsList(newDetails);
                    const cost = recalcMaterialCostFromDetails(newDetails);
                    recalcTotal({
                      material:
                        cost && cost > 0 ? cost.toFixed(2) : materialCost,
                    });
                    scheduleAutoSave();
                  }}
                  renderItem={(m) => m.name}
                  searchFn={(m, q) => m.name.toLowerCase().includes(q)}
                  onCreateNew={handleCreateMaterial}
                  createLabel="Material"
                />

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">
                    Serviços a realizar
                  </Label>
                  <Textarea
                    value={servicesPerformed}
                    onChange={(e) => {
                      setServicesPerformed(e.target.value);
                      scheduleAutoSave();
                    }}
                    rows={2}
                    className="text-sm resize-none"
                    placeholder="Descreva o que precisa ser feito..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Observações</Label>
                  <Textarea
                    value={managerComment}
                    onChange={(e) => {
                      setManagerComment(e.target.value);
                      scheduleAutoSave();
                    }}
                    rows={2}
                    className="text-sm resize-none"
                    placeholder="Observações adicionais..."
                  />
                </div>
              </div>
            )}

            {/* ── Column 3: Report + KM + Financial ── */}
            {!quickEntry && (
              <div className="space-y-4">
                {/* Report fields */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                    <FileText className="h-3 w-3" />
                    Dados do Relatório
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">
                        Nº Chamado
                        {!isEdit && (
                          <span className="text-emerald-500 text-[10px] ml-1">
                            auto
                          </span>
                        )}
                      </Label>
                      <Input
                        value={numeroChamado}
                        onChange={(e) => {
                          setNumeroChamado(e.target.value);
                          scheduleAutoSave();
                        }}
                        className="h-8 text-sm"
                        placeholder="Auto..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">
                        Solicitado por
                      </Label>
                      <Input
                        value={solicitadoPor}
                        onChange={(e) => {
                          setSolicitadoPor(e.target.value);
                          scheduleAutoSave();
                        }}
                        className="h-8 text-sm"
                        placeholder="ENGº JOEL..."
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">
                      Endereço
                      {!manualOverride.address && enderecoAtendimento && (
                        <span className="text-emerald-500 text-[10px] ml-1">
                          auto
                        </span>
                      )}
                    </Label>
                    <Input
                      value={enderecoAtendimento}
                      onChange={(e) => {
                        setEnderecoAtendimento(e.target.value);
                        setManualOverride((p) => ({ ...p, address: true }));
                        scheduleAutoSave();
                      }}
                      className="h-8 text-sm"
                      placeholder="Auto-preenchido pela loja..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">
                      Serviço solicitado
                    </Label>
                    {/* Service tags from selected services */}
                    {selectedServiceNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {selectedServiceNames.map((n) => (
                          <Badge
                            key={n}
                            variant="secondary"
                            className="bg-blue-600/10 text-blue-400 text-[10px]"
                          >
                            {n}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Textarea
                      value={servicoSolicitado}
                      onChange={(e) => {
                        setServicoSolicitado(e.target.value);
                        scheduleAutoSave();
                      }}
                      rows={2}
                      className="text-sm resize-none"
                      placeholder="Info adicional além dos serviços selecionados..."
                    />
                  </div>
                </div>

                {/* KM & Transport */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                    <Car className="h-3 w-3" />
                    Transporte
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">
                        KM Ida/Volta
                        {!manualOverride.km && kmIdaVolta && (
                          <span className="text-emerald-500 text-[10px] ml-1">
                            auto
                          </span>
                        )}
                      </Label>
                      <Input
                        type="number"
                        step="1"
                        value={kmIdaVolta}
                        onChange={(e) => {
                          setKmIdaVolta(e.target.value);
                          setManualOverride((p) => ({ ...p, km: true }));
                          if (!manualOverride.kmRodada) {
                            setKmRodada(e.target.value);
                            const cost = recalcTransportFromKm(e.target.value);
                            recalcTotal({
                              transport:
                                cost && cost > 0 ? cost.toFixed(2) : "",
                            });
                          }
                          scheduleAutoSave();
                        }}
                        className="h-8 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">KM Rodada</Label>
                      <Input
                        type="number"
                        step="1"
                        value={kmRodada}
                        onChange={(e) => {
                          setKmRodada(e.target.value);
                          setManualOverride((p) => ({ ...p, kmRodada: true }));
                          const cost = recalcTransportFromKm(e.target.value);
                          recalcTotal({
                            transport: cost && cost > 0 ? cost.toFixed(2) : "",
                          });
                          scheduleAutoSave();
                        }}
                        className="h-8 text-sm"
                        placeholder="= Ida/Volta"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Preço/KM</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={precoKm}
                        onChange={(e) => {
                          setPrecoKm(e.target.value);
                          const cost = recalcTransportFromKm(
                            undefined,
                            e.target.value,
                          );
                          recalcTotal({
                            transport: cost && cost > 0 ? cost.toFixed(2) : "",
                          });
                          scheduleAutoSave();
                        }}
                        className="h-8 text-sm"
                        placeholder={globalPrecoKm.toString()}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">
                        Custo Transp.
                        {!manualOverride.transport && transportCost && (
                          <span className="text-emerald-500 text-[10px] ml-1">
                            auto
                          </span>
                        )}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={transportCost}
                        onChange={(e) => {
                          setTransportCost(e.target.value);
                          setManualOverride((p) => ({ ...p, transport: true }));
                          recalcTotal({ transport: e.target.value });
                          scheduleAutoSave();
                        }}
                        className="h-8 text-sm"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial summary */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                    <Calculator className="h-3 w-3" />
                    Financeiro
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">
                        M.Obra
                        {!manualOverride.labor && laborCost && !isEdit && (
                          <span className="text-emerald-500 text-[10px] ml-1">
                            auto
                          </span>
                        )}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={laborCost}
                        onChange={(e) => {
                          setLaborCost(e.target.value);
                          setManualOverride((p) => ({ ...p, labor: true }));
                          recalcTotal({ labor: e.target.value });
                          scheduleAutoSave();
                        }}
                        className="h-8 text-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Material</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={materialCost}
                        onChange={(e) => {
                          setMaterialCost(e.target.value);
                          recalcTotal({ material: e.target.value });
                          scheduleAutoSave();
                        }}
                        className="h-8 text-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Refeição</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={mealAllowance}
                        onChange={(e) => {
                          setMealAllowance(e.target.value);
                          recalcTotal({ meal: e.target.value });
                          scheduleAutoSave();
                        }}
                        className="h-8 text-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Pernoite</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={overnightAllowance}
                        onChange={(e) => {
                          setOvernightAllowance(e.target.value);
                          recalcTotal({ overnight: e.target.value });
                          scheduleAutoSave();
                        }}
                        className="h-8 text-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Pedágio</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={tollDiscount}
                        onChange={(e) => {
                          setTollDiscount(e.target.value);
                          recalcTotal({ toll: e.target.value });
                          scheduleAutoSave();
                        }}
                        className="h-8 text-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Estacion.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={parking}
                        onChange={(e) => {
                          setParking(e.target.value);
                          recalcTotal({ park: e.target.value });
                          scheduleAutoSave();
                        }}
                        className="h-8 text-sm"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400 font-semibold">
                      Total (R$)
                      {!manualOverride.total && totalCost && (
                        <span className="text-emerald-500 text-[10px] ml-1">
                          auto
                        </span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={totalCost}
                      onChange={(e) => {
                        setTotalCost(e.target.value);
                        setManualOverride((p) => ({ ...p, total: true }));
                        scheduleAutoSave();
                      }}
                      className="h-8 text-sm font-semibold border-emerald-800/50"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ FULL WIDTH SECTIONS: Material Details ═══ */}
          {!quickEntry && (
            <>
              {/* Per-Material Details */}
              {materialIds.length > 0 && (
                <Collapsible
                  open={materialsDetailOpen}
                  onOpenChange={setMaterialsDetailOpen}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium hover:text-zinc-300 w-full border-t border-zinc-800 pt-3"
                    >
                      <Package className="h-3 w-3" />
                      Detalhes de Materiais
                      <Badge
                        variant="secondary"
                        className="bg-zinc-800 text-zinc-400 text-[10px] h-4 px-1.5 ml-1"
                      >
                        {materialIds.length}
                      </Badge>
                      <ChevronDown
                        className={`h-3 w-3 ml-auto transition-transform ${materialsDetailOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-3">
                    <div className="rounded-lg border border-zinc-800 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-zinc-900/50 border-b border-zinc-800">
                            <th className="text-left px-2 py-1.5 text-zinc-500 font-medium">
                              Material
                            </th>
                            <th className="text-center px-2 py-1.5 text-zinc-500 font-medium w-20">
                              Qtd
                            </th>
                            <th className="text-center px-2 py-1.5 text-zinc-500 font-medium w-24">
                              Unit R$
                            </th>
                            <th className="text-right px-2 py-1.5 text-zinc-500 font-medium w-24">
                              Total R$
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {materialDetailsList.map((md, idx) => {
                            const mat = localMaterials.find(
                              (m) => m.id === md.materialId,
                            );
                            const lineTotal =
                              (md.quantity ?? 0) * (md.unitPrice ?? 0);
                            return (
                              <tr
                                key={md.materialId}
                                className="border-b border-zinc-800/50 last:border-0"
                              >
                                <td className="px-2 py-1.5 text-zinc-300">
                                  {mat?.name ?? "?"}
                                </td>
                                <td className="px-1 py-1">
                                  <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={md.quantity ?? ""}
                                    onChange={(e) => {
                                      const updated = [...materialDetailsList];
                                      updated[idx] = {
                                        ...md,
                                        quantity: e.target.value
                                          ? Number(e.target.value)
                                          : null,
                                      };
                                      setMaterialDetailsList(updated);
                                      const cost =
                                        recalcMaterialCostFromDetails(updated);
                                      recalcTotal({
                                        material:
                                          cost && cost > 0
                                            ? cost.toFixed(2)
                                            : "",
                                      });
                                      scheduleAutoSave();
                                    }}
                                    className="h-7 text-xs text-center w-full"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={md.unitPrice ?? ""}
                                    onChange={(e) => {
                                      const updated = [...materialDetailsList];
                                      updated[idx] = {
                                        ...md,
                                        unitPrice: e.target.value
                                          ? Number(e.target.value)
                                          : null,
                                      };
                                      setMaterialDetailsList(updated);
                                      const cost =
                                        recalcMaterialCostFromDetails(updated);
                                      recalcTotal({
                                        material:
                                          cost && cost > 0
                                            ? cost.toFixed(2)
                                            : "",
                                      });
                                      scheduleAutoSave();
                                    }}
                                    className="h-7 text-xs text-center w-full"
                                    placeholder="0,00"
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-right text-zinc-400">
                                  {lineTotal > 0 ? formatBRL(lineTotal) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}

          {/* Quick-entry notes */}
          {quickEntry && (
            <>
              <div className="border-t border-zinc-800" />
              <div className="space-y-1.5">
                <Label className="text-sm text-zinc-400">
                  Serviço a realizar
                </Label>
                <Textarea
                  value={servicesPerformed}
                  onChange={(e) => setServicesPerformed(e.target.value)}
                  rows={3}
                  className="text-base resize-none"
                  placeholder="Descreva o que precisa ser feito..."
                />
              </div>
            </>
          )}

          {/* ═══ ACTIONS ═══ */}
          <div className="border-t border-zinc-800 pt-3" />
          <div className="flex items-center justify-between">
            {/* Delete (edit mode only) */}
            {isEdit ? (
              !showDeleteConfirm ? (
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
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                {isEdit ? "Fechar" : "Cancelar"}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className={`bg-blue-600 hover:bg-blue-700 ${quickEntry ? "h-12 text-base px-8" : ""}`}
              >
                {loading
                  ? "Salvando..."
                  : isEdit
                    ? "Salvar alterações"
                    : quickEntry
                      ? "Criar e Revisar"
                      : "Criar OS"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
