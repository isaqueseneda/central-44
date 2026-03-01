"use client";

import { Truck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleForm } from "@/components/forms/vehicle-form";

export function FleetHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-orange-400/10 p-2">
          <Truck className="h-6 w-6 text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-100">Frota</h1>
      </div>
      <VehicleForm
        trigger={
          <Button>
            <Plus className="h-4 w-4" />
            Novo Veículo
          </Button>
        }
      />
    </div>
  );
}
