"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  calcTotalCost,
  DEFAULT_HOUR_PRICE,
  DEFAULT_HOURS_PER_DAY,
  DEFAULT_KM_PRICE,
  formatBRL,
} from "@/lib/format";
import { includesNormalized } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Calculator,
  Car,
  FileText,
  HardHat,
  Info,
  Loader2,
  MapPin,
  Package,
  Pencil,
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
// InfoTip — reusable label + info icon + tooltip
// ──────────────────────────────────────────────

function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-zinc-600 hover:text-zinc-400 cursor-help inline-block ml-1 shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

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
  tollCostGoing?: number | null;
  tollCostReturn?: number | null;
  storeNumber?: number | null;
  state?: string;
  address?: string;
}

/** Get effective toll for a store: prefer going+return, fallback to roundTrip */
function getStoreToll(s: RefStore): number {
  if (s.tollCostGoing != null || s.tollCostReturn != null) {
    return (s.tollCostGoing ?? 0) + (s.tollCostReturn ?? 0);
  }
  return s.tollRoundTrip ?? 0;
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
  materialIds?: string[];
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
  extraHours?: number | null;
  horasDia?: number | null;
  materialDetails?: MaterialDetailEntry[];
  teamIds?: string[];
}

interface OSFormDialogProps {
  trigger?: ReactNode;
  refs: OSFormRefs;
  initialData?: OSInitialData;
  settings?: Record<string, string>;
  defaultDate?: string;
  defaultTeamIds?: string[];
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
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
    ? items.filter((item) => searchFn(item, search))
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
// Service Table Select (inline table with autocomplete)
// ──────────────────────────────────────────────

function ServiceTableSelect({
  items,
  selected,
  onAdd,
  onRemove,
  onCreateNew,
  onRenameService,
  onServiceRenamed,
}: {
  items: RefServiceType[];
  selected: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onCreateNew: (name: string) => Promise<void>;
  onRenameService?: (id: string, name: string) => Promise<void>;
  onServiceRenamed?: (id: string, name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const selectedItems = selected
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean) as RefServiceType[];
  const available = items.filter(
    (i) => !selected.includes(i.id) && (!search || includesNormalized(i.name, search)),
  );

  async function handleCreate() {
    if (!search.trim()) return;
    setCreating(true);
    try {
      await onCreateNew(search.trim().toUpperCase());
      setSearch("");
      setDropdownOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar serviço");
    } finally {
      setCreating(false);
    }
  }

  async function handleRenameBlur(id: string, originalName: string) {
    setEditingId(null);
    const trimmed = editName.trim();
    if (!trimmed || trimmed === originalName) return;
    if (onRenameService) {
      try {
        await onRenameService(id, trimmed);
        onServiceRenamed?.(id, trimmed);
        toast.success("Serviço renomeado");
      } catch {
        toast.error("Erro ao renomear serviço");
      }
    }
  }

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
        <Wrench className="h-3 w-3" />
        Serviços
        {selected.length > 0 && (
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[10px] h-4 px-1.5">
            {selected.length}
          </Badge>
        )}
      </div>
      <div className="rounded border border-zinc-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-900/60 border-b border-zinc-800">
              <th className="text-left px-1.5 py-1 text-zinc-500 font-medium">Serviço</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {selectedItems.length > 0 ? selectedItems.map((svc) => (
              <tr key={svc.id} className="border-b border-zinc-800/30 last:border-0 hover:bg-zinc-800/30">
                <td className="px-1.5 py-0.5 text-zinc-300">
                  {editingId === svc.id ? (
                    <input
                      ref={editRef}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRenameBlur(svc.id, svc.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full bg-transparent border-0 text-xs text-zinc-300 outline-none focus:bg-zinc-800/50 rounded px-0.5 py-0"
                    />
                  ) : (
                    <span
                      className="cursor-text hover:text-zinc-100"
                      onClick={() => { setEditingId(svc.id); setEditName(svc.name); }}
                    >
                      {svc.name}
                    </span>
                  )}
                </td>
                <td className="text-center">
                  <div className="flex items-center">
                    <button type="button" onClick={() => { setEditingId(svc.id); setEditName(svc.name); }} className="text-zinc-600 hover:text-orange-400 p-0.5" title="Editar">
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                    <button type="button" onClick={() => onRemove(svc.id)} className="text-zinc-600 hover:text-red-400 p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={2} className="text-zinc-600 text-center py-1.5">Nenhum serviço</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Autocomplete add */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <Input
          ref={inputRef}
          placeholder="Adicionar serviço..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
          className="pl-8 h-8 text-sm border-zinc-800 bg-zinc-900/50"
        />
        {dropdownOpen && (search || available.length > 0) && (
          <div className="absolute z-20 w-full mt-1 max-h-32 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg">
            {available.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onAdd(item.id);
                  setSearch("");
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                {item.name}
              </button>
            ))}
            {search.trim() && available.length === 0 && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-800/30"
              >
                <Plus className="h-3 w-3" />
                {creating ? "Criando..." : `Criar "${search.trim().toUpperCase()}"`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Material Edit Sub-Dialog
// ──────────────────────────────────────────────

function MaterialEditDialog({
  material,
  detail,
  open,
  onOpenChange,
  onSaveName,
  onSaveDetail,
}: {
  material: RefMaterial;
  detail: MaterialDetailEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveName: (id: string, name: string) => Promise<void>;
  onSaveDetail: (updated: MaterialDetailEntry) => void;
}) {
  const [name, setName] = useState(material.name);
  const [qty, setQty] = useState(detail.quantity?.toString() ?? "");
  const [price, setPrice] = useState(detail.unitPrice?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(material.name);
      setQty(detail.quantity?.toString() ?? "");
      setPrice(detail.unitPrice?.toString() ?? "");
    }
  }, [open, material.name, detail.quantity, detail.unitPrice]);

  async function handleSave() {
    const nameChanged = name.trim() !== material.name;
    const newDetail: MaterialDetailEntry = {
      materialId: detail.materialId,
      quantity: qty ? Number(qty) : null,
      unitPrice: price ? Number(price) : null,
    };

    setSaving(true);
    try {
      if (nameChanged && name.trim()) {
        await onSaveName(material.id, name.trim());
      }
      onSaveDetail(newDetail);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar material");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-base">Editar Material</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Quantidade</Label>
              <Input type="number" step="1" min="0" value={qty} onChange={(e) => setQty(e.target.value)} className="h-8 text-sm" placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Preço unitário (R$)</Label>
              <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="h-8 text-sm" placeholder="0,00" />
            </div>
          </div>
          {(Number(qty) || 0) > 0 && (Number(price) || 0) > 0 && (
            <p className="text-xs text-zinc-400">
              Total: <span className="text-zinc-200 font-medium">{formatBRL((Number(qty) || 0) * (Number(price) || 0))}</span>
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Material Table Select (inline details table with autocomplete)
// ──────────────────────────────────────────────

function MaterialTableSelect({
  items,
  selected,
  details,
  onAdd,
  onRemove,
  onCreateNew,
  onDetailChange,
  onRenameMaterial,
  onMaterialRenamed,
}: {
  items: RefMaterial[];
  selected: string[];
  details: MaterialDetailEntry[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onCreateNew: (name: string) => Promise<void>;
  onDetailChange: (updated: MaterialDetailEntry[]) => void;
  onRenameMaterial: (id: string, name: string) => Promise<void>;
  onMaterialRenamed: (id: string, name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editDialogMaterialId, setEditDialogMaterialId] = useState<string | null>(null);

  const available = items.filter(
    (i) => !selected.includes(i.id) && (!search || includesNormalized(i.name, search)),
  );

  async function handleCreate() {
    if (!search.trim()) return;
    setCreating(true);
    try {
      await onCreateNew(search.trim().toUpperCase());
      setSearch("");
      setDropdownOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar material");
    } finally {
      setCreating(false);
    }
  }

  const editMat = editDialogMaterialId ? items.find((m) => m.id === editDialogMaterialId) : null;
  const editDetail = editDialogMaterialId ? details.find((d) => d.materialId === editDialogMaterialId) : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
        <Package className="h-3 w-3" />
        Materiais
        {selected.length > 0 && (
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[10px] h-4 px-1.5">
            {selected.length}
          </Badge>
        )}
      </div>
      <div className="rounded border border-zinc-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-900/60 border-b border-zinc-800">
              <th className="text-left px-1.5 py-1 text-zinc-500 font-medium">Material</th>
              <th className="text-center px-0.5 py-1 text-zinc-500 font-medium w-12">Qtd</th>
              <th className="text-center px-0.5 py-1 text-zinc-500 font-medium w-16">Unit R$</th>
              <th className="text-right px-1 py-1 text-zinc-500 font-medium w-14">Total</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {selected.length > 0 ? details.map((md, idx) => {
              const mat = items.find((m) => m.id === md.materialId);
              const lineTotal = (md.quantity ?? 0) * (md.unitPrice ?? 0);
              return (
                <tr key={md.materialId} className="border-b border-zinc-800/30 last:border-0 hover:bg-zinc-800/30">
                  <td className="px-1.5 py-0.5 text-zinc-300 truncate max-w-[120px]">
                    <span title={mat?.name}>{mat?.name ?? "?"}</span>
                  </td>
                  <td className="px-0.5 py-0.5">
                    <input
                      type="number" step="1" min="0"
                      value={md.quantity ?? ""}
                      onChange={(e) => {
                        const updated = [...details];
                        updated[idx] = { ...md, quantity: e.target.value ? Number(e.target.value) : null };
                        onDetailChange(updated);
                      }}
                      className="w-full bg-transparent border-0 text-xs text-center text-zinc-300 outline-none focus:bg-zinc-800/50 rounded px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-0.5 py-0.5">
                    <input
                      type="number" step="0.01" min="0"
                      value={md.unitPrice ?? ""}
                      onChange={(e) => {
                        const updated = [...details];
                        updated[idx] = { ...md, unitPrice: e.target.value ? Number(e.target.value) : null };
                        onDetailChange(updated);
                      }}
                      className="w-full bg-transparent border-0 text-xs text-center text-zinc-300 outline-none focus:bg-zinc-800/50 rounded px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0,00"
                    />
                  </td>
                  <td className="px-1 py-0.5 text-right text-zinc-500 text-[10px]">
                    {lineTotal > 0 ? lineTotal.toFixed(2) : "—"}
                  </td>
                  <td className="text-center">
                    <div className="flex items-center">
                      <button type="button" onClick={() => setEditDialogMaterialId(md.materialId)} className="text-zinc-600 hover:text-orange-400 p-0.5" title="Editar">
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button type="button" onClick={() => onRemove(md.materialId)} className="text-zinc-600 hover:text-red-400 p-0.5" title="Remover">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="text-zinc-600 text-center py-1.5">Nenhum material</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Edit material sub-dialog */}
      {editMat && editDetail && (
        <MaterialEditDialog
          material={editMat}
          detail={editDetail}
          open={!!editDialogMaterialId}
          onOpenChange={(open) => { if (!open) setEditDialogMaterialId(null); }}
          onSaveName={async (id, newName) => {
            await onRenameMaterial(id, newName);
            onMaterialRenamed(id, newName);
          }}
          onSaveDetail={(updated) => {
            const newDetails = details.map((d) => d.materialId === updated.materialId ? updated : d);
            onDetailChange(newDetails);
          }}
        />
      )}
      {/* Autocomplete add */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Adicionar material..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
          className="pl-8 h-8 text-sm border-zinc-800 bg-zinc-900/50"
        />
        {dropdownOpen && (search || available.length > 0) && (
          <div className="absolute z-20 w-full mt-1 max-h-32 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg">
            {available.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onAdd(item.id);
                  setSearch("");
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                {item.name}
              </button>
            ))}
            {search.trim() && available.length === 0 && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-800/30"
              >
                <Plus className="h-3 w-3" />
                {creating ? "Criando..." : `Criar "${search.trim().toUpperCase()}"`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Team Edit Sub-Dialog
// ──────────────────────────────────────────────

function TeamEditDialog({
  team,
  allEmployees,
  open,
  onOpenChange,
  onSaved,
}: {
  team: RefTeam;
  allEmployees: RefEmployee[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (teamId: string, newMembers: string[]) => void;
}) {
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      // Find employee IDs by matching names
      const ids = team.memberNames
        .map((name) => allEmployees.find((e) => e.shortName === name)?.id)
        .filter(Boolean) as string[];
      setMemberIds(ids);
      setSearch("");
    }
  }, [open, team.id]);

  const available = allEmployees.filter(
    (e) => !memberIds.includes(e.id) && (!search || includesNormalized(e.shortName, search)),
  );

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/equipes/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: team.name,
          memberIds,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar equipe");
      onSaved(team.id, memberIds);
      onOpenChange(false);
      toast.success("Equipe atualizada");
    } catch {
      toast.error("Erro ao salvar equipe");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-base">Editar Equipe: {team.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Membros</Label>
            {memberIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {memberIds.map((id) => {
                  const emp = allEmployees.find((e) => e.id === id);
                  return emp ? (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="bg-violet-600/10 text-violet-400 text-xs cursor-pointer hover:bg-violet-600/20"
                      onClick={() => setMemberIds(memberIds.filter((x) => x !== id))}
                    >
                      {emp.shortName}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Buscar funcionário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="max-h-32 overflow-y-auto space-y-0.5 rounded-lg border border-zinc-800 bg-zinc-900/30 p-1.5">
            {available.map((emp) => (
              <label
                key={emp.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-800/50 cursor-pointer text-xs"
              >
                <Checkbox
                  checked={memberIds.includes(emp.id)}
                  onCheckedChange={() => {
                    setMemberIds(
                      memberIds.includes(emp.id)
                        ? memberIds.filter((x) => x !== emp.id)
                        : [...memberIds, emp.id],
                    );
                  }}
                  className="h-3.5 w-3.5"
                />
                <span className="text-zinc-300">{emp.shortName}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  defaultDate,
  defaultTeamIds,
  externalOpen,
  onExternalOpenChange,
}: OSFormDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => onExternalOpenChange?.(v)
    : setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isEdit = !!initialData;

  // Track whether materialIds was provided in initialData (to avoid wiping data on auto-save)
  const materialIdsProvided = initialData?.materialIds !== undefined;

  // Global settings
  const globalPrecoKm = Number(settings?.precoKm) || DEFAULT_KM_PRICE;
  const globalPrecoHora = Number(settings?.precoHora) || DEFAULT_HOUR_PRICE;

  // Local refs state (for inline creates)
  const [localServiceTypes, setLocalServiceTypes] = useState(refs.serviceTypes);
  const [localMaterials, setLocalMaterials] = useState(refs.materials);
  const [localTeams, setLocalTeams] = useState(refs.teams ?? []);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  // Form state
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState(initialData?.type ?? "GENERAL");
  const [priority, setPriority] = useState(
    initialData?.priority?.toString() ?? "0",
  );
  const [warranty, setWarranty] = useState(initialData?.warranty ?? false);
  const [date, setDate] = useState(
    initialData?.date?.slice(0, 10) ?? defaultDate ?? "",
  );
  const [endDate, setEndDate] = useState(
    initialData?.endDate?.slice(0, 10) ?? "",
  );
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
  const [teamIds, setTeamIds] = useState<string[]>(
    initialData?.teamIds ?? defaultTeamIds ?? [],
  );

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
  const [extraHours, setExtraHours] = useState(
    initialData?.extraHours?.toString() ?? "",
  );
  const [materialCost, setMaterialCost] = useState(
    initialData?.materialCost?.toString() ?? "",
  );
  // Transport: always compute from km × price (read-only field)
  const [transportCost, setTransportCost] = useState(() => {
    const km = Number(initialData?.kmRodada ?? initialData?.kmIdaVolta ?? 0);
    const price = Number(initialData?.precoKm) || globalPrecoKm;
    const cost = km * price;
    return cost > 0 ? cost.toFixed(2) : "";
  });
  const [totalCost, setTotalCost] = useState(
    initialData?.totalCost?.toString() ?? "",
  );
  const [mealAllowance, setMealAllowance] = useState(
    initialData?.mealAllowance?.toString() ?? "",
  );
  const [overnightAllowance, setOvernightAllowance] = useState(
    initialData?.overnightAllowance?.toString() ?? "",
  );
  // Toll: use saved value if available, otherwise compute from store data
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

  // Horas/Dia (editable, defaults from initialData then global setting)
  const globalHorasDia = Number(settings?.horasDia) || DEFAULT_HOURS_PER_DAY;
  const [horasDia, setHorasDia] = useState(
    initialData?.horasDia?.toString() ?? globalHorasDia.toString(),
  );

  // Auto-calc control — preserve existing saved values (don't overwrite what's in the DB)
  const [manualOverride, setManualOverride] = useState<Record<string, boolean>>(
    () => {
      if (!initialData) return {};
      return {
        km: (initialData.kmIdaVolta ?? 0) > 0,
        kmRodada: (initialData.kmRodada ?? 0) > 0,
      };
    },
  );

  // Auto-save debounce ref
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirty = useRef(false);

  function resetForm() {
    setEditingName(false);
    setName(initialData?.name ?? "");
    setType(initialData?.type ?? "GENERAL");
    setPriority(initialData?.priority?.toString() ?? "0");
    setWarranty(initialData?.warranty ?? false);
    setDate(initialData?.date?.slice(0, 10) ?? defaultDate ?? "");
    setEndDate(initialData?.endDate?.slice(0, 10) ?? "");
    setVehicleId(initialData?.vehicleId ?? "none");
    setIsObra(initialData?.isObra ?? false);
    setStoreIds(initialData?.storeIds ?? []);
    setServiceTypeIds(initialData?.serviceTypeIds ?? []);
    setMaterialIds(initialData?.materialIds ?? []);
    setTeamIds(initialData?.teamIds ?? defaultTeamIds ?? []);
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
    setExtraHours(initialData?.extraHours?.toString() ?? "");
    setMaterialCost(initialData?.materialCost?.toString() ?? "");
    // Recompute transport from km × price
    const resetKm = Number(initialData?.kmRodada ?? initialData?.kmIdaVolta ?? 0);
    const resetPrice = Number(initialData?.precoKm) || globalPrecoKm;
    const resetTransport = resetKm * resetPrice;
    setTransportCost(resetTransport > 0 ? resetTransport.toFixed(2) : "");
    setTotalCost(initialData?.totalCost?.toString() ?? "");
    setMealAllowance(initialData?.mealAllowance?.toString() ?? "");
    setOvernightAllowance(initialData?.overnightAllowance?.toString() ?? "");
    // Use saved toll value, don't recompute from store data
    setTollDiscount(initialData?.tollDiscount?.toString() ?? "");
    setParking(initialData?.parking?.toString() ?? "");
    setMaterialDetailsList(initialData?.materialDetails ?? []);
    setHorasDia(initialData?.horasDia?.toString() ?? globalHorasDia.toString());
    setManualOverride(() => {
      if (!initialData) return {};
      return {
        km: (initialData.kmIdaVolta ?? 0) > 0,
        kmRodada: (initialData.kmRodada ?? 0) > 0,
      };
    });
    laborMountRef.current = true;
    tollMountRef.current = true;
    setShowDeleteConfirm(false);
    isDirty.current = false;
    setLocalServiceTypes(refs.serviceTypes);
    setLocalMaterials(refs.materials);
    setLocalTeams(refs.teams ?? []);
    setEditingTeamId(null);
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
      // Skip virtual assignments (from programação injection)
      if (initialData.scheduleAssignmentId && !initialData.scheduleAssignmentId.startsWith("virtual-")) {
        const endDateVal = endDate
          ? (() => {
              const d = new Date(endDate + "T12:00:00");
              d.setUTCHours(0, 0, 0, 0);
              return d.toISOString();
            })()
          : null;
        const schedRes = await fetch(
          `/api/team-schedule/${initialData.scheduleAssignmentId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endDate: endDateVal }),
          },
        );
        if (!schedRes.ok) {
          console.warn(
            "[Auto-save] Schedule assignment endDate update skipped (may not exist)",
          );
        }
      }
      isDirty.current = false;
      router.refresh();
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
    // Transport = km × price (tolls are tracked separately in pedágio field)
    const km = manualOverride.kmRodada ? Number(kmRodada) || 0 : totalKm;
    const price = Number(precoKm) || globalPrecoKm;
    const cost = km * price;
    setTransportCost(cost > 0 ? cost.toFixed(2) : "");
  }

  function recalcTransportFromKm(newKmRodada?: string, newPrecoKm?: string) {
    const km = Number(newKmRodada ?? kmRodada) || 0;
    const price = Number(newPrecoKm ?? precoKm) || globalPrecoKm;
    const cost = km * price;
    setTransportCost(cost > 0 ? cost.toFixed(2) : "");
    return cost;
  }

  function recalcMaterialCostFromDetails(details: MaterialDetailEntry[]) {
    // Material cost is always computed from material details (read-only field)
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
    // Total is ALWAYS computed from components — never manually overridden
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

  // Computed values for financial preview fields
  function getEmployeeCount(tIds: string[]): number {
    if (localTeams.length === 0) return 0;
    return tIds.reduce((acc, tid) => {
      const team = localTeams.find((t) => t.id === tid);
      return acc + (team?.memberNames.length ?? 0);
    }, 0);
  }

  function getDaysCount(): number {
    if (date && endDate) {
      const d1 = new Date(date + "T12:00:00");
      const d2 = new Date(endDate + "T12:00:00");
      const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
      return Math.max(1, diff);
    }
    return 1;
  }

  function computeManHours(tIds: string[], hpd: string): number {
    const employees = getEmployeeCount(tIds);
    const days = getDaysCount();
    return employees * (Number(hpd) || 0) * days;
  }

  function computeLaborCost(mh: number): number {
    return mh * globalPrecoHora;
  }

  // Auto-recalc labor + total whenever inputs change
  function recalcLaborAndTotal() {
    const mh = computeManHours(teamIds, horasDia);
    const cost = computeLaborCost(mh);
    setLaborCost(cost > 0 ? cost.toFixed(2) : "");
    recalcTotal({ labor: cost > 0 ? cost.toFixed(2) : "" });
  }

  // Recalc labor whenever teams, horasDia, date, or endDate change
  // Skip the initial mount to preserve saved values; recalc on user changes
  const laborMountRef = useRef(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (laborMountRef.current) {
      laborMountRef.current = false;
      return;
    }
    recalcLaborAndTotal();
  }, [teamIds.join(","), horasDia, date, endDate]);

  // Auto-fill toll from store DB when stores change (skip initial mount to preserve saved value)
  const tollMountRef = useRef(true);
  useEffect(() => {
    if (tollMountRef.current) {
      tollMountRef.current = false;
      return;
    }
    // When user changes stores, recalculate toll from store data
    const selectedStores = storeIds
      .map((id) => refs.stores.find((s) => s.id === id))
      .filter(Boolean) as RefStore[];
    const tolls = selectedStores.reduce(
      (acc, s) => acc + getStoreToll(s),
      0,
    );
    setTollDiscount(tolls > 0 ? tolls.toFixed(2) : "");
    recalcTotal({ toll: tolls > 0 ? tolls.toFixed(2) : "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeIds.join(",")]);

  // Auto-recalc transport whenever km or price changes
  useEffect(() => {
    const km = Number(kmRodada) || 0;
    const price = Number(precoKm) || globalPrecoKm;
    const cost = km * price;
    setTransportCost(cost > 0 ? cost.toFixed(2) : "");
  }, [kmRodada, precoKm]);

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
      status: initialData?.status ?? "NOT_STARTED",
      type,
      priority: Number(priority),
      warranty,
      date: date ? new Date(date + "T12:00:00").toISOString() : null,
      vehicleId: vehicleId === "none" ? null : vehicleId,
      isObra,
      storeIds,
      serviceTypeIds,
      teamIds,
    };

    // Only include materialIds if it was provided in initialData or user added materials.
    // This prevents auto-save from wiping materials when opened from views that don't load material data.
    if (materialIdsProvided || materialIds.length > 0) {
      payload.materialIds = materialIds;
    }

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
    const computedMH = computeManHours(teamIds, horasDia);
    if (computedMH > 0) payload.manHours = computedMH;
    if (extraHours) payload.extraHours = Number(extraHours);
    if (horasDia) payload.horasDia = Number(horasDia);

    if (
      (materialIdsProvided || materialIds.length > 0) &&
      materialDetailsList.length > 0
    ) {
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
        const endDateVal = endDate
          ? (() => {
              const d = new Date(endDate + "T12:00:00");
              d.setUTCHours(0, 0, 0, 0);
              return d.toISOString();
            })()
          : null;
        const schedRes = await fetch(
          `/api/team-schedule/${initialData.scheduleAssignmentId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endDate: endDateVal }),
          },
        );
        if (!schedRes.ok) {
          console.error(
            "[OS Form] Failed to update schedule assignment endDate",
          );
        }
      }
      toast.success(isEdit ? "OS atualizada" : "OS criada");
      setOpen(false);
      if (!isEdit) resetForm();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar OS");
    } finally {
      setLoading(false);
    }
  }

  // Prevent accidental close when form is dirty
  function handleInteractOutside(e: Event) {
    // Always prevent closing by clicking outside — only X button closes
    e.preventDefault();
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
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
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
            <div className="flex items-center gap-2" />
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* ═══ 3-COLUMN LAYOUT ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-5">
            {/* ── Column 1: Loja + Nome + Equipes + Garantia ── */}
            <div className="space-y-3">
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
                    (acc, s) => acc + getStoreToll(s),
                    0,
                  );
                  const newTransport = totalKm * price;
                  // Always recalculate toll when user changes stores
                  setTollDiscount(tolls > 0 ? tolls.toFixed(2) : "");
                  recalcTotal({
                    transport: newTransport > 0 ? newTransport.toFixed(2) : "",
                    toll: tolls > 0 ? tolls.toFixed(2) : "",
                  });
                  scheduleAutoSave();
                }}
                renderItem={(s) =>
                  `${s.sigla} - ${s.city}${s.kmRoundTrip ? ` (${s.kmRoundTrip}km)` : ""}`
                }
                searchFn={(s, q) =>
                  includesNormalized(s.sigla, q) ||
                  includesNormalized(s.city, q) ||
                  includesNormalized(s.code, q)
                }
              />

              {/* OS Name — greyed out, click pencil to edit */}
              <div className="space-y-1">
                <Label className="text-xs text-zinc-500 flex items-center gap-1">
                  Nome da OS
                  {!editingName && (
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      className="text-zinc-600 hover:text-zinc-300"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </Label>
                {editingName ? (
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      scheduleAutoSave();
                    }}
                    onBlur={() => { if (!name.trim()) { autoName(storeIds); } setEditingName(false); }}
                    placeholder="Nome da OS..."
                    className="h-8 text-sm"
                    autoFocus
                    required
                  />
                ) : (
                  <p className="text-sm text-zinc-500 truncate h-8 flex items-center" title={name || "Auto-preenchido pela loja"}>
                    {name || <span className="italic text-zinc-600">Auto-preenchido pela loja</span>}
                  </p>
                )}
              </div>

              {/* Teams selector */}
              {localTeams.length > 0 && (
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
                        const t = localTeams.find((x) => x.id === tid);
                        return t ? (
                          <Badge
                            key={tid}
                            variant="secondary"
                            className="bg-violet-600/10 text-violet-400 text-xs hover:bg-violet-600/20"
                          >
                            <span
                              className="cursor-pointer"
                              onClick={() => setEditingTeamId(tid)}
                              title="Editar equipe"
                            >
                              {t.name}
                              <Pencil className="h-2.5 w-2.5 ml-1 inline" />
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setTeamIds(teamIds.filter((x) => x !== tid));
                                scheduleAutoSave();
                              }}
                              className="ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="max-h-28 overflow-y-auto space-y-0.5 rounded-lg border border-zinc-800 bg-zinc-900/30 p-1.5">
                    {localTeams.map((t) => (
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
                  {/* Team edit sub-dialog */}
                  {editingTeamId && (() => {
                    const editTeam = localTeams.find((t) => t.id === editingTeamId);
                    return editTeam ? (
                      <TeamEditDialog
                        team={editTeam}
                        allEmployees={refs.employees}
                        open={!!editingTeamId}
                        onOpenChange={(v) => { if (!v) setEditingTeamId(null); }}
                        onSaved={(teamId, newMemberIds) => {
                          const newMemberNames = newMemberIds
                            .map((id) => refs.employees.find((e) => e.id === id)?.shortName)
                            .filter(Boolean) as string[];
                          setLocalTeams((prev) =>
                            prev.map((t) => t.id === teamId ? { ...t, memberNames: newMemberNames } : t),
                          );
                          scheduleAutoSave();
                        }}
                      />
                    ) : null;
                  })()}
                </div>
              )}

              {/* Toggles: Obra + Garantia */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <HardHat className="h-3 w-3" />
                    Obra
                    <InfoTip text="Marque se é uma obra. Obras não entram na medição semanal de serviços." />
                  </div>
                  <Switch
                    checked={isObra}
                    onCheckedChange={(v) => {
                      setIsObra(v);
                      scheduleAutoSave();
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    Garantia
                    <InfoTip text="Serviço em garantia — não gera cobrança para o cliente." />
                  </div>
                  <Checkbox
                    checked={warranty}
                    onCheckedChange={(v) => {
                      setWarranty(v === true);
                      scheduleAutoSave();
                    }}
                    className="h-3.5 w-3.5"
                  />
                </div>
              </div>
            </div>

            {/* ── Columns 2-3 wrapper ── */}
            <div className="lg:col-span-2 space-y-3">
              {/* ── Header row: Type, Priority, Date, EndDate ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Tipo</Label>
                  <Select
                    value={type}
                    onValueChange={(v) => {
                      setType(v);
                      scheduleAutoSave();
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">Geral</SelectItem>
                      <SelectItem value="ALARM">Alarme</SelectItem>
                      <SelectItem value="LED">LED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Prioridade</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => {
                      setPriority(v);
                      scheduleAutoSave();
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
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
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">
                    {initialData?.scheduleAssignmentId ? "Data Início" : "Data"}
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      scheduleAutoSave();
                    }}
                    className="h-8 text-sm"
                  />
                </div>
                {initialData?.scheduleAssignmentId ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Data Fim</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        scheduleAutoSave();
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                ) : (
                  <div />
                )}
              </div>

              <div className="border-t border-zinc-800" />

              {/* ── Inner 2-column: Serviços+Materiais | Report+KM ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-5">
                {/* ── Sub-column A: Serviços + Materiais ── */}
                <div className="space-y-3">
              {/* ── Services Table ── */}
              <ServiceTableSelect
                items={localServiceTypes}
                selected={serviceTypeIds}
                onAdd={(id) => {
                  setServiceTypeIds([...serviceTypeIds, id]);
                  scheduleAutoSave();
                }}
                onRemove={(id) => {
                  setServiceTypeIds(serviceTypeIds.filter((x) => x !== id));
                  scheduleAutoSave();
                }}
                onCreateNew={handleCreateServiceType}
                onRenameService={async (id, newName) => {
                  const res = await fetch(`/api/servicos/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newName }),
                  });
                  if (!res.ok) throw new Error("Erro ao renomear serviço");
                }}
                onServiceRenamed={(id, newName) => {
                  setLocalServiceTypes((prev) => prev.map((s) => s.id === id ? { ...s, name: newName } : s));
                  scheduleAutoSave();
                }}
              />

              {/* ── Materials Table ── */}
              <MaterialTableSelect
                items={localMaterials}
                selected={materialIds}
                details={materialDetailsList}
                onAdd={(id) => {
                  const newIds = [...materialIds, id];
                  setMaterialIds(newIds);
                  const newDetails = syncMaterialDetails(newIds, materialDetailsList);
                  setMaterialDetailsList(newDetails);
                  const cost = recalcMaterialCostFromDetails(newDetails);
                  recalcTotal({ material: cost && cost > 0 ? cost.toFixed(2) : materialCost });
                  scheduleAutoSave();
                }}
                onRemove={(id) => {
                  const newIds = materialIds.filter((x) => x !== id);
                  setMaterialIds(newIds);
                  const newDetails = syncMaterialDetails(newIds, materialDetailsList);
                  setMaterialDetailsList(newDetails);
                  const cost = recalcMaterialCostFromDetails(newDetails);
                  recalcTotal({ material: cost && cost > 0 ? cost.toFixed(2) : materialCost });
                  scheduleAutoSave();
                }}
                onCreateNew={handleCreateMaterial}
                onDetailChange={(updated) => {
                  setMaterialDetailsList(updated);
                  const cost = recalcMaterialCostFromDetails(updated);
                  recalcTotal({ material: cost && cost > 0 ? cost.toFixed(2) : "" });
                  scheduleAutoSave();
                }}
                onRenameMaterial={async (id, newName) => {
                  const res = await fetch(`/api/materiais/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newName }),
                  });
                  if (!res.ok) throw new Error("Erro ao atualizar material");
                  toast.success("Nome do material atualizado");
                }}
                onMaterialRenamed={(id, newName) => {
                  setLocalMaterials((prev) => prev.map((m) => m.id === id ? { ...m, name: newName } : m));
                  scheduleAutoSave();
                }}
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

                {/* ── Sub-column B: Report + KM + Financial ── */}
                <div className="space-y-3">
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
                      <InfoTip text="Número do chamado/ticket aberto pelo cliente." />
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
                    Serviços realizados
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
                      <InfoTip text="Quilometragem total de ida e volta até a(s) loja(s). Auto-preenchido com base no cadastro da loja." />
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
                            transport: cost && cost > 0 ? cost.toFixed(2) : "",
                          });
                        }
                        scheduleAutoSave();
                      }}
                      className="h-8 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">
                      KM Rodada
                      <InfoTip text="Quilometragem cobrada do cliente. Normalmente igual ao KM Ida/Volta." />
                    </Label>
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
                    <Label className="text-xs text-zinc-400">
                      Preço/KM
                      <InfoTip text={`Valor definido globalmente em Ajustes: R$ ${globalPrecoKm.toFixed(2)}/km. Para alterar, vá em Ajustes.`} />
                    </Label>
                    <Input
                      type="number"
                      value={precoKm}
                      disabled
                      className="h-8 text-sm bg-zinc-800/50 text-zinc-500"
                      placeholder={globalPrecoKm.toString()}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">
                      Custo Transp.
                      <InfoTip text="Calculado automaticamente: KM Rodada × Preço/KM. Não editável." />
                      <span className="text-emerald-500 text-[10px] ml-1">auto</span>
                    </Label>
                    <Input
                      type="number"
                      value={transportCost}
                      disabled
                      className="h-8 text-sm bg-zinc-800/50 text-zinc-500"
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
                  {/* Horas/Dia — the ONLY editable labor field */}
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">
                      Horas/Dia
                      <InfoTip text={`Horas trabalhadas por dia pela equipe. Padrão: ${globalHorasDia}h (configurável em Ajustes).`} />
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      value={horasDia}
                      onChange={(e) => {
                        setHorasDia(e.target.value);
                        scheduleAutoSave();
                      }}
                      className="h-8 text-sm"
                      placeholder={globalHorasDia.toString()}
                    />
                  </div>
                  {/* Nº Func. — greyed-out preview */}
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">
                      Nº Func.
                      <InfoTip text="Quantidade de funcionários nas equipes selecionadas. Calculado automaticamente." />
                    </Label>
                    <Input
                      type="number"
                      value={getEmployeeCount(teamIds)}
                      disabled
                      className="h-8 text-sm bg-zinc-800/50 text-zinc-500"
                    />
                  </div>
                  {/* Homem-Hora — greyed-out preview */}
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">
                      Homem-Hora
                      <InfoTip text={`Total de horas: Nº Func. × Horas/Dia × Dias. Ex: 2 técnicos × ${globalHorasDia}h × 1 dia = ${2 * globalHorasDia}h.`} />
                    </Label>
                    <Input
                      type="number"
                      value={computeManHours(teamIds, horasDia) || ""}
                      disabled
                      className="h-8 text-sm bg-zinc-800/50 text-zinc-500"
                    />
                  </div>
                  {/* Horas Extras */}
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">
                      H. Extras
                      <InfoTip text="Horas extras trabalhadas pela equipe. Somadas ao cálculo de mão de obra." />
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={extraHours}
                      onChange={(e) => {
                        setExtraHours(e.target.value);
                        scheduleAutoSave();
                      }}
                      className="h-8 text-sm"
                      placeholder="0"
                    />
                  </div>
                  {/* M.Obra — read-only, computed from teams × hours × price */}
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">
                      M.Obra
                      <InfoTip text={`Custo de mão de obra: Homem-Hora × R$ ${globalPrecoHora.toFixed(2)}/h (configurável em Ajustes).`} />
                    </Label>
                    <Input
                      type="number"
                      value={laborCost}
                      disabled
                      className="h-8 text-sm bg-zinc-800/50 text-zinc-500"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">
                      Material
                      <InfoTip text="Custo total de materiais. Calculado pela soma dos materiais adicionados acima." />
                      {materialCost && (
                        <span className="text-emerald-500 text-[10px] ml-1">auto</span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      value={materialCost}
                      disabled
                      className="h-8 text-sm bg-zinc-800/50 text-zinc-500"
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
                    <InfoTip text="Soma de todos os custos: Mão de Obra + Material + Transporte + Refeição + Pernoite + Pedágio + Estacionamento." />
                    <span className="text-emerald-500 text-[10px] ml-1">auto</span>
                  </Label>
                  <Input
                    type="number"
                    value={totalCost}
                    disabled
                    className="h-8 text-sm font-semibold border-emerald-800/50 bg-zinc-800/50 text-zinc-400"
                    placeholder="0,00"
                  />
                </div>
              </div>
              {/* close sub-column B */}
              </div>
            {/* close inner 2-col grid */}
            </div>
          {/* close cols 2-3 wrapper */}
          </div>
        {/* close outer 3-col grid */}
        </div>

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
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading
                  ? "Salvando..."
                  : isEdit
                    ? "Salvar alterações"
                    : "Criar OS"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
