import { prisma } from "@/lib/db";
import {
  fmt,
  fmtInt,
  loadLogoBase64,
  renderRelatorioPage,
  MONTHS,
} from "@/lib/pdf-utils";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to"); // YYYY-MM-DD
  const status = searchParams.get("status"); // optional filter

  const where: any = {
    isObra: false,
  };

  // When dates are provided, apply date-range filter (backwards compat with portal)
  if (from && to) {
    const fromDate = new Date(from + "T00:00:00-03:00");
    const toDate = new Date(to + "T23:59:59-03:00");
    where.OR = [
      { date: { gte: fromDate, lte: toDate } },
      {
        scheduledAssignments: {
          some: {
            OR: [
              { date: { gte: fromDate, lte: toDate } },
              { endDate: { gte: fromDate, lte: toDate } },
            ],
          },
        },
      },
    ];
  }

  if (status) {
    where.status = status;
  }

  // Fetch with full includes for individual relatório pages
  const orders = await prisma.serviceOrder.findMany({
    where,
    include: {
      stores: { include: { store: true } },
      employees: { include: { employee: true } },
      vehicle: true,
      serviceTypes: { include: { serviceType: true } },
      materials: { include: { material: true } },
      teams: { include: { team: { include: { members: { include: { employee: true } }, vehicle: true } } } },
    },
    orderBy: { orderNumber: "asc" },
  });

  if (orders.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma OS encontrada para medição" },
      { status: 404 },
    );
  }

  const logoBase64 = loadLogoBase64();

  // ─── Build PDF (Landscape A4) — Cover page ───
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 8;
  let y = margin;

  // ─── HEADER with logo ───
  const logoH = 9;
  const logoW = logoH * (596 / 173);
  try {
    doc.addImage(logoBase64, "PNG", margin + 2, y + 2, logoW, logoH);
  } catch {
    // fallback
  }

  // Period and client
  let periodStr: string;
  if (from && to) {
    const fromDate = new Date(from + "T00:00:00-03:00");
    const toDate = new Date(to + "T23:59:59-03:00");
    const dayFrom = fromDate.getDate();
    const dayTo = toDate.getDate();
    const monthName = MONTHS[fromDate.getMonth()];
    const year = fromDate.getFullYear();
    const monthCapitalized = monthName.charAt(0) + monthName.slice(1).toLowerCase();
    periodStr = `PERIODO: ${dayFrom} a ${dayTo} de ${monthCapitalized} de ${year}`;
  } else {
    // Derive period from the earliest and latest OS dates
    const dates = orders
      .map((o) => o.date)
      .filter(Boolean)
      .map((d) => new Date(d!).getTime());
    if (dates.length > 0) {
      const earliest = new Date(Math.min(...dates));
      const latest = new Date(Math.max(...dates));
      const monthName = MONTHS[earliest.getMonth()];
      const monthCap = monthName.charAt(0) + monthName.slice(1).toLowerCase();
      periodStr = `PERIODO: ${earliest.getDate()} a ${latest.getDate()} de ${monthCap} de ${earliest.getFullYear()}`;
    } else {
      const now = new Date();
      const monthName = MONTHS[now.getMonth()];
      periodStr = `MEDIÇÃO - ${monthName} ${now.getFullYear()}`;
    }
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(periodStr, margin + logoW + 8, y + 7);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE: LOJAS CEM", pageW - margin - 2, y + 8, {
    align: "right",
  });

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
      fontStyle: "bold",
      halign: "center",
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
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "center", cellWidth: 16 },
      2: { halign: "center", cellWidth: 12 },
      3: { cellWidth: 55 },
      4: { halign: "right", cellWidth: 14 },
      5: { halign: "right", cellWidth: 14 },
      6: { halign: "right", cellWidth: 18 },
      7: { halign: "right", cellWidth: 10 },
      8: { halign: "right", cellWidth: 18 },
      9: { halign: "right", cellWidth: 18 },
      10: { halign: "right", cellWidth: 16 },
      11: { halign: "right", cellWidth: 16 },
      12: { halign: "right", cellWidth: 14 },
      13: { halign: "right", cellWidth: 12 },
      14: { halign: "right", cellWidth: 20 },
    },
    theme: "grid",
  });

  // ─── Individual relatório pages for each OS ───
  for (const order of orders) {
    doc.addPage("a4", "portrait");
    renderRelatorioPage(doc, order as any, logoBase64);
  }

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  // Build filename
  let filename: string;
  if (from && to) {
    const fromDate = new Date(from + "T00:00:00-03:00");
    const toDate = new Date(to + "T23:59:59-03:00");
    const monthName = MONTHS[fromDate.getMonth()];
    const monthSafe = monthName.charAt(0) + monthName.slice(1).toLowerCase();
    const monthNoAccent = monthSafe.replace(/ç/g, "c").replace(/[àáâãä]/g, "a").replace(/[èéêë]/g, "e").replace(/[ìíîï]/g, "i").replace(/[òóôõö]/g, "o").replace(/[ùúûü]/g, "u");
    filename = `Medicao ${fromDate.getDate()} a ${toDate.getDate()} de ${monthNoAccent}.pdf`;
  } else {
    filename = `Medicao.pdf`;
  }

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
