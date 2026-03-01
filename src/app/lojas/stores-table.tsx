"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { StoreForm } from "@/components/forms/store-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Store } from "@prisma/client";

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatKm(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR");
}

interface StoresTableProps {
  stores: Store[];
}

type StoreSortKey = "code" | "city" | "sigla" | "state" | "kmRoundTrip" | "tollRoundTrip";
type StoreSortDir = "asc" | "desc";

function SortableStoreHead({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: StoreSortKey;
  currentKey: StoreSortKey;
  currentDir: StoreSortDir;
  onSort: (key: StoreSortKey) => void;
  className?: string;
}) {
  const isActive = currentKey === sortKey;
  return (
    <TableHead
      className={`text-zinc-400 cursor-pointer select-none hover:text-zinc-200 transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3 w-3 text-blue-400" />
          ) : (
            <ArrowDown className="h-3 w-3 text-blue-400" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </TableHead>
  );
}

export function StoresTable({ stores }: StoresTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<StoreSortKey>("city");
  const [sortDir, setSortDir] = useState<StoreSortDir>("asc");

  function handleSort(key: StoreSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filteredStores = stores.filter(
    (store) =>
      store.city.toLowerCase().includes(search.toLowerCase()) ||
      store.code.toLowerCase().includes(search.toLowerCase()) ||
      store.sigla.toLowerCase().includes(search.toLowerCase()) ||
      store.address.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(store: Store) {
    try {
      const res = await fetch(`/api/lojas/${store.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir loja");
      }
      toast.success("Loja excluída com sucesso");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir loja");
    }
  }

  return (
    <>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Buscar por cidade, código, sigla ou endereço..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 border-zinc-800 bg-zinc-900/50"
        />
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">
            {filteredStores.length} loja{filteredStores.length !== 1 ? "s" : ""}{" "}
            cadastrada{filteredStores.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">#</TableHead>
                <SortableStoreHead label="Código" sortKey="code" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableStoreHead label="Cidade" sortKey="city" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableStoreHead label="Sigla" sortKey="sigla" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <TableHead className="text-zinc-400">Endereço</TableHead>
                <SortableStoreHead label="UF" sortKey="state" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <TableHead className="text-zinc-400">Fone</TableHead>
                <SortableStoreHead label="KM I/V" sortKey="kmRoundTrip" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                <SortableStoreHead label="Pedágio I/V" sortKey="tollRoundTrip" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                <TableHead className="text-zinc-400 w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...filteredStores].sort((a, b) => {
                const dir = sortDir === "asc" ? 1 : -1;
                switch (sortKey) {
                  case "code":
                    return (a.storeNumber ?? 0) - (b.storeNumber ?? 0) !== 0
                      ? ((a.storeNumber ?? 0) - (b.storeNumber ?? 0)) * dir
                      : a.code.localeCompare(b.code) * dir;
                  case "city":
                    return a.city.localeCompare(b.city) * dir;
                  case "sigla":
                    return a.sigla.localeCompare(b.sigla) * dir;
                  case "state":
                    return a.state.localeCompare(b.state) * dir;
                  case "kmRoundTrip":
                    return ((a.kmRoundTrip ?? 0) - (b.kmRoundTrip ?? 0)) * dir;
                  case "tollRoundTrip":
                    return ((a.tollRoundTrip ?? 0) - (b.tollRoundTrip ?? 0)) * dir;
                  default:
                    return 0;
                }
              }).map((store, index) => (
                <TableRow
                  key={store.id}
                  className="border-zinc-800 hover:bg-zinc-800/50 group"
                >
                  <TableCell className="font-mono text-zinc-500">
                    {index + 1}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {store.storeNumber ?? store.code}
                  </TableCell>
                  <TableCell className="font-medium text-zinc-200">
                    {store.city}
                  </TableCell>
                  <TableCell className="text-zinc-400">{store.sigla}</TableCell>
                  <TableCell className="text-zinc-400 max-w-[200px] truncate">
                    {store.address}
                  </TableCell>
                  <TableCell className="text-zinc-400">{store.state}</TableCell>
                  <TableCell className="text-zinc-400">
                    {store.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-zinc-400">
                    {formatKm(store.kmRoundTrip)}
                  </TableCell>
                  <TableCell className="text-right text-zinc-300 font-medium">
                    {formatCurrency(store.tollRoundTrip)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <StoreForm
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                        initialData={store}
                      />
                      <ConfirmDialog
                        title="Excluir Loja"
                        description={`Tem certeza que deseja excluir a loja "${store.city} (${store.sigla})"? Esta ação não pode ser desfeita.`}
                        onConfirm={() => handleDelete(store)}
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
