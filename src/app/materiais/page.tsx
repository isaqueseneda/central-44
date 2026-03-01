import { getMaterials } from "@/lib/queries";
import { MaterialsTable } from "./materials-table";
import { MaterialsHeader } from "./materials-header";

export default async function MaterialsPage() {
  const materials = await getMaterials();

  const serialized = materials.map((m) => ({
    id: m.id,
    name: m.name,
    purchasePrice: m.purchasePrice,
    salePrice: m.salePrice,
    tags: m.tags,
  }));

  return (
    <div className="space-y-6">
      <MaterialsHeader />
      <MaterialsTable materials={serialized} />
    </div>
  );
}
