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

interface ServiceTypeData {
  id: string;
  name: string;
  tags?: string[];
}

interface ServiceTypeFormProps {
  trigger: ReactNode;
  initialData?: ServiceTypeData;
}

export function ServiceTypeForm({
  trigger,
  initialData,
}: ServiceTypeFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEdit = !!initialData;

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    tags: initialData?.tags?.join(", ") ?? "",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm({
      name: initialData?.name ?? "",
      tags: initialData?.tags?.join(", ") ?? "",
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const tagsArray = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      name: form.name,
      tags: tagsArray,
    };

    try {
      const url = isEdit
        ? `/api/servicos/${initialData.id}`
        : "/api/servicos";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar servico");
      }

      toast.success(
        isEdit
          ? "Servico atualizado com sucesso"
          : "Servico criado com sucesso"
      );
      setOpen(false);
      if (!isEdit) resetForm();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar servico");
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
            {isEdit ? "Editar Tipo de Servico" : "Novo Tipo de Servico"}
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
            <Label htmlFor="tags">Tags (separadas por virgula)</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => handleChange("tags", e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
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
