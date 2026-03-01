"use client";

import { useState } from "react";
import { FileDown, Calendar } from "lucide-react";

export default function PortalMedicaoPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function setThisWeek() {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const fri = new Date(mon);
    fri.setDate(mon.getDate() + 4);
    setFrom(mon.toISOString().slice(0, 10));
    setTo(fri.toISOString().slice(0, 10));
  }

  function setThisMonth() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFrom(first.toISOString().slice(0, 10));
    setTo(last.toISOString().slice(0, 10));
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Resumo de Medição</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Selecione o período para gerar o relatório de medição em PDF.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 p-6 space-y-4">
        {/* Quick buttons */}
        <div className="flex gap-2">
          <button
            onClick={setThisWeek}
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Esta Semana
          </button>
          <button
            onClick={setThisMonth}
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Este Mês
          </button>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">De</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Até</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Download button */}
        <button
          disabled={!from || !to}
          onClick={() => {
            if (from && to) {
              window.open(`/api/ordens/medicao/pdf?from=${from}&to=${to}`, "_blank");
            }
          }}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown className="h-4 w-4" />
          Gerar PDF de Medição
        </button>
      </div>
    </div>
  );
}
