"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MaterialForm } from "@/components/forms/material-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface MaterialRow {
  id: string;
  name: string;
  purchasePrice: number | null;
  salePrice: number | null;
  tags: string[];
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function marginBadge(purchase: number, sale: number) {
  if (purchase === 0) return null;
  const margin = ((sale - purchase) / purchase) * 100;
  let colorClass = "bg-red-600/20 text-red-400";
  if (margin > 50) {
    colorClass = "bg-emerald-600/20 text-emerald-400";
  } else if (margin >= 20) {
    colorClass = "bg-yellow-600/20 text-yellow-400";
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${colorClass}`}
    >
      {margin >= 0 ? "+" : ""}
      {margin.toFixed(0)}%
    </span>
  );
}

export function MaterialsTable({ materials }: { materials: MaterialRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(material: MaterialRow) {
    try {
      const res = await fetch(`/api/materiais/${material.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir material");
      }
      toast.success("Material excluído com sucesso");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir material");
    }
  }

  return (
    <>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Buscar material..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 border-zinc-800 bg-zinc-900/50"
        />
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">
            {filtered.length} materia{filtered.length !== 1 ? "is" : "l"}{" "}
            cadastrado{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Nome</TableHead>
                <TableHead className="text-zinc-400 text-right">
                  Compra (R$)
                </TableHead>
                <TableHead className="text-zinc-400 text-right">
                  Venda (R$)
                </TableHead>
                <TableHead className="text-zinc-400">Margem</TableHead>
                <TableHead className="text-zinc-400 w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((material) => (
                <TableRow
                  key={material.id}
                  className="border-zinc-800 hover:bg-zinc-800/50 group"
                >
                  <TableCell className="font-medium text-zinc-200">
                    {material.name}
                  </TableCell>
                  <TableCell className="text-right text-zinc-400">
                    {material.purchasePrice != null
                      ? formatBRL(material.purchasePrice)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-zinc-300 font-medium">
                    {material.salePrice != null
                      ? formatBRL(material.salePrice)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {material.purchasePrice != null &&
                    material.salePrice != null &&
                    material.purchasePrice > 0
                      ? marginBadge(material.purchasePrice, material.salePrice)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MaterialForm
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                        initialData={material}
                      />
                      <ConfirmDialog
                        title="Excluir Material"
                        description={`Tem certeza que deseja excluir "${material.name}"? Esta ação não pode ser desfeita.`}
                        onConfirm={() => handleDelete(material)}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
