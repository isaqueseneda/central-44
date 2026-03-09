import { prisma } from "@/lib/db";
import { TollUpdateClient } from "./toll-update-client";

export const dynamic = "force-dynamic";

export default async function AtualizarPedagiosPage() {
  const stores = await prisma.store.findMany({
    orderBy: { city: "asc" },
    select: {
      id: true,
      code: true,
      sigla: true,
      city: true,
      state: true,
      latitude: true,
      longitude: true,
      address: true,
      tollCostGoing: true,
      tollCostReturn: true,
      tollRoundTrip: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Atualizar Pedágios
        </h1>
        <p className="text-sm text-muted-foreground">
          Recalcule os custos de pedágio para todas as lojas usando dados reais
          do Google Routes
        </p>
      </div>
      <TollUpdateClient stores={stores} />
    </div>
  );
}
