import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

// ─── Shared formatters ───

export function fmt(v: number | null | undefined): string {
  if (v == null) return "0,00";
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtInt(v: number | null | undefined): string {
  if (v == null) return "0";
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ─── Logo ───

let _logoCache: string | null = null;

export function loadLogoBase64(): string {
  if (_logoCache) return _logoCache;
  const logoPath = path.join(process.cwd(), "public", "logo-central.png");
  const buf = fs.readFileSync(logoPath);
  _logoCache = `data:image/png;base64,${buf.toString("base64")}`;
  return _logoCache;
}

export const MONTHS = [
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

// ─── Shared types ───

export interface RelatorioOrder {
  id: string;
  orderNumber: number;
  name: string;
  date: Date | null;
  status: string;
  numeroChamado: string | null;
  solicitadoPor: string | null;
  enderecoAtendimento: string | null;
  servicoSolicitado: string | null;
  servicesPerformed: string | null;
  managerComment: string | null;
  kmIdaVolta: number | null;
  kmRodada: number | null;
  precoKm: number | null;
  transportCost: number | null;
  laborCost: number | null;
  materialCost: number | null;
  totalCost: number | null;
  manHours: number | null;
  mealAllowance: number | null;
  overnightAllowance: number | null;
  tollDiscount: number | null;
  parking: number | null;
  warranty: boolean;
  // OS execution fields
  technicianNotes?: string | null;
  materialsDescribed?: string | null;
  clientRating?: string | null;
  clientComment?: string | null;
  receivedByName?: string | null;
  receivedByCargo?: string | null;
  executionDate?: Date | string | null;
  entryTime?: string | null;
  exitTime?: string | null;
  executedByName?: string | null;
  executedByCargo?: string | null;
  extraHours?: number | null;
  vehicle: { name: string; licensePlate: string } | null;
  stores: { store: { storeNumber: number | null; code: string; city: string; state: string; phone: string | null; address: string; kmRoundTrip: number | null } }[];
  employees: { hoursNormal: number | null; hoursExtra: number | null; pricePerHour: number | null; workDate: Date | null; employee: { shortName: string; rg: string | null } }[];
  serviceTypes: { serviceType: { name: string } }[];
  materials: { quantity: number | null; unitPrice: number | null; material: { name: string; salePrice: number | null } }[];
  teams?: { team: { name: string; vehicle: { name: string; licensePlate: string } | null; members: { employee: { shortName: string; rg: string | null } }[] } }[];
}

// ─── Render a full relatório page (WITH prices) onto an existing doc ───

export function renderRelatorioPage(
  doc: jsPDF,
  order: RelatorioOrder,
  logoBase64: string,
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentW = pageW - margin * 2;
  let y = margin;

  const store = order.stores[0]?.store;
  const storeName = store
    ? `LOJAS CEM S.A. - F ${store.storeNumber ?? store.code} - ${store.city} - ${store.state}`
    : order.name;
  const storePhone = store?.phone ?? "";

  // ─── HEADER ───
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, 20);

  // Logo (596x173 native ratio → ~3.45:1)
  const logoH = 10;
  const logoW = logoH * (596 / 173);
  try {
    doc.addImage(logoBase64, "PNG", margin + 3, y + 5, logoW, logoH);
  } catch {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CENTRAL", margin + 3, y + 10);
  }

  // Company info (after logo)
  const infoX = margin + logoW + 8;
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

  // Title
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE SERVIÇOS", pageW - margin - 3, y + 8, {
    align: "right",
  });
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
  doc.text(
    order.numeroChamado ?? String(order.orderNumber),
    pageW - margin - 2,
    y + 4,
    { align: "right" },
  );
  y += 6;

  // Solicitado por
  doc.rect(margin, y, contentW, 6);
  doc.setFont("helvetica", "bold");
  doc.text("SOLICITADO POR:", margin + 2, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(
    order.solicitadoPor ?? "ENGº JOEL CASTELO NOVO",
    margin + 35,
    y + 4,
  );
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
    y + 4,
  );
  doc.setFont("helvetica", "bold");
  doc.text("PROCURAR POR:", pageW - margin - 45, y + 4);
  y += 6;

  // Serviços solicitados — one service type per line
  const serviceTypeNames = order.serviceTypes.map((st) => st.serviceType.name);
  const solicitadoLines = serviceTypeNames.length > 0
    ? serviceTypeNames
    : (order.servicoSolicitado?.trim() ?? "").split("\n").filter((l) => l.trim());
  const solicitadoH = Math.max(6, 4 + solicitadoLines.length * 3.2);
  doc.rect(margin, y, contentW, solicitadoH);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("SERVIÇOS SOLICITADOS:", margin + 2, y + 4);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  solicitadoLines.forEach((line: string, i: number) => {
    doc.text(line, margin + 44, y + 4 + i * 3.2);
  });
  doc.setFontSize(8);
  y += solicitadoH;

  // ─── SERVIÇOS EXECUTADOS ───
  // servicoSolicitado is labeled "Serviços realizados" in the UI
  const servicesText = order.servicoSolicitado?.trim() || order.servicesPerformed || "";
  const servicesLines = servicesText.split("\n").filter((l) => l.trim());
  const servicesHeight = Math.max(12, servicesLines.length * 3.2 + 8);

  doc.rect(margin, y, contentW, servicesHeight);
  doc.setFont("helvetica", "bold");
  doc.text("SERVIÇOS EXECUTADOS:", margin + 2, y + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  servicesLines.forEach((line, i) => {
    doc.text(line, margin + 6, y + 9 + i * 3);
  });
  doc.setFontSize(8);
  y += servicesHeight;

  // ─── MATERIAIS APLICADOS ───
  const materials = order.materials.map((m) => {
    const qty = m.quantity;
    const unit = m.unitPrice ?? m.material.salePrice;
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
  doc.text("MATERIAIS APLICADOS", margin + 2, y + 4);

  autoTable(doc, {
    startY: y + 5,
    margin: { left: margin, right: margin },
    head: [["QUANT", "DESCRIÇÃO", "UNITÁRIO", "TOTAL"]],
    body: materials.length > 0 ? materials : [["", "", "", ""]],
    foot: [["", "", "TOTAL R$", fmt(materialTotal)]],
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
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

  y = (doc as any).lastAutoTable.finalY + 1;

  // ─── MÃO DE OBRA ───
  const dateStr = order.date
    ? `${String(order.date.getDate()).padStart(2, "0")}/${String(order.date.getMonth() + 1).padStart(2, "0")}`
    : "";

  const hasDetailedHours = order.employees.some((e) => e.hoursNormal != null);
  const empCount = order.employees.length || 1;

  let laborRows: string[][] = order.employees.map((emp) => {
    const price = emp.pricePerHour ?? 48.0;
    const rg = emp.employee.rg ?? "";
    const wd = emp.workDate
      ? `${String(emp.workDate.getDate()).padStart(2, "0")}/${String(emp.workDate.getMonth() + 1).padStart(2, "0")}`
      : dateStr;

    if (hasDetailedHours) {
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

  // When no employees assigned but teams exist, pull member names and RGs from teams
  if (laborRows.length === 0 && order.teams && order.teams.length > 0) {
    const allMembers = order.teams.flatMap((t) =>
      t.team.members.map((m) => m.employee),
    );
    const price = 48.0;
    const memberCount = allMembers.length || 1;
    const totalMH = order.manHours ?? ((order.laborCost ?? 0) / price);
    const extraH = order.extraHours ?? 0;
    const mhPerPerson = totalMH / memberCount;
    const extraPerPerson = extraH / memberCount;
    const totalLabor = order.laborCost ?? (totalMH * price + extraH * price);
    const laborPerPerson = totalLabor / memberCount;

    if (allMembers.length > 0) {
      laborRows = allMembers.map((emp) => [
        dateStr,
        fmt(mhPerPerson),
        extraPerPerson > 0 ? fmt(extraPerPerson) : "",
        emp.shortName.toUpperCase(),
        emp.rg ?? "",
        fmt(price),
        fmt(laborPerPerson),
      ]);
    } else {
      laborRows = [
        [dateStr, fmt(totalMH), extraH > 0 ? fmt(extraH) : "", "EQUIPE", "", fmt(price), fmt(totalLabor)],
      ];
    }
  }

  // Last fallback: no employees and no teams but labor data exists
  if (laborRows.length === 0 && ((order.laborCost ?? 0) > 0 || (order.manHours ?? 0) > 0)) {
    const price = 48.0;
    const mh = order.manHours ?? ((order.laborCost ?? 0) / price);
    const extraH = order.extraHours ?? 0;
    const lc = order.laborCost ?? (mh * price + extraH * price);
    laborRows = [
      [dateStr, fmt(mh), extraH > 0 ? fmt(extraH) : "", "EQUIPE", "", fmt(price), fmt(lc)],
    ];
  }

  const laborTotal = order.laborCost ?? 0;

  doc.setFont("helvetica", "bold");
  doc.text("MÃO DE OBRA", margin + 2, y + 3.5);

  autoTable(doc, {
    startY: y + 4.5,
    margin: { left: margin, right: margin },
    head: [
      [
        "DIA",
        "NORMAIS",
        "EXTRAS",
        "COLABORADOR",
        "RG",
        "PREÇO DA HORA R$",
        "TOTAL R$",
      ],
    ],
    body: laborRows.length > 0 ? laborRows : [["", "", "", "", "", "", ""]],
    foot: [["", "", "", "", "", "TOTAL R$", fmt(laborTotal)]],
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
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

  y = (doc as any).lastAutoTable.finalY + 1;

  // ─── TRANSPORTE ───
  // Fall back to team vehicle if OS has no vehicle assigned
  const teamVehicle = order.teams?.[0]?.team.vehicle;
  const vehicleName = order.vehicle?.name ?? teamVehicle?.name ?? "";
  const vehiclePlate = order.vehicle?.licensePlate ?? teamVehicle?.licensePlate ?? "";
  const kmIdaVolta = order.kmIdaVolta ?? store?.kmRoundTrip ?? 0;
  const kmRodada = order.kmRodada ?? kmIdaVolta;
  const precoKm = order.precoKm ?? 1.6;
  const transportTotal = order.transportCost ?? kmRodada * precoKm;

  doc.setFont("helvetica", "bold");
  doc.text("TRANSPORTE", margin + 2, y + 3.5);

  autoTable(doc, {
    startY: y + 4.5,
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
        {
          content: `PREÇO POR KM R$   ${fmt(precoKm)}`,
          styles: { halign: "right" as const },
        },
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
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 1;

  // ─── DESPESAS ───
  const refeicao = order.mealAllowance ?? 0;
  const pedagio = order.tollDiscount ?? 0;
  const pernoite = order.overnightAllowance ?? 0;
  const estac = order.parking ?? 0;
  const despesasTotal = refeicao + pedagio + pernoite + estac;

  doc.setFont("helvetica", "bold");
  doc.text("DESPESAS", margin + 2, y + 3.5);

  autoTable(doc, {
    startY: y + 4.5,
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
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 1;

  // ─── TOTAL GERAL ───
  const totalGeral =
    order.totalCost ??
    materialTotal + laborTotal + transportTotal + despesasTotal;

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
          styles: {
            fontStyle: "bold",
            fontSize: 9,
            halign: "right" as const,
          },
        },
      ],
    ],
    styles: { cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.3 },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 3;

  // ─── OBS ───
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("OBS:", margin + 2, y);
  if (order.managerComment) {
    doc.setFont("helvetica", "normal");
    doc.text(order.managerComment, margin + 12, y);
  }
  y += 4;

  // ─── SIGNATURES ───
  const now = order.date ?? new Date();
  doc.setFont("helvetica", "normal");
  doc.text(
    `RIO CLARO, ${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
    margin + 2,
    y,
  );
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("CENTRAL ENGENHARIA ELETRICA LTDA", margin + 2, y);
  doc.setFont("helvetica", "normal");
  doc.text("Eng. Fernando Celeste Seneda", margin + 2, y + 4);

  doc.setFont("helvetica", "bold");
  doc.text("LOJAS CEM SA", pageW / 2 + 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    order.solicitadoPor ?? "Eng. Joel Castelo Novo",
    pageW / 2 + 10,
    y + 4,
  );

  y += 10;

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
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
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
}

// ─── Render OS page (WITHOUT prices) ───

export function renderOSPage(
  doc: jsPDF,
  order: RelatorioOrder,
  logoBase64: string,
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentW = pageW - margin * 2;
  let y = margin;
  const lineH = 5; // standard line height for blank lines
  const fs = 7.5; // base font size

  const store = order.stores[0]?.store;
  const storeName = store
    ? `LOJAS CEM S.A - F ${store.storeNumber ?? store.code} - ${store.city} - ${store.state}`
    : order.name;
  const storePhone = store?.phone ?? "";
  const storeAddress = order.enderecoAtendimento ?? store?.address ?? "";
  const kmDist = order.kmIdaVolta ?? store?.kmRoundTrip ?? null;
  const dateStr = order.date
    ? `${String(order.date.getDate()).padStart(2, "0")}/${String(order.date.getMonth() + 1).padStart(2, "0")}/${String(order.date.getFullYear()).slice(2)}`
    : "";

  // ─── HEADER ───
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);

  // Logo (596x173 native ratio)
  const logoH = 9;
  const logoW = logoH * (596 / 173);
  try {
    doc.addImage(logoBase64, "PNG", margin + 2, y + 1, logoW, logoH);
  } catch {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CENTRAL ENGENHARIA ELÉTRICA", margin + 2, y + 6);
  }

  // Company info (right side of logo)
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const addrX = pageW / 2 - 10;
  doc.text("ENDEREÇO: RUA 6 N. 1962 - SALA 1", addrX, y + 3);
  doc.text("RIO CLARO SP                                           CEP: 13500-190", addrX, y + 6.5);
  doc.text("TEL: (19) 3533-7574 / 3617-4544    EMAIL: fernando@centralee.com.br", addrX, y + 10);

  y += 13;

  // ─── ORDEM DE SERVIÇO + N. ───
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, 7);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ORDEM DE SERVIÇO", margin + 3, y + 5);
  doc.text(`N. ${order.orderNumber}`, pageW - margin - 3, y + 5, {
    align: "right",
  });
  y += 7;

  // ─── CLIENT row + DATA INICIO ───
  doc.setLineWidth(0.2);
  doc.rect(margin, y, contentW, 6);
  doc.setFontSize(fs);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE: ", margin + 2, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(storeName, margin + 2 + doc.getTextWidth("CLIENTE: "), y + 4);
  doc.setFont("helvetica", "bold");
  doc.text("DATA INICIO: ", pageW - margin - 35, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, pageW - margin - 3, y + 4, { align: "right" });
  y += 6;

  // ─── ENDEREÇO row ───
  doc.rect(margin, y, contentW, 6);
  doc.setFont("helvetica", "bold");
  doc.text("ENDEREÇO: ", margin + 2, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(storeAddress, margin + 2 + doc.getTextWidth("ENDEREÇO: "), y + 4);
  y += 6;

  // ─── DISTÂNCIA + FONE row ───
  doc.rect(margin, y, contentW, 6);
  doc.setFont("helvetica", "bold");
  doc.text("DISTÂNCIA: ", margin + 2, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(kmDist != null ? `${fmtInt(kmDist)} KM` : "_____ KM", margin + 25, y + 4);
  doc.setFont("helvetica", "bold");
  doc.text("FONE: ", pageW - margin - 50, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(storePhone, pageW - margin - 3, y + 4, { align: "right" });
  y += 6;

  // ─── SERVIÇOS (requested) ───
  const serviceTypeNames = order.serviceTypes.map((st) => st.serviceType.name);
  const servicoSolText = order.servicoSolicitado?.trim() ?? "";
  const solicitadoContent: string[] = [];
  if (serviceTypeNames.length > 0) solicitadoContent.push(serviceTypeNames.join(", "));
  if (servicoSolText) solicitadoContent.push(servicoSolText);
  const solicitadoStr = solicitadoContent.join("\n");

  doc.setFontSize(fs);
  doc.setFont("helvetica", "bold");
  const servLabel = "SERVIÇOS:";
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);

  // Wrap services text
  const servWrapped = solicitadoStr
    ? doc.splitTextToSize(solicitadoStr, contentW - 4)
    : [];
  const servBoxLines = Math.max(4, servWrapped.length + 1);
  const servBoxH = servBoxLines * lineH;
  doc.rect(margin, y, contentW, servBoxH);
  doc.text(servLabel, margin + 2, y + 3.8);
  doc.setFont("helvetica", "normal");
  servWrapped.forEach((line: string, i: number) => {
    doc.text(line, margin + 2, y + 3.8 + (i + 1) * 3.5);
  });
  // Draw subtle guide lines
  for (let i = 1; i < servBoxLines; i++) {
    doc.setDrawColor(210);
    doc.setLineWidth(0.1);
    doc.line(margin, y + i * lineH, margin + contentW, y + i * lineH);
  }
  y += servBoxH;

  // ─── SERVIÇOS EXECUTADOS FORA DO SOLICITADO / OBSERVAÇÃO DO TÉCNICO ───
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  const techLabel = "SERVIÇOS EXECUTADOS FORA DO SOLICITADO / OBSERVAÇÃO DO TÉCNICO:";
  const techText = order.technicianNotes ?? order.servicesPerformed ?? "";
  const techWrapped = techText ? doc.splitTextToSize(techText, contentW - 4) : [];
  const techBoxLines = Math.max(3, techWrapped.length + 1);
  const techBoxH = techBoxLines * lineH;
  doc.rect(margin, y, contentW, techBoxH);
  doc.setFont("helvetica", "bold");
  doc.text(techLabel, margin + 2, y + 3.8);
  doc.setFont("helvetica", "normal");
  techWrapped.forEach((line: string, i: number) => {
    doc.text(line, margin + 2, y + 3.8 + (i + 1) * 3.5);
  });
  for (let i = 1; i < techBoxLines; i++) {
    doc.setDrawColor(210);
    doc.setLineWidth(0.1);
    doc.line(margin, y + i * lineH, margin + contentW, y + i * lineH);
  }
  y += techBoxH;

  // ─── MATERIAIS DESCRITOS PELO SERVIÇO ───
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  const matDescLabel = "MATERIAIS DESCRITOS PELO SERVIÇO:";
  const matDescText = order.materialsDescribed ?? "";
  // List material names one per line
  const matNames = order.materials.map((m) => m.material.name).join("\n");
  const matDescContent = [matDescText, matNames].filter(Boolean).join("\n");
  const matDescWrapped = matDescContent
    ? doc.splitTextToSize(matDescContent, contentW - 4)
    : [];
  const matDescLines = Math.max(3, matDescWrapped.length + 1);
  const matDescH = matDescLines * lineH;
  doc.rect(margin, y, contentW, matDescH);
  doc.setFont("helvetica", "bold");
  doc.text(matDescLabel, margin + 2, y + 3.8);
  doc.setFont("helvetica", "normal");
  matDescWrapped.forEach((line: string, i: number) => {
    doc.text(line, margin + 2, y + 3.8 + (i + 1) * 3.5);
  });
  for (let i = 1; i < matDescLines; i++) {
    doc.setDrawColor(210);
    doc.setLineWidth(0.1);
    doc.line(margin, y + i * lineH, margin + contentW, y + i * lineH);
  }
  y += matDescH;

  // ─── MATERIAIS UTILIZADOS (blank lines for field use) ───
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  const matUsedLabel = "MATERIAIS UTILIZADOS";
  const matUsedLines = 4;
  const matUsedH = matUsedLines * lineH;
  doc.rect(margin, y, contentW, matUsedH);
  doc.text(matUsedLabel, margin + 2, y + 3.8);
  for (let i = 1; i < matUsedLines; i++) {
    doc.setDrawColor(210);
    doc.setLineWidth(0.1);
    doc.line(margin, y + i * lineH, margin + contentW, y + i * lineH);
  }
  y += matUsedH;

  // ─── COMENTÁRIOS DO CLIENTE (GERENTE) ───
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs);

  const commentLabel = "COMENTÁRIOS DO CLIENTE (GERENTE) REFERENTE AO SERVIÇO PRESTADO:";
  const ratingH = 6;
  const commentLinesCount = 3;
  const commentBoxH = ratingH + commentLinesCount * lineH;
  doc.rect(margin, y, contentW, commentBoxH);
  doc.text(commentLabel, margin + 2, y + 3.8);
  y += ratingH;

  // Rating checkboxes
  doc.setFont("helvetica", "normal");
  const ratings = ["EXCELENTE", "ÓTIMO", "BOM", "REGULAR", "INSATISFEITO"];
  const clientRating = order.clientRating ?? "";
  const ratingSpacing = contentW / ratings.length;
  ratings.forEach((r, i) => {
    const rx = margin + i * ratingSpacing + 2;
    const checked = clientRating.toUpperCase() === r;
    doc.text(`( ${checked ? "X" : " "} ) ${r}`, rx, y + 3.5);
  });
  y += lineH;

  // Blank comment lines
  for (let i = 0; i < commentLinesCount - 1; i++) {
    doc.setDrawColor(210);
    doc.setLineWidth(0.1);
    doc.line(margin, y + i * lineH, margin + contentW, y + i * lineH);
  }
  y += (commentLinesCount - 1) * lineH;

  // ─── FOOTER: RECEBIDO + EXECUÇÃO + HORÁRIOS ───
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);

  // Row 1: RECEBIDO E CONFERIDO
  const footerRowH = 6;
  doc.rect(margin, y, contentW, footerRowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs);
  const recName = order.receivedByName ?? "";
  const recCargo = order.receivedByCargo ?? "";
  doc.text("RECEBIDO E CONFERIDO:", margin + 2, y + 4);
  doc.text("CARGO:", margin + 48, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(recCargo, margin + 60, y + 4);
  doc.setFont("helvetica", "bold");
  doc.text("NOME:", margin + 90, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(recName, margin + 100, y + 4);
  doc.setFont("helvetica", "bold");
  doc.text("ASSINATURA:", pageW - margin - 40, y + 4);
  y += footerRowH;

  // Row 2: DATA EXECUÇÃO + HORÁRIO DE ENT E SAÍDA
  doc.rect(margin, y, contentW, footerRowH);
  const execDate = order.executionDate;
  const execDateStr = execDate
    ? `${String(new Date(execDate).getDate()).padStart(2, "0")} / ${String(new Date(execDate).getMonth() + 1).padStart(2, "0")} / ${String(new Date(execDate).getFullYear()).slice(2)}`
    : "__ / __ / __";
  doc.setFont("helvetica", "bold");
  doc.text(`DATA EXECUÇÃO  ${execDateStr}`, margin + 2, y + 4);
  doc.text("HORÁRIO DE ENT E SAÍDA DOS FUNCIONÁRIOS DA LOJA", pageW / 2, y + 4);
  y += footerRowH;

  // Row 3: EXECUTADO POR + HR ENTRADA
  doc.rect(margin, y, contentW, footerRowH);
  const execBy = order.executedByName ?? "";
  const entryTime = order.entryTime ?? "";
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTADO POR: ", margin + 2, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(execBy, margin + 32, y + 4);
  doc.setFont("helvetica", "bold");
  doc.text(`HR ENTRADA: ${entryTime}`, pageW - margin - 40, y + 4);
  y += footerRowH;

  // Row 4: CARGO + ASSINATURA + HR SAÍDA
  doc.rect(margin, y, contentW, footerRowH);
  const execCargo = order.executedByCargo ?? "";
  const exitTime = order.exitTime ?? "";
  doc.setFont("helvetica", "bold");
  doc.text("CARGO: ", margin + 2, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(execCargo, margin + 16, y + 4);
  doc.setFont("helvetica", "bold");
  doc.text("ASSINATURA E NOME POR EXTENSO:", margin + 45, y + 4);
  doc.text(`HR SAÍDA: ${exitTime}`, pageW - margin - 40, y + 4);
  y += footerRowH;
}
