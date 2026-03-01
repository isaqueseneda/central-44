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
import { ServiceTypeForm } from "@/components/forms/service-type-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ServiceRow {
  id: string;
  name: string;
  tags: string[];
}

const tagColors: Record<string, string> = {
  alarme: "bg-red-600/20 text-red-400",
  sensor: "bg-sky-600/20 text-sky-400",
  elétrica: "bg-yellow-600/20 text-yellow-400",
  gôndola: "bg-purple-600/20 text-purple-400",
  cabo: "bg-orange-600/20 text-orange-400",
  bateria: "bg-green-600/20 text-green-400",
  telefonia: "bg-blue-600/20 text-blue-400",
  vídeo: "bg-pink-600/20 text-pink-400",
  câmera: "bg-pink-600/20 text-pink-400",
  hidráulica: "bg-cyan-600/20 text-cyan-400",
  placa: "bg-amber-600/20 text-amber-400",
  teste: "bg-zinc-600/20 text-zinc-400",
  sirene: "bg-rose-600/20 text-rose-400",
};

export function ServicesTable({ services }: { services: ServiceRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleDelete(service: ServiceRow) {
    try {
      const res = await fetch(`/api/servicos/${service.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir serviço");
      }
      toast.success("Serviço excluído com sucesso");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir serviço");
    }
  }

  return (
    <>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Buscar serviço ou tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 border-zinc-800 bg-zinc-900/50"
        />
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">
            {filtered.length} serviço{filtered.length !== 1 ? "s" : ""}{" "}
            cadastrado{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Nome</TableHead>
                <TableHead className="text-zinc-400">Tags</TableHead>
                <TableHead className="text-zinc-400 w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((service) => (
                <TableRow
                  key={service.id}
                  className="border-zinc-800 hover:bg-zinc-800/50 group"
                >
                  <TableCell className="font-medium text-zinc-200">
                    {service.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {service.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                            tagColors[tag] ?? "bg-zinc-700 text-zinc-300"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ServiceTypeForm
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                        initialData={service}
                      />
                      <ConfirmDialog
                        title="Excluir Serviço"
                        description={`Tem certeza que deseja excluir "${service.name}"? Esta ação não pode ser desfeita.`}
                        onConfirm={() => handleDelete(service)}
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
