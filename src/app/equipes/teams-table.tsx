"use client";

import {
  PersistentTeamForm,
  type PersistentTeamRefs,
} from "@/components/forms/persistent-team-form";
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
import { Pencil, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface SerializedTeam {
  id: string;
  name: string;
  driverId: string | null;
  driverName: string | null;
  vehicleId: string | null;
  vehicleName: string | null;
  isActive: boolean;
  memberIds: string[];
  memberNames: string[];
  members: {
    employeeId: string;
    shortName: string;
    rank: number;
    isLeader: boolean;
  }[];
}

interface TeamsTableProps {
  teams: SerializedTeam[];
  refs: PersistentTeamRefs;
}

export function TeamsTable({ teams, refs }: TeamsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.memberNames.some((m) =>
        m.toLowerCase().includes(search.toLowerCase()),
      ) ||
      (t.driverName &&
        t.driverName.toLowerCase().includes(search.toLowerCase())),
  );

  async function handleDelete(team: SerializedTeam) {
    try {
      const res = await fetch(`/api/equipes/${team.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir equipe");
      }
      toast.success("Equipe excluída com sucesso");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir equipe");
    }
  }

  return (
    <>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Buscar por nome ou membro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 border-zinc-800 bg-zinc-900/50"
        />
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">
            {filtered.length} equipe{filtered.length !== 1 ? "s" : ""}{" "}
            cadastrada{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Nome</TableHead>
                <TableHead className="text-zinc-400">Motorista</TableHead>
                <TableHead className="text-zinc-400">Veículo</TableHead>
                <TableHead className="text-zinc-400">Membros</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400 w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((team) => (
                <TableRow
                  key={team.id}
                  className="border-zinc-800 hover:bg-zinc-800/50 group"
                >
                  <TableCell className="font-medium text-zinc-200">
                    {team.name}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {team.driverName ?? "—"}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {team.vehicleName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {team.members.length > 0 ? (
                        team.members.map((m) => (
                          <Badge
                            key={m.employeeId}
                            variant="secondary"
                            className={`text-xs ${
                              m.isLeader
                                ? "bg-amber-600/20 text-amber-300 border border-amber-600/30"
                                : "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {m.isLeader && "👑 "}
                            {m.shortName}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-600 italic">
                          Sem membros
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {team.isActive ? (
                      <Badge className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
                        Ativa
                      </Badge>
                    ) : (
                      <Badge className="bg-red-400/10 text-red-400 border-red-400/20">
                        Inativa
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <PersistentTeamForm
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-500 hover:text-zinc-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                        refs={refs}
                        initialData={{
                          id: team.id,
                          name: team.name,
                          driverId: team.driverId,
                          vehicleId: team.vehicleId,
                          isActive: team.isActive,
                          memberIds: team.members.map((m) => m.employeeId),
                          memberDetails: team.members.map((m) => ({
                            employeeId: m.employeeId,
                            rank: m.rank,
                            isLeader: m.isLeader,
                          })),
                        }}
                      />
                      <ConfirmDialog
                        title="Excluir Equipe"
                        description={`Tem certeza que deseja excluir "${team.name}"? Esta ação não pode ser desfeita.`}
                        onConfirm={() => handleDelete(team)}
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
