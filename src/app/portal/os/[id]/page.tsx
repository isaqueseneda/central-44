import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import Link from "next/link";
import { getServiceOrderById } from "@/lib/queries";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: "Não Iniciada", color: "bg-zinc-100 text-zinc-600" },
  IN_PROGRESS: { label: "Em Andamento", color: "bg-blue-100 text-blue-700" },
  RETURN_VISIT: { label: "Retorno", color: "bg-amber-100 text-amber-700" },
  MEASUREMENT: { label: "Medição", color: "bg-purple-100 text-purple-700" },
  PAID: { label: "Pago", color: "bg-emerald-100 text-emerald-700" },
  REWORK: { label: "Retrabalho", color: "bg-red-100 text-red-700" },
};

function formatBRL(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PortalOSDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const os = await getServiceOrderById(id);

  if (!os) notFound();

  const status = statusLabels[os.status] ?? { label: os.status, color: "bg-zinc-100 text-zinc-600" };
  const stores = os.stores.map((s) => s.store);
  const employees = os.employees.map((e) => e.employee);
  const services = os.serviceTypes.map((s) => s.serviceType);
  const dateStr = os.date ? new Date(os.date).toLocaleDateString("pt-BR") : "—";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/portal"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            OS-{os.orderNumber}
          </h1>
          <p className="text-zinc-500 mt-1">{os.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${status.color}`}>
            {status.label}
          </span>
          <a
            href={`/api/ordens/${os.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </a>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Data" value={dateStr} />
        <InfoCard label="Veículo" value={os.vehicle?.name ?? "—"} />
        <InfoCard
          label="Loja(s)"
          value={stores.map((s) => `${s.sigla} — ${s.city}`).join("; ") || "—"}
        />
        <InfoCard
          label="Equipe"
          value={employees.map((e) => e.shortName).join(", ") || "—"}
        />
      </div>

      {/* Services */}
      {services.length > 0 && (
        <Section title="Serviços">
          <ul className="space-y-1">
            {services.map((s) => (
              <li key={s.id} className="text-zinc-700">{s.name}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Financial */}
      <Section title="Financeiro">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FinCard label="Mão de Obra" value={formatBRL(os.laborCost)} />
          <FinCard label="Material" value={formatBRL(os.materialCost)} />
          <FinCard label="Transporte" value={formatBRL(os.transportCost)} />
          <FinCard label="Refeição" value={formatBRL(os.mealAllowance)} />
          <FinCard label="Pernoite" value={formatBRL(os.overnightAllowance)} />
          <FinCard label="Pedágio" value={formatBRL(os.tollDiscount)} />
          <FinCard label="Estacion." value={formatBRL(os.parking)} />
          <FinCard
            label="TOTAL"
            value={formatBRL(os.totalCost)}
            highlight
          />
        </div>
      </Section>

      {/* Notes */}
      {os.servicesPerformed && (
        <Section title="Serviços Executados">
          <p className="text-zinc-700 whitespace-pre-wrap">{os.servicesPerformed}</p>
        </Section>
      )}

      {os.managerComment && (
        <Section title="Observações">
          <p className="text-zinc-700 whitespace-pre-wrap">{os.managerComment}</p>
        </Section>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3">
      <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-sm font-medium text-zinc-900">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <h3 className="text-sm font-semibold text-zinc-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function FinCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-blue-50 border border-blue-200" : "bg-zinc-50 border border-zinc-200"}`}>
      <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">{label}</div>
      <div className={`mt-1 text-sm font-bold ${highlight ? "text-blue-700" : "text-zinc-900"}`}>
        {value}
      </div>
    </div>
  );
}
