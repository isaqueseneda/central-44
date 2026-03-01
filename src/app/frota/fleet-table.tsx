"use client";

import { useRouter } from "next/navigation";
import { Car, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Vehicle } from "@prisma/client";

interface FleetTableProps {
  vehicles: Vehicle[];
}

export function FleetTable({ vehicles }: FleetTableProps) {
  const router = useRouter();

  async function handleDelete(vehicle: Vehicle) {
    try {
      const res = await fetch(`/api/frota/${vehicle.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir veículo");
      }
      toast.success("Veículo excluído com sucesso");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir veículo");
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="text-lg text-zinc-100">
          {vehicles.length} veículo{vehicles.length !== 1 ? "s" : ""}{" "}
          cadastrado{vehicles.length !== 1 ? "s" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">Nome</TableHead>
              <TableHead className="text-zinc-400">Placa</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-zinc-400 w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow
                key={vehicle.id}
                className="border-zinc-800 hover:bg-zinc-800/50 group"
              >
                <TableCell className="font-medium text-zinc-200">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-orange-400" />
                    {vehicle.name}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-zinc-400">
                  {vehicle.licensePlate}
                </TableCell>
                <TableCell>
                  {vehicle.isActive ? (
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
                    <VehicleForm
                      trigger={
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      }
                      initialData={vehicle}
                    />
                    <ConfirmDialog
                      title="Excluir Veículo"
                      description={`Tem certeza que deseja excluir "${vehicle.name}" (${vehicle.licensePlate})? Esta ação não pode ser desfeita.`}
                      onConfirm={() => handleDelete(vehicle)}
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
  );
}
