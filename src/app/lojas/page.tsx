import { MapPin } from "lucide-react";
import { getStores } from "@/lib/queries";
import { StoresTable } from "./stores-table";
import { StoresHeader } from "./stores-header";

export default async function StoresPage() {
  const stores = await getStores();

  return (
    <div className="space-y-6">
      <StoresHeader />
      <StoresTable stores={stores} />
    </div>
  );
}
