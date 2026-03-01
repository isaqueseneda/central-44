import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CSV_DIR = join(
  __dirname,
  "../data/notion-export/Export-2b79e0d2-0f25-4b7b-a776-214650659baf/Central/40ed4c04b70f4a18be24705f5e6673a2"
);

// ---------------------------------------------------------------------------
// CSV Parser (handles quoted fields with commas, newlines)
// ---------------------------------------------------------------------------

function parseCSV(content: string): Record<string, string>[] {
  // Remove BOM
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      current += ch;
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "\n" && !inQuotes) {
      if (current.trim()) lines.push(current);
      current = "";
    } else if (ch === "\r" && !inQuotes) {
      // skip CR
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseBRL(value: string): number | null {
  if (!value || value === "—") return null;
  // "R$ 810,00" -> 810.00
  const cleaned = value.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  // Try DD/MM/YYYY format first
  const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  // Try ISO format
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function parseFloat2(value: string): number | null {
  if (!value || value === "—") return null;
  // Handle BRL format: "R$ 83,90" or plain "295"
  const cleaned = value.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractName(notionRef: string): string {
  // "Carlos B (https://www.notion.so/...)" -> "Carlos B"
  // "256 - IGARAP - Igarapava (https://www.notion.so/...)" -> "256 - IGARAP - Igarapava"
  return notionRef.replace(/\s*\(https:\/\/www\.notion\.so\/[^)]+\)/, "").trim();
}

function extractNames(notionRefs: string): string[] {
  if (!notionRefs) return [];
  return notionRefs
    .split(/,\s*(?=[^(]*(?:\(|$))/)
    .map(extractName)
    .filter(Boolean);
}

function readCSV(filename: string): Record<string, string>[] {
  const path = join(CSV_DIR, filename);
  const content = readFileSync(path, "utf-8");
  return parseCSV(content);
}

// ---------------------------------------------------------------------------
// ID maps for relation resolution
// ---------------------------------------------------------------------------

const storeByCode: Map<string, string> = new Map();
const employeeByName: Map<string, string> = new Map();
const vehicleByName: Map<string, string> = new Map();
const serviceByName: Map<string, string> = new Map();
const materialByName: Map<string, string> = new Map();

// ---------------------------------------------------------------------------
// Migration functions
// ---------------------------------------------------------------------------

async function migrateLojas() {
  const rows = readCSV("Lojas c2131becef754a61a1d5542c30901c7f_all.csv");
  console.log(`\nMigrating ${rows.length} stores (Lojas)...`);
  let created = 0, skipped = 0;

  for (const row of rows) {
    const sigla = row["SIGLA"]?.trim();
    if (!sigla) { skipped++; continue; }

    const city = row["CIDADE"]?.trim() || "";
    const state = (row["UF"] || "").trim();
    const address = row["ENDEREÇO"]?.trim() || "";
    const cep = row["CEP"]?.trim() || null;
    const cnpj = row["CNPJ"]?.trim() || null;
    const stateRegistration = row["INSCR. ESTAD"]?.trim() || null;
    const constructionCode = row["COD OBRA"]?.trim() || null;
    const phone = row["FONE"]?.trim() || null;
    const kmRoundTrip = parseFloat2(row["KM IDA E VOLTA"]);
    const tollRoundTrip = parseBRL(row["PEDÁGIO IDA E VOLTA"]);
    const storeNumber = row["L."] ? parseInt(row["L."]) : null;

    try {
      const store = await prisma.store.create({
        data: {
          code: sigla,
          sigla,
          city: city || sigla.split(" - ").pop()?.trim() || "N/A",
          state: state || "SP",
          address: address || "N/A",
          cep,
          cnpj,
          stateRegistration,
          constructionCode,
          phone,
          kmRoundTrip,
          tollRoundTrip,
          storeNumber: storeNumber != null && !isNaN(storeNumber) ? storeNumber : null,
        },
      });
      storeByCode.set(sigla, store.id);
      created++;
    } catch (err: any) {
      if (err?.code === "P2002") {
        const existing = await prisma.store.findUnique({ where: { code: sigla } });
        if (existing) storeByCode.set(sigla, existing.id);
        skipped++;
      } else {
        console.error(`  Error creating store "${sigla}":`, err.message);
        skipped++;
      }
    }
  }

  console.log(`  Stores: ${created} created, ${skipped} skipped.`);
}

async function migrateFuncionarios() {
  const rows = readCSV("Funcionários 2666f70d38d34567884289781f5a5c43_all.csv");
  console.log(`\nMigrating ${rows.length} employees (Funcionários)...`);
  let created = 0, skipped = 0;

  for (const row of rows) {
    const shortName = row["Nome"]?.trim();
    if (!shortName) { skipped++; continue; }

    const fullName = row["Nome Completo"]?.trim() || null;
    const rg = row["RG"]?.trim() || null;
    const phone = row["Telefone"]?.trim() || null;
    const startDate = parseDate(row["Data"]);

    const employee = await prisma.employee.create({
      data: {
        shortName,
        fullName,
        rg,
        phone,
        startDate,
        isActive: true,
      },
    });
    employeeByName.set(shortName, employee.id);
    if (fullName) employeeByName.set(fullName, employee.id);
    created++;
  }

  console.log(`  Employees: ${created} created, ${skipped} skipped.`);
}

async function migrateFrota() {
  const rows = readCSV("Frota 5a794bd2a570424cb823d0c796993758_all.csv");
  console.log(`\nMigrating ${rows.length} vehicles (Frota)...`);
  let created = 0, skipped = 0;

  for (const row of rows) {
    const name = row["Nome"]?.trim();
    const plate = row["Placa"]?.trim().toUpperCase();
    if (!plate) { skipped++; continue; }

    try {
      const vehicle = await prisma.vehicle.create({
        data: {
          name: name || plate,
          licensePlate: plate,
          isActive: true,
        },
      });
      vehicleByName.set(name, vehicle.id);
      created++;
    } catch (err: any) {
      if (err?.code === "P2002") {
        const existing = await prisma.vehicle.findUnique({ where: { licensePlate: plate } });
        if (existing) vehicleByName.set(name, existing.id);
        skipped++;
      } else {
        console.error(`  Error creating vehicle "${name}":`, err.message);
        skipped++;
      }
    }
  }

  console.log(`  Vehicles: ${created} created, ${skipped} skipped.`);
}

async function migrateServicos() {
  const rows = readCSV("Serviços 6a1b38a8571e40dcbd31a3077dc5a17d_all.csv");
  console.log(`\nMigrating ${rows.length} service types (Serviços)...`);
  let created = 0, skipped = 0;

  for (const row of rows) {
    const name = row["Nome"]?.trim();
    if (!name) { skipped++; continue; }

    const tags = row["Tags"]
      ? row["Tags"].split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    try {
      const serviceType = await prisma.serviceType.create({
        data: { name, tags },
      });
      serviceByName.set(name, serviceType.id);
      created++;
    } catch (err: any) {
      if (err?.code === "P2002") {
        const existing = await prisma.serviceType.findUnique({ where: { name } });
        if (existing) serviceByName.set(name, existing.id);
        skipped++;
      } else {
        console.error(`  Error creating service "${name}":`, err.message);
        skipped++;
      }
    }
  }

  console.log(`  Service types: ${created} created, ${skipped} skipped.`);
}

async function migrateMateriais() {
  const rows = readCSV("Materiais 63c6be86d7dc41e98332acc44250b00b_all.csv");
  console.log(`\nMigrating ${rows.length} materials (Materiais)...`);
  let created = 0, skipped = 0;

  for (const row of rows) {
    const name = row["Nome"]?.trim();
    if (!name) { skipped++; continue; }

    const purchasePrice = parseBRL(row["Compra (unid, m, kg)"]);
    const salePrice = parseBRL(row["Venda (unid, m, kg)"]);
    const tags = row["Tags"]
      ? row["Tags"].split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    const material = await prisma.material.create({
      data: { name, purchasePrice, salePrice, tags },
    });
    materialByName.set(name, material.id);
    created++;
  }

  console.log(`  Materials: ${created} created, ${skipped} skipped.`);
}

function mapStatus(status: string): "NOT_STARTED" | "IN_PROGRESS" | "RETURN_VISIT" | "MEASUREMENT" | "PAID" | "REWORK" {
  if (!status) return "NOT_STARTED";
  const s = status.toLowerCase().trim();
  if (s.includes("andamento") || s.includes("progress")) return "IN_PROGRESS";
  if (s.includes("retorno") || s.includes("return")) return "RETURN_VISIT";
  if (s.includes("medi") || s.includes("measurement")) return "MEASUREMENT";
  if (s.includes("pago") || s.includes("paid") || s.includes("faturad")) return "PAID";
  if (s.includes("retrabalho") || s.includes("rework")) return "REWORK";
  if (s.includes("não iniciada") || s.includes("nao iniciada")) return "NOT_STARTED";
  return "NOT_STARTED";
}

function mapType(tipo: string): "GENERAL" | "ALARM" | "LED" {
  if (!tipo) return "GENERAL";
  const t = tipo.toLowerCase().trim();
  if (t.includes("alarme") || t.includes("alarm")) return "ALARM";
  if (t.includes("led")) return "LED";
  return "GENERAL";
}

async function migrateOrdensDeServico() {
  const rows = readCSV("Ordens de Serviço 9e611fd7780e43909d94029f5b601cc1_all.csv");
  console.log(`\nMigrating ${rows.length} service orders (Ordens de Serviço)...`);
  let created = 0, skipped = 0, junctions = 0;

  for (const row of rows) {
    const name = row["Nome"]?.trim();
    if (!name) { skipped++; continue; }

    const status = mapStatus(row["Status"]);
    const type = mapType(row["Tipo"]);
    const date = parseDate(row["Data"]);
    const warranty = (row["Garantia"] || "").toLowerCase() === "yes";

    // Financial
    const manHours = parseBRL(row["$ HH"]);
    const laborCost = parseBRL(row["$ MDO"]);
    const materialCost = parseBRL(row["$ Mat"]);
    const totalCost = parseBRL(row["$ Total"]);
    const transportCost = parseBRL(row["$ Transp"]);
    const kmDiscount = parseFloat2(row["Desc. KM"]);
    const tollDiscount = parseBRL(row["Desc. P."]);
    const parking = parseFloat2(row["Estac."]);
    const mealAllowance = parseFloat2(row["Refeição"]);
    const overnightAllowance = parseFloat2(row["Pernoite"]);

    // Text
    const servicesPerformed = row["Serviços Realizados"]?.trim() || null;
    const managerComment = row["Commentário Gerente"]?.trim() || row["Comentário Gerente"]?.trim() || null;
    const materialsUsedNotes = row["Materiais Utilizados"]?.trim() || null;

    // Priority from emoji
    const flag = row["🚩"] || "";
    let priority = 0;
    if (flag.includes("⭐⭐⭐")) priority = 3;
    else if (flag.includes("⭐⭐")) priority = 2;
    else if (flag.includes("⭐")) priority = 1;

    // Vehicle relation
    const vehicleNames = extractNames(row["Veículo"]);
    let vehicleId: string | null = null;
    if (vehicleNames.length > 0) {
      vehicleId = vehicleByName.get(vehicleNames[0]) ?? null;
    }

    try {
      const so = await prisma.serviceOrder.create({
        data: {
          name,
          status,
          type,
          date,
          warranty,
          priority,
          manHours,
          laborCost,
          materialCost,
          totalCost,
          transportCost,
          kmDiscount,
          tollDiscount,
          parking,
          mealAllowance,
          overnightAllowance,
          servicesPerformed,
          managerComment,
          materialsUsedNotes,
          vehicleId,
        },
      });
      created++;

      // Junction: Stores
      const storeRefs = extractNames(row["Lojas"]);
      for (const storeCode of storeRefs) {
        const storeId = storeByCode.get(storeCode);
        if (storeId) {
          try {
            await prisma.serviceOrderStore.create({
              data: { serviceOrderId: so.id, storeId },
            });
            junctions++;
          } catch {}
        }
      }

      // Junction: Employees
      const empNames = extractNames(row["Funcionários"]);
      for (const empName of empNames) {
        const employeeId = employeeByName.get(empName);
        if (employeeId) {
          try {
            await prisma.serviceOrderEmployee.create({
              data: { serviceOrderId: so.id, employeeId },
            });
            junctions++;
          } catch {}
        }
      }

      // Junction: Services
      const svcNames = extractNames(row["Serviços"]);
      for (const svcName of svcNames) {
        const serviceTypeId = serviceByName.get(svcName);
        if (serviceTypeId) {
          try {
            await prisma.serviceOrderServiceType.create({
              data: { serviceOrderId: so.id, serviceTypeId },
            });
            junctions++;
          } catch {}
        }
      }

      // Junction: Materials
      const matNames = extractNames(row["Materiais"]);
      for (const matName of matNames) {
        const materialId = materialByName.get(matName);
        if (materialId) {
          try {
            await prisma.serviceOrderMaterial.create({
              data: { serviceOrderId: so.id, materialId },
            });
            junctions++;
          } catch {}
        }
      }
    } catch (err: any) {
      console.error(`  Error creating OS "${name}":`, err.message);
      skipped++;
    }
  }

  console.log(`  Service orders: ${created} created, ${skipped} skipped, ${junctions} junction records.`);
}

// ---------------------------------------------------------------------------
// Clear all existing data
// ---------------------------------------------------------------------------

async function clearDatabase() {
  console.log("Clearing existing data...");
  await prisma.serviceOrderMaterial.deleteMany();
  await prisma.serviceOrderServiceType.deleteMany();
  await prisma.serviceOrderEmployee.deleteMany();
  await prisma.serviceOrderStore.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.material.deleteMany();
  await prisma.serviceType.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.weeklyScheduleSlot.deleteMany();
  await prisma.weeklySchedule.deleteMany();
  await prisma.store.deleteMany();
  console.log("  All tables cleared.");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Central 44 - CSV to PostgreSQL Migration ===\n");
  const startTime = Date.now();

  await clearDatabase();

  // Migrate lookup tables first
  await migrateLojas();
  await migrateFuncionarios();
  await migrateFrota();
  await migrateServicos();
  await migrateMateriais();

  // Migrate service orders (depends on all lookup tables)
  await migrateOrdensDeServico();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Migration complete in ${elapsed}s ===`);
  console.log(`  Stores mapped: ${storeByCode.size}`);
  console.log(`  Employees mapped: ${employeeByName.size}`);
  console.log(`  Vehicles mapped: ${vehicleByName.size}`);
  console.log(`  Services mapped: ${serviceByName.size}`);
  console.log(`  Materials mapped: ${materialByName.size}`);
}

main()
  .catch((err) => {
    console.error("\nMigration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
