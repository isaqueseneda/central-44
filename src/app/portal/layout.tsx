import { Zap } from "lucide-react";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span className="text-lg font-bold text-zinc-900">
              Central Engenharia Elétrica
            </span>
          </div>
          <span className="text-xs text-zinc-400">Portal do Cliente</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Central Engenharia Elétrica. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
