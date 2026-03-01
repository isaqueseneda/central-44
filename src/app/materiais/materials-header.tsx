"use client";

import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaterialForm } from "@/components/forms/material-form";

export function MaterialsHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-amber-400/10 p-2">
          <Package className="h-6 w-6 text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-100">Materiais</h1>
      </div>
      <MaterialForm
        trigger={
          <Button>
            <Plus className="h-4 w-4" />
            Novo Material
          </Button>
        }
      />
    </div>
  );
}
