"use client";

import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoreForm } from "@/components/forms/store-form";

export function StoresHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-purple-400/10 p-2">
          <MapPin className="h-6 w-6 text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-100">Lojas</h1>
      </div>
      <StoreForm
        trigger={
          <Button>
            <Plus className="h-4 w-4" />
            Nova Loja
          </Button>
        }
      />
    </div>
  );
}
