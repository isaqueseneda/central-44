import { prisma } from "@/lib/db";
import { ReviewClient } from "./review-client";

export const dynamic = "force-dynamic";

export default async function RevisarDadosPage() {
  const suggestions = await prisma.dataSuggestion.findMany({
    where: { status: "PENDING" },
    include: { store: true },
    orderBy: [{ store: { city: "asc" } }, { field: "asc" }],
  });

  // Group by store
  const byStore = new Map<
    string,
    {
      store: { id: string; code: string; sigla: string; city: string; state: string };
      items: typeof suggestions;
    }
  >();

  for (const s of suggestions) {
    if (!byStore.has(s.storeId)) {
      byStore.set(s.storeId, {
        store: {
          id: s.store.id,
          code: s.store.code,
          sigla: s.store.sigla,
          city: s.store.city,
          state: s.store.state,
        },
        items: [],
      });
    }
    byStore.get(s.storeId)!.items.push(s);
  }

  const grouped = Array.from(byStore.values()).map((g) => ({
    store: g.store,
    suggestions: g.items.map((s) => ({
      id: s.id,
      field: s.field,
      oldValue: s.oldValue,
      newValue: s.newValue,
      source: s.source,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Revisar Dados</h1>
        <p className="text-sm text-muted-foreground">
          Sugestões de dados para lojas — aprove ou rejeite cada alteração
        </p>
      </div>
      <ReviewClient groups={grouped} />
    </div>
  );
}
