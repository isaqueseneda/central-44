"use client";

import { Wrench, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceTypeForm } from "@/components/forms/service-type-form";

export function ServicesHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-400/10 p-2">
          <Wrench className="h-6 w-6 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-100">Serviços</h1>
      </div>
      <ServiceTypeForm
        trigger={
          <Button>
            <Plus className="h-4 w-4" />
            Novo Serviço
          </Button>
        }
      />
    </div>
  );
}
