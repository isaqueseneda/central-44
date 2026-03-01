import { prisma } from "@/lib/db";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function fmt(v: number | null | undefined): string {
  if (v == null) return "0,00";
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtInt(v: number | null | undefined): string {
  if (v == null) return "0";
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to"); // YYYY-MM-DD
  const status = searchParams.get("status"); // optional filter

  if (!from || !to) {
    return NextResponse.json(
      { error: "Query params 'from' and 'to' are required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T23:59:59");

  // Fetch OS in the date range
  const where: any = {
    date: { gte: fromDate, lte: toDate },
    isObra: false, // Exclude obra orders from medição
  };
  if (status) {
    where.status = status;
  }

  const orders = await prisma.serviceOrder.findMany({
    where,
    include: {
      stores: { include: { store: true } },
      employees: { include: { employee: true } },
      vehicle: true,
    },
    orderBy: { orderNumber: "asc" },
  });

  if (orders.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma OS encontrada no período" },
      { status: 404 },
    );
  }

  // ─── Build PDF (Landscape A4) ───
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;
  let y = margin;

  // ─── HEADER ───
  // Company logo area
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("CENTRAL", margin + 2, y + 6);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("ENGENHARIA ELÉTRICA", margin + 2, y + 9);

  // Period and client
  const months = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO",
  ];

  const dayFrom = fromDate.getDate();
  const dayTo = toDate.getDate();
  const monthName = months[fromDate.getMonth()];
  const year = fromDate.getFullYear();
  const periodStr = `PERIODO: ${dayFrom} A ${dayTo} DE ${monthName} ${year}`;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(periodStr, margin + 50, y + 7);

  // Client name (right)
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE: LOJAS CEM", pageW - margin - 2, y + 8, { align: "right" });

  y += 14;

  // ─── TABLE DATA ───
  type Row = {
    orderNumber: number;
    filial: string;
    city: string;
    idaVolta: number;
    kmRodado: number;
    kmCost: number;
    manHours: number;
    laborCost: number;
    materialCost: number;
    refeicao: number;
    pernoite: number;
    pedagio: number;
    estac: number;
    total: number;
  };

  const rows: Row[] = orders.map((o) => {
    const store = o.stores[0]?.store;
    const kmIV = o.kmIdaVolta ?? store?.kmRoundTrip ?? 0;
    const kmRod = o.kmRodada ?? kmIV;
    const precoKm = o.precoKm ?? 1.6;
    const kmCostCalc = o.transportCost ?? kmRod * precoKm;
    const refeicao = o.mealAllowance ?? 0;
    const pernoite = o.overnightAllowance ?? 0;
    const pedagio = o.tollDiscount ?? 0;
    const estac = o.parking ?? 0;
    const materialCost = o.materialCost ?? 0;
    const laborCost = o.laborCost ?? 0;

    // Man-hours: use stored manHours or derive from laborCost / 48
    const mh = o.manHours ?? (laborCost > 0 ? Math.round(laborCost / 48) : 0);

    const total =
      o.totalCost ??
      kmCostCalc +
        laborCost +
        materialCost +
        refeicao +
        pernoite +
        pedagio +
        estac;

    return {
      orderNumber: o.orderNumber,
      filial: store?.storeNumber?.toString() ?? store?.code ?? "",
      city: `${store?.city ?? o.name} - ${store?.state ?? "SP"}`,
      idaVolta: kmIV,
      kmRodado: kmRod,
      kmCost: kmCostCalc,
      manHours: mh,
      laborCost,
      materialCost,
      refeicao,
      pernoite,
      pedagio,
      estac,
      total,
    };
  });

  // Totals
  const totals = rows.reduce(
    (acc, r) => ({
      idaVolta: acc.idaVolta + r.idaVolta,
      kmRodado: acc.kmRodado + r.kmRodado,
      kmCost: acc.kmCost + r.kmCost,
      manHours: acc.manHours + r.manHours,
      laborCost: acc.laborCost + r.laborCost,
      materialCost: acc.materialCost + r.materialCost,
      refeicao: acc.refeicao + r.refeicao,
      pernoite: acc.pernoite + r.pernoite,
      pedagio: acc.pedagio + r.pedagio,
      estac: acc.estac + r.estac,
      total: acc.total + r.total,
    }),
    {
      idaVolta: 0,
      kmRodado: 0,
      kmCost: 0,
      manHours: 0,
      laborCost: 0,
      materialCost: 0,
      refeicao: 0,
      pernoite: 0,
      pedagio: 0,
      estac: 0,
      total: 0,
    },
  );

  // Build table rows
  const tableBody = rows.map((r, i) => [
    String(i + 1),
    String(r.orderNumber),
    r.filial,
    r.city,
    fmtInt(r.idaVolta),
    fmtInt(r.kmRodado),
    fmt(r.kmCost),
    fmtInt(r.manHours),
    fmt(r.laborCost),
    fmt(r.materialCost),
    fmt(r.refeicao),
    fmt(r.pernoite),
    fmt(r.pedagio),
    fmt(r.estac),
    fmt(r.total),
  ]);

  // Totals row
  const totalsRow = [
    "",
    "",
    "",
    "",
    fmtInt(totals.idaVolta),
    fmtInt(totals.kmRodado),
    fmt(totals.kmCost),
    fmtInt(totals.manHours),
    fmt(totals.laborCost),
    fmt(totals.materialCost),
    fmt(totals.refeicao),
    fmt(totals.pernoite),
    fmt(totals.pedagio),
    fmt(totals.estac),
    fmt(totals.total),
  ];

  // Multi-row header matching the original format
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        { content: "ITEM", rowSpan: 2, styles: { valign: "middle" } },
        { content: "O.S.", rowSpan: 2, styles: { valign: "middle" } },
        { content: "FILIAL", rowSpan: 2, styles: { valign: "middle" } },
        { content: "CIDADE", rowSpan: 2, styles: { valign: "middle" } },
        { content: "IDA E\nVOLTA", rowSpan: 2, styles: { valign: "middle" } },
        { content: "KM COBRADA", colSpan: 2, styles: { halign: "center" } },
        { content: "MÃO DE OBRA", colSpan: 2, styles: { halign: "center" } },
        { content: "MATERIAL", rowSpan: 2, styles: { valign: "middle" } },
        { content: "REFEIÇÃO", rowSpan: 2, styles: { valign: "middle" } },
        { content: "PERNOITE", rowSpan: 2, styles: { valign: "middle" } },
        { content: "PEDÁGIO", rowSpan: 2, styles: { valign: "middle" } },
        { content: "ESTAC.", rowSpan: 2, styles: { valign: "middle" } },
        { content: "TOTAL", rowSpan: 2, styles: { valign: "middle" } },
      ],
      [
        { content: "RODADO", styles: { halign: "center" } },
        { content: "R$", styles: { halign: "center" } },
        { content: "H/hs", styles: { halign: "center" } },
        { content: "R$", styles: { halign: "center" } },
      ],
    ],
    body: tableBody,
    foot: [totalsRow],
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 }, // ITEM
      1: { halign: "center", cellWidth: 16 }, // O.S.
      2: { halign: "center", cellWidth: 12 }, // FILIAL
      3: { cellWidth: 55 }, // CIDADE
      4: { halign: "right", cellWidth: 14 }, // IDA E VOLTA
      5: { halign: "right", cellWidth: 14 }, // RODADO
      6: { halign: "right", cellWidth: 18 }, // KM R$
      7: { halign: "right", cellWidth: 10 }, // H/hs
      8: { halign: "right", cellWidth: 18 }, // MÃO DE OBRA R$
      9: { halign: "right", cellWidth: 18 }, // MATERIAL
      10: { halign: "right", cellWidth: 16 }, // REFEIÇÃO
      11: { halign: "right", cellWidth: 16 }, // PERNOITE
      12: { halign: "right", cellWidth: 14 }, // PEDÁGIO
      13: { halign: "right", cellWidth: 12 }, // ESTAC.
      14: { halign: "right", cellWidth: 20 }, // TOTAL
    },
    theme: "grid",
  });

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  const monthAbbr = monthName.slice(0, 3);
  const filename = `LOJAS CEM - MEDICOES DE ${dayFrom}A${dayTo}${monthAbbr}${String(year).slice(2)}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
