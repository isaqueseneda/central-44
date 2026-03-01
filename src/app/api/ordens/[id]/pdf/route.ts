import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const { id } = await params;

  const order = await prisma.serviceOrder.findUnique({
    where: { id },
    include: {
      vehicle: true,
      stores: { include: { store: true } },
      employees: { include: { employee: true } },
      serviceTypes: { include: { serviceType: true } },
      materials: { include: { material: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "OS not found" }, { status: 404 });
  }

  const store = order.stores[0]?.store;
  const storeName = store
    ? `LOJAS CEM S.A. - F ${store.storeNumber ?? store.code} - ${store.city} - ${store.state}`
    : order.name;
  const storePhone = store?.phone ?? "";

  // Build PDF
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ─── HEADER ───
  // Draw outer border for header area
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, 20);

  // Company name (left)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CENTRAL", margin + 3, y + 8);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("ENGENHARIA ELÉTRICA", margin + 3, y + 12);

  // Company info (center-left)
  const infoX = margin + 48;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("Telefone", infoX, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text("19 3524-4544", infoX + 18, y + 5);

  doc.setFont("helvetica", "bold");
  doc.text("Endereço", infoX, y + 9);
  doc.setFont("helvetica", "normal");
  doc.text("RUA 6 N°1962 SALA 1", infoX + 18, y + 9);
  doc.text("CEP 13500 - 190", infoX + 18, y + 13);
  doc.text("RIO CLARO - SP", infoX + 18, y + 17);

  // Title (right side)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE SERVIÇOS", pageW - margin - 3, y + 8, { align: "right" });
  doc.text("EXECUTADOS", pageW - margin - 3, y + 13, { align: "right" });

  y += 22;

  // ─── CLIENT & OS INFO ───
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);

  // Store info row
  doc.rect(margin, y, contentW, 6);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(storeName, margin + 2, y + 4);
  doc.text("Nº CHAMADO A.T.", pageW - margin - 45, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(order.numeroChamado ?? String(order.orderNumber), pageW - margin - 2, y + 4, {
    align: "right",
  });
  y += 6;

  // Solicitado por
  doc.rect(margin, y, contentW, 6);
  doc.setFont("helvetica", "bold");
  doc.text("SOLICITADO POR:", margin + 2, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(order.solicitadoPor ?? "ENGº JOEL CASTELO NOVO", margin + 35, y + 4);
  doc.setFont("helvetica", "bold");
  doc.text("FONE:", pageW - margin - 45, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(storePhone || "(019) 3469-4072", pageW - margin - 2, y + 4, {
    align: "right",
  });
  y += 6;

  // Endereço atendimento
  doc.rect(margin, y, contentW, 6);
  doc.setFont("helvetica", "bold");
  doc.text("ENDEREÇO ATENDIMENTO", margin + 2, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(
    order.enderecoAtendimento ?? store?.address ?? "",
    margin + 48,
    y + 4
  );
  doc.setFont("helvetica", "bold");
  doc.text("PROCURAR POR:", pageW - margin - 45, y + 4);
  y += 6;

  // Serviço solicitado
  doc.rect(margin, y, contentW, 6);
  doc.setFont("helvetica", "bold");
  doc.text("SERVIÇO SOLICITADO:", margin + 2, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(order.servicoSolicitado ?? "", margin + 42, y + 4);
  y += 6;

  // ─── SERVIÇOS EXECUTADOS ───
  const servicesText = order.servicesPerformed ?? "";
  const servicesLines = servicesText.split("\n");
  const servicesHeight = Math.max(25, servicesLines.length * 4 + 10);

  doc.rect(margin, y, contentW, servicesHeight);
  doc.setFont("helvetica", "bold");
  doc.text("SERVIÇOS EXECUTADOS:", margin + 2, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  servicesLines.forEach((line, i) => {
    doc.text(line, margin + 6, y + 11 + i * 3.5);
  });
  doc.setFontSize(8);
  y += servicesHeight;

  // ─── MATERIAIS APLICADOS ───
  const materials = order.materials.map((m) => {
    const qty = m.quantity;
    const unit = m.unitPrice ?? m.material.salePrice;
    // If we have both qty and unit, calculate line total; otherwise show 0
    const lineTotal = qty != null && unit != null ? qty * unit : 0;
    return [
      qty != null ? fmtInt(qty) : "",
      m.material.name,
      fmt(unit ?? 0),
      fmt(lineTotal),
    ];
  });

  const materialTotal = order.materialCost ?? 0;

  doc.setFont("helvetica", "bold");
  doc.text("MATERIAIS APLICADOS", margin + 2, y + 5);

  autoTable(doc, {
    startY: y + 7,
    margin: { left: margin, right: margin },
    head: [["QUANT", "DESCRIÇÃO", "UNITÁRIO", "TOTAL"]],
    body:
      materials.length > 0
        ? materials
        : [["", "", "", ""]],
    foot: [["", "", "TOTAL R$", fmt(materialTotal)]],
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      1: { cellWidth: 85 },
      2: { halign: "right", cellWidth: 25 },
      3: { halign: "right", cellWidth: 25 },
    },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 3;

  // ─── MÃO DE OBRA ───
  const dateStr = order.date
    ? `${String(order.date.getDate()).padStart(2, "0")}/${String(order.date.getMonth() + 1).padStart(2, "0")}`
    : "";

  // Check if any employee has individual hour data
  const hasDetailedHours = order.employees.some((e) => e.hoursNormal != null);
  const empCount = order.employees.length || 1;

  const laborRows = order.employees.map((emp) => {
    const price = emp.pricePerHour ?? 48.0;
    const rg = emp.employee.rg ?? "";
    const wd = emp.workDate
      ? `${String(emp.workDate.getDate()).padStart(2, "0")}/${String(emp.workDate.getMonth() + 1).padStart(2, "0")}`
      : dateStr;

    if (hasDetailedHours) {
      // Use per-employee data
      const h = emp.hoursNormal ?? 0;
      const extra = emp.hoursExtra ?? 0;
      return [
        wd,
        fmt(h),
        extra ? fmt(extra) : "",
        emp.employee.shortName.toUpperCase(),
        rg,
        fmt(price),
        fmt(h * price + extra * price),
      ];
    } else {
      // No detailed hours — show employee name with the stored labor cost split
      const laborShare = (order.laborCost ?? 0) / empCount;
      const hoursEst = laborShare / price;
      return [
        wd,
        fmt(hoursEst),
        "",
        emp.employee.shortName.toUpperCase(),
        rg,
        fmt(price),
        fmt(laborShare),
      ];
    }
  });

  const laborTotal = order.laborCost ?? 0;

  doc.setFont("helvetica", "bold");
  doc.text("MÃO DE OBRA", margin + 2, y + 2);

  autoTable(doc, {
    startY: y + 4,
    margin: { left: margin, right: margin },
    head: [["DIA", "NORMAIS", "EXTRAS", "COLABORADOR", "RG", "PREÇO DA HORA R$", "TOTAL R$"]],
    body: laborRows.length > 0 ? laborRows : [["", "", "", "", "", "", ""]],
    foot: [["", "", "", "", "", "TOTAL R$", fmt(laborTotal)]],
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      1: { halign: "center", cellWidth: 15 },
      2: { halign: "center", cellWidth: 15 },
      3: { cellWidth: 35 },
      4: { cellWidth: 30 },
      5: { halign: "right", cellWidth: 22 },
      6: { halign: "right", cellWidth: 20 },
    },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 3;

  // ─── TRANSPORTE ───
  const vehicleName = order.vehicle?.name ?? "";
  const vehiclePlate = order.vehicle?.licensePlate ?? "";
  const kmIdaVolta = order.kmIdaVolta ?? store?.kmRoundTrip ?? 0;
  const kmRodada = order.kmRodada ?? kmIdaVolta;
  const precoKm = order.precoKm ?? 1.6;
  const transportTotal = order.transportCost ?? kmRodada * precoKm;

  doc.setFont("helvetica", "bold");
  doc.text("TRANSPORTE", margin + 2, y + 2);

  autoTable(doc, {
    startY: y + 4,
    margin: { left: margin, right: margin },
    body: [
      [
        { content: "VEÍCULO:", styles: { fontStyle: "bold" } },
        vehicleName.toUpperCase(),
        "",
        { content: "PLACA:", styles: { fontStyle: "bold" } },
        vehiclePlate,
      ],
      [
        { content: "QUILOMETRAGEM", styles: { fontStyle: "bold" } },
        "",
        { content: "RODADA", styles: { fontStyle: "bold" } },
        fmtInt(kmRodada),
        { content: `PREÇO POR KM R$   ${fmt(precoKm)}`, styles: { halign: "right" as const } },
      ],
      [
        "",
        "",
        "",
        "",
        {
          content: `TOTAL R$   ${fmt(transportTotal)}`,
          styles: { fontStyle: "bold", halign: "right" as const },
        },
      ],
    ],
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2 },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 3;

  // ─── DESPESAS ───
  const refeicao = order.mealAllowance ?? 0;
  const pedagio = order.tollDiscount ?? 0;
  const pernoite = order.overnightAllowance ?? 0;
  const estac = order.parking ?? 0;
  const despesasTotal = refeicao + pedagio + pernoite + estac;

  doc.setFont("helvetica", "bold");
  doc.text("DESPESAS", margin + 2, y + 2);

  autoTable(doc, {
    startY: y + 4,
    margin: { left: margin, right: margin },
    body: [
      [
        { content: "REFEIÇÕES", styles: { fontStyle: "bold" } },
        `R$   ${fmt(refeicao)}`,
        { content: "PEDÁGIO", styles: { fontStyle: "bold" } },
        `R$   ${fmt(pedagio)}`,
      ],
      [
        { content: "PERNOITE", styles: { fontStyle: "bold" } },
        `R$   ${fmt(pernoite)}`,
        { content: "ESTACION.", styles: { fontStyle: "bold" } },
        `R$   ${fmt(estac)}`,
      ],
      [
        "",
        "",
        { content: "TOTAL R$", styles: { fontStyle: "bold" } },
        { content: fmt(despesasTotal), styles: { fontStyle: "bold" } },
      ],
    ],
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2 },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 3;

  // ─── TOTAL GERAL ───
  const totalGeral = order.totalCost ?? materialTotal + laborTotal + transportTotal + despesasTotal;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      [
        {
          content: "TOTAL GERAL R$",
          styles: { fontStyle: "bold", fontSize: 9 },
        },
        {
          content: fmt(totalGeral),
          styles: { fontStyle: "bold", fontSize: 9, halign: "right" as const },
        },
      ],
    ],
    styles: { cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.3 },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  // ─── OBS ───
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("OBS:", margin + 2, y);
  if (order.managerComment) {
    doc.setFont("helvetica", "normal");
    doc.text(order.managerComment, margin + 12, y);
  }
  y += 6;

  // ─── SIGNATURES ───
  const months = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
  ];
  const now = order.date ?? new Date();
  doc.setFont("helvetica", "normal");
  doc.text(
    `RIO CLARO, ${months[now.getMonth()]} ${now.getFullYear()}`,
    margin + 2,
    y
  );
  y += 8;

  // Left signature
  doc.setFont("helvetica", "bold");
  doc.text("CENTRAL ENGENHARIA ELETRICA LTDA", margin + 2, y);
  doc.setFont("helvetica", "normal");
  doc.text("Eng. Fernando Celeste Seneda", margin + 2, y + 4);

  // Right signature
  doc.setFont("helvetica", "bold");
  doc.text("LOJAS CEM SA", pageW / 2 + 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    order.solicitadoPor ?? "Eng. Joel Castelo Novo",
    pageW / 2 + 10,
    y + 4
  );

  y += 12;

  // ─── PARTE FISCAL ───
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("PREENCHIMENTO PARTE FISCAL", pageW / 2, y, { align: "center" });
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["", "MATERIAIS", "MÃO DE OBRA", "TOTAL"]],
    body: [
      [
        "CENTRAL ENGENHARIA ELETRICA LTDA\nAux.Técnico Fábio Gutierre",
        fmt(materialTotal),
        fmt(totalGeral - materialTotal),
        fmt(totalGeral),
      ],
    ],
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: "right", cellWidth: 30 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 30 },
    },
    theme: "grid",
  });

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  const filename = `LOJAS CEM ${store?.city ?? "OS"} EM ${String(now.getDate()).padStart(2, "0")}${months[now.getMonth()].slice(0, 3)}${String(now.getFullYear()).slice(2)}.pdf`;
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
  } catch (error: any) {
    console.error("[PDF] Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
