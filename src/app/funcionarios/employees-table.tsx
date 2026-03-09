"use client";

import { EmployeeForm } from "@/components/forms/employee-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { includesNormalized } from "@/lib/utils";
import type { Employee } from "@prisma/client";
import { Pencil, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface EmployeesTableProps {
  employees: Employee[];
}

export function EmployeesTable({ employees }: EmployeesTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredEmployees = employees.filter(
    (employee) =>
      includesNormalized(employee.shortName, search) ||
      (employee.fullName && includesNormalized(employee.fullName, search)),
  );

  async function handleDelete(employee: Employee) {
    try {
      const res = await fetch(`/api/funcionarios/${employee.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir funcionário");
      }
      toast.success("Funcionário excluído com sucesso");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir funcionário");
    }
  }

  return (
    <>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 border-zinc-800 bg-zinc-900/50"
        />
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">
            {filteredEmployees.length} funcionário
            {filteredEmployees.length !== 1 ? "s" : ""} cadastrado
            {filteredEmployees.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Nome</TableHead>
                <TableHead className="text-zinc-400">Nome Completo</TableHead>
                <TableHead className="text-zinc-400">Telefone</TableHead>
                <TableHead className="text-zinc-400">RG</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400 w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="border-zinc-800 hover:bg-zinc-800/50 group"
                >
                  <TableCell className="font-medium text-zinc-200">
                    {employee.shortName}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {employee.fullName ?? "—"}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {employee.phone ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-zinc-400">
                    {employee.rg ?? "—"}
                  </TableCell>
                  <TableCell>
                    {employee.isActive ? (
                      <Badge className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge className="bg-red-400/10 text-red-400 border-red-400/20">
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EmployeeForm
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-500 hover:text-zinc-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                        initialData={employee}
                      />
                      <ConfirmDialog
                        title="Excluir Funcionário"
                        description={`Tem certeza que deseja excluir "${employee.shortName}"? Esta ação não pode ser desfeita.`}
                        onConfirm={() => handleDelete(employee)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-500 hover:text-red-400"
                          >
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
