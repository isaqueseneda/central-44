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
import { Crown, GripVertical, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";
import { toast } from "sonner";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface PersistentTeamRefs {
  employees: { id: string; shortName: string }[];
  vehicles: { id: string; name: string; licensePlate: string }[];
}

interface MemberDetail {
  employeeId: string;
  rank: number;
  isLeader: boolean;
}

interface TeamData {
  id: string;
  name: string;
  driverId: string | null;
  vehicleId: string | null;
  isActive: boolean;
  memberIds: string[];
  memberDetails?: MemberDetail[];
}

interface PersistentTeamFormProps {
  trigger: ReactNode;
  refs: PersistentTeamRefs;
  initialData?: TeamData;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function PersistentTeamForm({
  trigger,
  refs,
  initialData,
}: PersistentTeamFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [driverId, setDriverId] = useState(initialData?.driverId ?? "none");
  const [vehicleId, setVehicleId] = useState(initialData?.vehicleId ?? "none");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [memberDetails, setMemberDetails] = useState<MemberDetail[]>(
    initialData?.memberDetails ??
      initialData?.memberIds?.map((id, i) => ({
        employeeId: id,
        rank: i,
        isLeader: false,
      })) ??
      [],
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function resetForm() {
    setName(initialData?.name ?? "");
    setDriverId(initialData?.driverId ?? "none");
    setVehicleId(initialData?.vehicleId ?? "none");
    setIsActive(initialData?.isActive ?? true);
    setMemberDetails(
      initialData?.memberDetails ??
        initialData?.memberIds?.map((id, i) => ({
          employeeId: id,
          rank: i,
          isLeader: false,
        })) ??
        [],
    );
    setMemberSearch("");
    setDragIdx(null);
  }

  function toggleMember(id: string) {
    setMemberDetails((prev) => {
      const exists = prev.find((m) => m.employeeId === id);
      if (exists) {
        return prev.filter((m) => m.employeeId !== id);
      } else {
        return [
          ...prev,
          { employeeId: id, rank: prev.length, isLeader: false },
        ];
      }
    });
  }

  function toggleLeader(employeeId: string) {
    setMemberDetails((prev) =>
      prev.map((m) =>
        m.employeeId === employeeId
          ? { ...m, isLeader: !m.isLeader }
          : { ...m, isLeader: false },
      ),
    );
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setMemberDetails((prev) => {
      const items = [...prev];
      const dragged = items[dragIdx];
      items.splice(dragIdx, 1);
      items.splice(idx, 0, dragged);
      return items.map((m, i) => ({ ...m, rank: i }));
    });
    setDragIdx(idx);
  }

  function handleDragEnd() {
    setDragIdx(null);
  }

  const memberIds = memberDetails.map((m) => m.employeeId);

  const filteredEmployees = memberSearch
    ? refs.employees.filter((e) =>
        e.shortName.toLowerCase().includes(memberSearch.toLowerCase()),
      )
    : refs.employees;

  const selectedMembers = memberDetails
    .map((md) => {
      const emp = refs.employees.find((e) => e.id === md.employeeId);
      return emp ? { ...emp, ...md } : null;
    })
    .filter(Boolean) as ((typeof refs.employees)[0] & MemberDetail)[];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setLoading(true);

    const payload = {
      name: name.trim(),
      driverId: driverId === "none" ? null : driverId,
      vehicleId: vehicleId === "none" ? null : vehicleId,
      isActive,
      memberIds,
      memberDetails: memberDetails.map((m, i) => ({
        employeeId: m.employeeId,
        rank: i,
        isLeader: m.isLeader,
      })),
    };

    try {
      const url = isEdit ? `/api/equipes/${initialData.id}` : "/api/equipes";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar equipe");
      }

      toast.success(isEdit ? "Equipe atualizada" : "Equipe criada");
      setOpen(false);
      if (!isEdit) resetForm();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar equipe");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) resetForm();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Equipe" : "Nova Equipe"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="teamName">Nome *</Label>
            <Input
              id="teamName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Equipe Manutenção A"
              required
            />
          </div>

          {/* Driver + Vehicle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem motorista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem motorista</SelectItem>
                  {refs.employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.shortName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem veículo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem veículo</SelectItem>
                  {refs.vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.licensePlate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Members multi-select */}
          <div className="space-y-2">
            <Label>
              Membros
              {memberIds.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 bg-zinc-800 text-zinc-400 text-[10px] h-4 px-1.5"
                >
                  {memberIds.length}
                </Badge>
              )}
            </Label>

            {/* Selected members - ordered, draggable, with leader toggle */}
            {selectedMembers.length > 0 && (
              <div className="space-y-0.5 rounded-lg border border-zinc-800 bg-zinc-900/30 p-1.5">
                <div className="flex items-center gap-1 text-[10px] text-zinc-600 px-2 pb-1 mb-1 border-b border-zinc-800/50">
                  <span>
                    Arraste para reordenar • Clique 👑 para definir líder
                  </span>
                </div>
                {selectedMembers.map((emp, idx) => (
                  <div
                    key={emp.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-grab active:cursor-grabbing transition-colors ${
                      dragIdx === idx
                        ? "bg-zinc-700/50 ring-1 ring-sky-500/50"
                        : "hover:bg-zinc-800/50"
                    }`}
                  >
                    <GripVertical className="h-3 w-3 text-zinc-600 shrink-0" />
                    <span className="text-[10px] text-zinc-600 w-4">
                      {idx + 1}.
                    </span>
                    <span
                      className={`text-xs flex-1 ${emp.isLeader ? "text-amber-300 font-semibold" : "text-zinc-300"}`}
                    >
                      {emp.shortName}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleLeader(emp.id)}
                      className={`p-1.5 rounded transition-colors ${
                        emp.isLeader
                          ? "text-amber-400 bg-amber-600/20"
                          : "text-zinc-600 hover:text-amber-400 hover:bg-amber-600/10"
                      }`}
                      aria-label={
                        emp.isLeader ? "Remover líder" : "Definir como líder"
                      }
                    >
                      <Crown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMember(emp.id)}
                      className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                      aria-label="Remover membro"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Buscar funcionários..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-8 h-8 text-sm border-zinc-800 bg-zinc-900/50"
              />
            </div>

            {/* Options list */}
            <div className="max-h-40 overflow-y-auto space-y-0.5 rounded-lg border border-zinc-800 bg-zinc-900/30 p-1.5">
              {filteredEmployees.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-2">
                  Nenhum resultado
                </p>
              )}
              {filteredEmployees.map((emp) => (
                <label
                  key={emp.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-800/50 cursor-pointer text-xs"
                >
                  <Checkbox
                    checked={memberIds.includes(emp.id)}
                    onCheckedChange={() => toggleMember(emp.id)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-zinc-300">{emp.shortName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Active checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="teamIsActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            <Label htmlFor="teamIsActive" className="cursor-pointer">
              Ativa
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
