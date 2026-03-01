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

interface StoreData {
  id: string;
  code: string;
  sigla: string;
  city: string;
  state: string;
  address: string;
  cep?: string | null;
  phone?: string | null;
  cnpj?: string | null;
  kmRoundTrip?: number | null;
  tollRoundTrip?: number | null;
}

interface StoreFormProps {
  trigger: ReactNode;
  initialData?: StoreData;
}

export function StoreForm({ trigger, initialData }: StoreFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEdit = !!initialData;

  const [form, setForm] = useState({
    code: initialData?.code ?? "",
    sigla: initialData?.sigla ?? "",
    city: initialData?.city ?? "",
    state: initialData?.state ?? "",
    address: initialData?.address ?? "",
    cep: initialData?.cep ?? "",
    phone: initialData?.phone ?? "",
    cnpj: initialData?.cnpj ?? "",
    kmRoundTrip: initialData?.kmRoundTrip ?? "",
    tollRoundTrip: initialData?.tollRoundTrip ?? "",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm({
      code: initialData?.code ?? "",
      sigla: initialData?.sigla ?? "",
      city: initialData?.city ?? "",
      state: initialData?.state ?? "",
      address: initialData?.address ?? "",
      cep: initialData?.cep ?? "",
      phone: initialData?.phone ?? "",
      cnpj: initialData?.cnpj ?? "",
      kmRoundTrip: initialData?.kmRoundTrip ?? "",
      tollRoundTrip: initialData?.tollRoundTrip ?? "",
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      code: form.code,
      sigla: form.sigla,
      city: form.city,
      state: form.state,
      address: form.address,
      cep: form.cep || null,
      phone: form.phone || null,
      cnpj: form.cnpj || null,
      kmRoundTrip: form.kmRoundTrip ? Number(form.kmRoundTrip) : null,
      tollRoundTrip: form.tollRoundTrip ? Number(form.tollRoundTrip) : null,
    };

    try {
      const url = isEdit ? `/api/lojas/${initialData.id}` : "/api/lojas";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar loja");
      }

      toast.success(isEdit ? "Loja atualizada com sucesso" : "Loja criada com sucesso");
      setOpen(false);
      if (!isEdit) resetForm();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar loja");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && !isEdit) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Loja" : "Nova Loja"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Codigo *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sigla">Sigla *</Label>
              <Input
                id="sigla"
                value={form.sigla}
                onChange={(e) => handleChange("sigla", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">UF *</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => handleChange("state", e.target.value)}
                maxLength={2}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereco *</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={form.cep}
                onChange={(e) => handleChange("cep", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={form.cnpj}
              onChange={(e) => handleChange("cnpj", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kmRoundTrip">KM Ida e Volta</Label>
              <Input
                id="kmRoundTrip"
                type="number"
                step="0.01"
                value={form.kmRoundTrip}
                onChange={(e) => handleChange("kmRoundTrip", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tollRoundTrip">Pedagio Ida e Volta</Label>
              <Input
                id="tollRoundTrip"
                type="number"
                step="0.01"
                value={form.tollRoundTrip}
                onChange={(e) => handleChange("tollRoundTrip", e.target.value)}
              />
            </div>
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
