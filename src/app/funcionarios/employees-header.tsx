"use client";

import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeForm } from "@/components/forms/employee-form";

export function EmployeesHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-400/10 p-2">
          <Users className="h-6 w-6 text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-100">Funcionários</h1>
      </div>
      <EmployeeForm
        trigger={
          <Button>
            <Plus className="h-4 w-4" />
            Novo Funcionário
          </Button>
        }
      />
    </div>
  );
}
