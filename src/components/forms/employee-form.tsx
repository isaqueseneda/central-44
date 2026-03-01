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

interface EmployeeData {
  id: string;
  shortName: string;
  fullName?: string | null;
  phone?: string | null;
  rg?: string | null;
  isActive: boolean;
}

interface EmployeeFormProps {
  trigger: ReactNode;
  initialData?: EmployeeData;
}

export function EmployeeForm({ trigger, initialData }: EmployeeFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEdit = !!initialData;

  const [form, setForm] = useState({
    shortName: initialData?.shortName ?? "",
    fullName: initialData?.fullName ?? "",
    phone: initialData?.phone ?? "",
    rg: initialData?.rg ?? "",
    isActive: initialData?.isActive ?? true,
  });

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm({
      shortName: initialData?.shortName ?? "",
      fullName: initialData?.fullName ?? "",
      phone: initialData?.phone ?? "",
      rg: initialData?.rg ?? "",
      isActive: initialData?.isActive ?? true,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      shortName: form.shortName,
      fullName: form.fullName || null,
      phone: form.phone || null,
      rg: form.rg || null,
      isActive: form.isActive,
    };

    try {
      const url = isEdit
        ? `/api/funcionarios/${initialData.id}`
        : "/api/funcionarios";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar funcionario");
      }

      toast.success(
        isEdit
          ? "Funcionario atualizado com sucesso"
          : "Funcionario criado com sucesso"
      );
      setOpen(false);
      if (!isEdit) resetForm();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar funcionario");
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
            {isEdit ? "Editar Funcionario" : "Novo Funcionario"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="shortName">Nome Curto *</Label>
            <Input
              id="shortName"
              value={form.shortName}
              onChange={(e) => handleChange("shortName", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                value={form.rg}
                onChange={(e) => handleChange("rg", e.target.value)}
              />
            </div>
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
