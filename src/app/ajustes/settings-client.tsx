"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SettingField {
  key: string;
  label: string;
  description: string;
  type: "number" | "string";
  placeholder: string;
  suffix?: string;
}

const SETTINGS_FIELDS: SettingField[] = [
  {
    key: "precoKm",
    label: "Preço por KM",
    description: "Valor padrão cobrado por quilômetro rodado nas ordens de serviço.",
    type: "number",
    placeholder: "1.60",
    suffix: "R$/km",
  },
  {
    key: "precoHora",
    label: "Preço da Hora",
    description: "Valor padrão da hora de mão de obra.",
    type: "number",
    placeholder: "48.00",
    suffix: "R$/h",
  },
  {
    key: "horasDia",
    label: "Horas por Dia",
    description: "Quantidade padrão de horas trabalhadas por dia. Usado para calcular homem-hora nas ordens de serviço.",
    type: "number",
    placeholder: "9",
    suffix: "h/dia",
  },
];

interface SettingsClientProps {
  initialSettings: Record<string, string>;
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [values, setValues] = useState<Record<string, string>>(initialSettings);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      const updated = await res.json();
      setValues(updated);
      toast.success("Ajustes salvos com sucesso");
    } catch {
      toast.error("Erro ao salvar ajustes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      {SETTINGS_FIELDS.map((field) => (
        <div
          key={field.key}
          className="rounded-lg border border-border bg-card p-4 space-y-2"
        >
          <Label className="text-sm font-medium">{field.label}</Label>
          <p className="text-xs text-muted-foreground">{field.description}</p>
          <div className="flex items-center gap-2">
            <Input
              type={field.type}
              step={field.type === "number" ? "0.01" : undefined}
              value={values[field.key] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              placeholder={field.placeholder}
              className="w-40"
            />
            {field.suffix && (
              <span className="text-xs text-muted-foreground">
                {field.suffix}
              </span>
            )}
          </div>
        </div>
      ))}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-1" />
        )}
        {saving ? "Salvando..." : "Salvar ajustes"}
      </Button>
    </div>
  );
}
