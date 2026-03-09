import { prisma } from "@/lib/db";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const settings = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajustes</h1>
        <p className="text-sm text-muted-foreground">
          Configurações globais do sistema
        </p>
      </div>
      <SettingsClient initialSettings={map} />
    </div>
  );
}
