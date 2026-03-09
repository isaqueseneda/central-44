import { prisma } from "@/lib/db";
import { loadLogoBase64, renderRelatorioPage, MONTHS } from "@/lib/pdf-utils";
import { jsPDF } from "jspdf";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
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
        teams: { include: { team: { include: { members: { include: { employee: true } }, vehicle: true } } } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "OS not found" }, { status: 404 });
    }

    const logoBase64 = loadLogoBase64();

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    renderRelatorioPage(doc, order as any, logoBase64);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    const store = order.stores[0]?.store;
    const now = order.date ?? new Date();
    const monthFull = MONTHS[now.getMonth()];
    const monthSafe = (monthFull.charAt(0) + monthFull.slice(1).toLowerCase())
      .replace(/ç/g, "c").replace(/[àáâãä]/g, "a").replace(/[èéêë]/g, "e")
      .replace(/[ìíîï]/g, "i").replace(/[òóôõö]/g, "o").replace(/[ùúûü]/g, "u");
    const storeName = store?.city ?? "OS";
    const filename = `Relatorio OS-${order.orderNumber} ${storeName} ${now.getDate()} de ${monthSafe}.pdf`;

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
      {
        error: "Failed to generate PDF",
        details: error?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}
