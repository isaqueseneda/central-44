"use client";

import { ReactNode, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface VehicleData {
  id: string;
  name: string;
  licensePlate: string;
  isActive: boolean;
}

interface VehicleFormProps {
  trigger: ReactNode;
  initialData?: VehicleData;
}

export function VehicleForm({ trigger, initialData }: VehicleFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEdit = !!initialData;

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    licensePlate: initialData?.licensePlate ?? "",
    isActive: initialData?.isActive ?? true,
  });

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm({
      name: initialData?.name ?? "",
      licensePlate: initialData?.licensePlate ?? "",
      isActive: initialData?.isActive ?? true,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: form.name,
      licensePlate: form.licensePlate,
      isActive: form.isActive,
    };

    try {
      const url = isEdit ? `/api/frota/${initialData.id}` : "/api/frota";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar veiculo");
      }

      toast.success(
        isEdit
          ? "Veiculo atualizado com sucesso"
          : "Veiculo criado com sucesso"
      );
      setOpen(false);
      if (!isEdit) resetForm();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar veiculo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && !isEdit) resetForm();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Veiculo" : "Novo Veiculo"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licensePlate">Placa *</Label>
            <Input
              id="licensePlate"
              value={form.licensePlate}
              onChange={(e) => handleChange("licensePlate", e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={form.isActive}
              onCheckedChange={(checked) =>
                handleChange("isActive", checked === true)
              }
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Ativo
            </Label>
          </div>

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
