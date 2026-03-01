"use client";

import { UsersRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PersistentTeamForm,
  type PersistentTeamRefs,
} from "@/components/forms/persistent-team-form";

export function TeamsHeader({ refs }: { refs: PersistentTeamRefs }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-violet-400/10 p-2">
          <UsersRound className="h-6 w-6 text-violet-400" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-100">Equipes</h1>
      </div>
      <PersistentTeamForm
        trigger={
          <Button>
            <Plus className="h-4 w-4" />
            Nova Equipe
          </Button>
        }
        refs={refs}
      />
    </div>
  );
}
