import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const dynamic = "force-dynamic";

function formatDateBR(date: Date): string {
  const d = date.getUTCDate().toString().padStart(2, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

function formatCurrency(value: number): string {
  if (value === 0) return "";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const dayLabels: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart");

  if (!weekStart) {
    return NextResponse.json(
      { error: "Query param 'weekStart' (YYYY-MM-DD) is required." },
      { status: 400 }
    );
  }

  const startDate = new Date(weekStart + "T00:00:00.000Z");
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  endDate.setUTCHours(23, 59, 59, 999);

  const fridayDate = new Date(startDate);
  fridayDate.setUTCDate(fridayDate.getUTCDate() + 4);

  const expenses = await prisma.travelExpense.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    include: {
      employee: { select: { shortName: true } },
    },
    orderBy: [{ employee: { shortName: "asc" } }, { date: "asc" }],
  });

  if (expenses.length === 0) {
    return NextResponse.json(
      { error: `Nenhuma despesa encontrada para a semana de ${weekStart}` },
      { status: 404 }
    );
  }

  const periodStr = `${formatDateBR(startDate)} A ${formatDateBR(fridayDate)}`;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Header
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(
    `CENTRAL ENGENHARIA ELÉTRICA — CONTROLE SEMANAL DESP. VIAGEM — PERÍODO: ${periodStr}`,
    doc.internal.pageSize.getWidth() / 2,
    12,
    { align: "center" }
  );

  // Build rows grouped by employee
  const employeeMap = new Map<string, typeof expenses>();
  for (const exp of expenses) {
    const key = exp.employee.shortName;
    if (!employeeMap.has(key)) employeeMap.set(key, []);
    employeeMap.get(key)!.push(exp);
  }

  const columns = ["FUNCIONÁRIO", "DIA", "LOCAL", "CAFÉ", "ALM.", "JANTAR", "HOTEL", "COMB.", "PEDÁGIO", "ESTAC.", "REEMB.", "UBER/TAXI", "TOTAL"];

  const tableBody: string[][] = [];
  let grandTotal = 0;

  for (const [empName, empExpenses] of employeeMap) {
    let empTotal = 0;
    for (const exp of empExpenses) {
      const dayOfWeek = new Date(exp.date).getUTCDay();
      const rowTotal = exp.cafe + exp.almoco + exp.jantar + exp.hotel +
        exp.combustivel + exp.pedagio + exp.estacionamento + exp.reembolso + exp.uberTaxi;
      empTotal += rowTotal;

      tableBody.push([
        empName,
        dayLabels[dayOfWeek] ?? "",
        exp.city ?? "",
        formatCurrency(exp.cafe),
        formatCurrency(exp.almoco),
        formatCurrency(exp.jantar),
        formatCurrency(exp.hotel),
        formatCurrency(exp.combustivel),
        formatCurrency(exp.pedagio),
        formatCurrency(exp.estacionamento),
        formatCurrency(exp.reembolso),
        formatCurrency(exp.uberTaxi),
        formatCurrency(rowTotal),
      ]);
    }

    // Subtotal row
    tableBody.push([
      "",
      "",
      `SUBTOTAL ${empName}`,
      "", "", "", "", "", "", "", "", "",
      formatCurrency(empTotal),
    ]);
    grandTotal += empTotal;
  }

  // Grand total row
  tableBody.push([
    "",
    "",
    "TOTAL GERAL",
    "", "", "", "", "", "", "", "", "",
    formatCurrency(grandTotal),
  ]);

  (doc as any).autoTable({
    startY: 18,
    head: [columns],
    body: tableBody,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.2,
      textColor: [0, 0, 0],
      lineColor: [100, 100, 100],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 32 },           // FUNCIONÁRIO
      1: { cellWidth: 14, halign: "center" }, // DIA
      2: { cellWidth: 30 },           // LOCAL
      3: { cellWidth: 16, halign: "right" }, // CAFÉ
      4: { cellWidth: 16, halign: "right" }, // ALM
      5: { cellWidth: 16, halign: "right" }, // JANTAR
      6: { cellWidth: 16, halign: "right" }, // HOTEL
      7: { cellWidth: 16, halign: "right" }, // COMB
      8: { cellWidth: 16, halign: "right" }, // PEDÁGIO
      9: { cellWidth: 16, halign: "right" }, // ESTAC
      10: { cellWidth: 16, halign: "right" }, // REEMB
      11: { cellWidth: 18, halign: "right" }, // UBER
      12: { cellWidth: 20, halign: "right", fontStyle: "bold" }, // TOTAL
    },
    didParseCell: (data: any) => {
      // Highlight subtotal / total rows
      if (data.section === "body") {
        const cellText = data.row.raw?.[2] ?? "";
        if (typeof cellText === "string" && cellText.startsWith("SUBTOTAL")) {
          data.cell.styles.fillColor = [235, 235, 235];
          data.cell.styles.fontStyle = "bold";
        }
        if (typeof cellText === "string" && cellText === "TOTAL GERAL") {
          data.cell.styles.fillColor = [220, 220, 220];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="DESPESAS_VIAGEM_${weekStart}.pdf"`,
    },
  });
}
