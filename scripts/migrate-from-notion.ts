import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_VERSION = "2022-06-28";

const DB_IDS = {
  os: process.env.NOTION_DB_OS!,
  lojas: process.env.NOTION_DB_LOJAS!,
  funcionarios: process.env.NOTION_DB_FUNCIONARIOS!,
  frota: process.env.NOTION_DB_FROTA!,
  servicos: process.env.NOTION_DB_SERVICOS!,
  materiais: process.env.NOTION_DB_MATERIAIS!,
} as const;

// Validate env vars
for (const [key, value] of Object.entries(DB_IDS)) {
  if (!value) {
    console.error(`Missing env var for database: ${key}`);
    process.exit(1);
  }
}
if (!NOTION_API_KEY) {
  console.error("Missing NOTION_API_KEY");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Notion API helpers
// ---------------------------------------------------------------------------

interface NotionPage {
  id: string;
  properties: Record<string, any>;
}

interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

async function fetchAllPages(databaseId: string): Promise<NotionPage[]> {
  const allPages: NotionPage[] = [];
  let cursor: string | undefined = undefined;
  let pageNum = 1;

  while (true) {
    const body: Record<string, any> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Notion API error (${res.status}) for db ${databaseId}: ${text}`
      );
    }

    const data: NotionQueryResponse = await res.json();
    allPages.push(...data.results);
    console.log(`  ... fetched page ${pageNum} (${data.results.length} records, total ${allPages.length})`);

    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor;
    pageNum++;
  }

  return allPages;
}

// ---------------------------------------------------------------------------
// Property extractors
// ---------------------------------------------------------------------------

function getText(prop: any): string {
  if (!prop) return "";
  // title type
  if (prop.type === "title" && Array.isArray(prop.title)) {
    return prop.title.map((t: any) => t.plain_text ?? "").join("");
  }
  // rich_text type
  if (prop.type === "rich_text" && Array.isArray(prop.rich_text)) {
    return prop.rich_text.map((t: any) => t.plain_text ?? "").join("");
  }
  return "";
}

function getNumber(prop: any): number | null {
  if (!prop || prop.type !== "number") return null;
  return prop.number ?? null;
}

function getCheckbox(prop: any): boolean {
  if (!prop || prop.type !== "checkbox") return false;
  return prop.checkbox ?? false;
}

function getSelect(prop: any): string | null {
  if (!prop || prop.type !== "select" || !prop.select) return null;
  return prop.select.name ?? null;
}

function getMultiSelect(prop: any): string[] {
  if (!prop || prop.type !== "multi_select" || !Array.isArray(prop.multi_select))
    return [];
  return prop.multi_select.map((s: any) => s.name).filter(Boolean);
}

function getDate(prop: any): Date | null {
  if (!prop || prop.type !== "date" || !prop.date || !prop.date.start)
    return null;
  const d = new Date(prop.date.start);
  return isNaN(d.getTime()) ? null : d;
}

function getRelationIds(prop: any): string[] {
  if (!prop || prop.type !== "relation" || !Array.isArray(prop.relation))
    return [];
  return prop.relation.map((r: any) => r.id).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Mapping: Notion page ID -> local Prisma ID
// ---------------------------------------------------------------------------

const notionToLocalId: Record<string, string> = {};

// ---------------------------------------------------------------------------
// Migration functions
// ---------------------------------------------------------------------------

async function migrateLojas(pages: NotionPage[]) {
  console.log(`\nMigrating ${pages.length} stores (Lojas)...`);
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const p = page.properties;
    const sigla = getText(p["SIGLA"] ?? p["Sigla"] ?? p["sigla"]);
    const city = getText(p["Cidade"] ?? p["cidade"]);
    const state = getText(p["Estado"] ?? p["UF"] ?? p["estado"]);
    const address = getText(p["Endereco"] ?? p["Endere\u00e7o"] ?? p["endereco"] ?? p["endereço"]);
    const cep = getText(p["CEP"] ?? p["cep"]);
    const cnpj = getText(p["CNPJ"] ?? p["cnpj"]);
    const stateRegistration = getText(p["IE"] ?? p["Inscri\u00e7\u00e3o Estadual"] ?? p["inscricao_estadual"]);
    const constructionCode = getText(p["C\u00f3digo Obra"] ?? p["Codigo Obra"] ?? p["codigo_obra"]);
    const phone = getText(p["Telefone"] ?? p["telefone"]);
    const kmRoundTrip = getNumber(p["KM ida e volta"] ?? p["KM"] ?? p["km"]);
    const tollRoundTrip = getNumber(p["Ped\u00e1gio ida e volta"] ?? p["Pedagio"] ?? p["pedagio"]);
    const storeNumber = getNumber(p["N\u00ba Loja"] ?? p["Numero"] ?? p["numero"]);

    // The code is required; use SIGLA as the unique code
    const code = sigla.trim();
    if (!code) {
      console.warn(`  Skipping store with empty SIGLA (Notion ID: ${page.id})`);
      skipped++;
      continue;
    }

    // Build a display name / fallback for city
    const name = getText(p["Name"] ?? p["Nome"] ?? p["name"]);

    try {
      const store = await prisma.store.create({
        data: {
          code,
          sigla: sigla || code,
          city: city || name || "N/A",
          state: state || "N/A",
          address: address || "N/A",
          cep: cep || null,
          cnpj: cnpj || null,
          stateRegistration: stateRegistration || null,
          constructionCode: constructionCode || null,
          phone: phone || null,
          kmRoundTrip,
          tollRoundTrip,
          storeNumber: storeNumber != null ? Math.round(storeNumber) : null,
        },
      });
      notionToLocalId[page.id] = store.id;
      created++;
    } catch (err: any) {
      // Handle duplicate code gracefully
      if (err?.code === "P2002") {
        console.warn(`  Duplicate store code "${code}", skipping.`);
        const existing = await prisma.store.findUnique({ where: { code } });
        if (existing) notionToLocalId[page.id] = existing.id;
        skipped++;
      } else {
        throw err;
      }
    }
  }

  console.log(`  Stores: ${created} created, ${skipped} skipped.`);
}

async function migrateFuncionarios(pages: NotionPage[]) {
  console.log(`\nMigrating ${pages.length} employees (Funcionarios)...`);
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const p = page.properties;
    const shortName = getText(p["Nome"] ?? p["nome"] ?? p["Name"]);
    const fullName = getText(p["Nome Completo"] ?? p["nome_completo"]);
    const rg = getText(p["RG"] ?? p["rg"]);
    const phone = getText(p["Telefone"] ?? p["telefone"] ?? p["Phone"]);
    const startDate = getDate(p["Data In\u00edcio"] ?? p["Data Inicio"] ?? p["data_inicio"]);
    const isActive = getCheckbox(p["Ativo"] ?? p["ativo"]);

    if (!shortName.trim()) {
      console.warn(`  Skipping employee with empty name (Notion ID: ${page.id})`);
      skipped++;
      continue;
    }

    const employee = await prisma.employee.create({
      data: {
        shortName: shortName.trim(),
        fullName: fullName.trim() || null,
        rg: rg.trim() || null,
        phone: phone.trim() || null,
        startDate,
        isActive: isActive ?? true,
      },
    });
    notionToLocalId[page.id] = employee.id;
    created++;
  }

  console.log(`  Employees: ${created} created, ${skipped} skipped.`);
}

async function migrateFrota(pages: NotionPage[]) {
  console.log(`\nMigrating ${pages.length} vehicles (Frota)...`);
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const p = page.properties;
    const name = getText(p["Name"] ?? p["Nome"] ?? p["name"] ?? p["nome"]);
    const licensePlate = getText(p["Placa"] ?? p["placa"]);
    const isActive = getCheckbox(p["Ativo"] ?? p["ativo"]);

    const plate = licensePlate.trim().toUpperCase();
    if (!plate) {
      console.warn(`  Skipping vehicle with empty plate (Notion ID: ${page.id})`);
      skipped++;
      continue;
    }

    try {
      const vehicle = await prisma.vehicle.create({
        data: {
          name: name.trim() || plate,
          licensePlate: plate,
          isActive: isActive ?? true,
        },
      });
      notionToLocalId[page.id] = vehicle.id;
      created++;
    } catch (err: any) {
      if (err?.code === "P2002") {
        console.warn(`  Duplicate plate "${plate}", skipping.`);
        const existing = await prisma.vehicle.findUnique({
          where: { licensePlate: plate },
        });
        if (existing) notionToLocalId[page.id] = existing.id;
        skipped++;
      } else {
        throw err;
      }
    }
  }

  console.log(`  Vehicles: ${created} created, ${skipped} skipped.`);
}

async function migrateServicos(pages: NotionPage[]) {
  console.log(`\nMigrating ${pages.length} service types (Servicos)...`);
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const p = page.properties;
    const name = getText(p["Name"] ?? p["Nome"] ?? p["name"] ?? p["nome"]);
    const tags = getMultiSelect(p["Tags"] ?? p["tags"]);

    if (!name.trim()) {
      console.warn(`  Skipping service type with empty name (Notion ID: ${page.id})`);
      skipped++;
      continue;
    }

    try {
      const serviceType = await prisma.serviceType.create({
        data: {
          name: name.trim(),
          tags,
        },
      });
      notionToLocalId[page.id] = serviceType.id;
      created++;
    } catch (err: any) {
      if (err?.code === "P2002") {
        console.warn(`  Duplicate service type "${name.trim()}", skipping.`);
        const existing = await prisma.serviceType.findUnique({
          where: { name: name.trim() },
        });
        if (existing) notionToLocalId[page.id] = existing.id;
        skipped++;
      } else {
        throw err;
      }
    }
  }

  console.log(`  Service types: ${created} created, ${skipped} skipped.`);
}

async function migrateMateriais(pages: NotionPage[]) {
  console.log(`\nMigrating ${pages.length} materials (Materiais)...`);
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const p = page.properties;
    const name = getText(p["Name"] ?? p["Nome"] ?? p["name"] ?? p["nome"]);
    const purchasePrice = getNumber(p["Compra"] ?? p["compra"] ?? p["Pre\u00e7o Compra"]);
    const salePrice = getNumber(p["Venda"] ?? p["venda"] ?? p["Pre\u00e7o Venda"]);
    const tags = getMultiSelect(p["Tags"] ?? p["tags"]);

    if (!name.trim()) {
      console.warn(`  Skipping material with empty name (Notion ID: ${page.id})`);
      skipped++;
      continue;
    }

    const material = await prisma.material.create({
      data: {
        name: name.trim(),
        purchasePrice,
        salePrice,
        tags,
      },
    });
    notionToLocalId[page.id] = material.id;
    created++;
  }

  console.log(`  Materials: ${created} created, ${skipped} skipped.`);
}

function mapStatus(notionStatus: string | null): "NOT_STARTED" | "IN_PROGRESS" | "RETURN_VISIT" | "MEASUREMENT" | "PAID" | "REWORK" {
  if (!notionStatus) return "NOT_STARTED";
  const s = notionStatus.toLowerCase().trim();
  if (s.includes("andamento") || s.includes("progresso") || s.includes("progress"))
    return "IN_PROGRESS";
  if (s.includes("retorno") || s.includes("return")) return "RETURN_VISIT";
  if (s.includes("medi") || s.includes("measurement")) return "MEASUREMENT";
  if (s.includes("pago") || s.includes("paid") || s.includes("faturad"))
    return "PAID";
  if (s.includes("retrabalho") || s.includes("rework") || s.includes("refaz"))
    return "REWORK";
  return "NOT_STARTED";
}

function mapType(notionType: string | null): "GENERAL" | "ALARM" | "LED" {
  if (!notionType) return "GENERAL";
  const t = notionType.toLowerCase().trim();
  if (t.includes("alarme") || t.includes("alarm")) return "ALARM";
  if (t.includes("led")) return "LED";
  return "GENERAL";
}

async function migrateOrdensDeServico(pages: NotionPage[]) {
  console.log(`\nMigrating ${pages.length} service orders (Ordens de Servico)...`);
  let created = 0;
  let skipped = 0;
  let junctionCount = 0;

  for (const page of pages) {
    const p = page.properties;

    // Core fields
    const name = getText(p["Name"] ?? p["Nome"] ?? p["name"] ?? p["OS"]);
    const status = mapStatus(getSelect(p["Status"] ?? p["status"]));
    const priority = getNumber(p["Prioridade"] ?? p["prioridade"] ?? p["Priority"]) ?? 0;
    const type = mapType(getSelect(p["Tipo"] ?? p["tipo"] ?? p["Type"]));
    const date = getDate(p["Data"] ?? p["data"] ?? p["Date"]);
    const warranty = getCheckbox(p["Garantia"] ?? p["garantia"]);

    // Financial fields
    const kmDiscount = getNumber(p["Desconto KM"] ?? p["desconto_km"]);
    const tollDiscount = getNumber(p["Desconto Ped\u00e1gio"] ?? p["Desconto Pedagio"]);
    const parking = getNumber(p["Estacionamento"] ?? p["estacionamento"]);
    const mealAllowance = getNumber(p["Alimenta\u00e7\u00e3o"] ?? p["Alimentacao"] ?? p["alimentacao"]);
    const overnightAllowance = getNumber(p["Pernoite"] ?? p["pernoite"]);
    const materialCost = getNumber(p["Custo Material"] ?? p["custo_material"]);
    const transportCost = getNumber(p["Custo Transporte"] ?? p["custo_transporte"] ?? p["Transporte"]);
    const laborCost = getNumber(p["Custo M\u00e3o de Obra"] ?? p["Custo Mao de Obra"] ?? p["M\u00e3o de Obra"]);
    const manHours = getNumber(p["Horas Homem"] ?? p["HH"] ?? p["hh"]);
    const totalCost = getNumber(p["Custo Total"] ?? p["Total"] ?? p["total"]);

    // Text fields
    const materialsUsedNotes = getText(p["Materiais Usados"] ?? p["materiais_usados"]);
    const servicesPerformed = getText(p["Servi\u00e7os Realizados"] ?? p["Servicos Realizados"] ?? p["servicos_realizados"]);
    const managerComment = getText(p["Coment\u00e1rio Gerente"] ?? p["Comentario Gerente"] ?? p["comentario_gerente"]);

    // Relations (Notion page IDs)
    const storeNotionIds = getRelationIds(p["Lojas"] ?? p["Loja"] ?? p["lojas"] ?? p["loja"]);
    const employeeNotionIds = getRelationIds(p["Funcion\u00e1rios"] ?? p["Funcionarios"] ?? p["funcionarios"] ?? p["Equipe"] ?? p["equipe"]);
    const serviceTypeNotionIds = getRelationIds(p["Servi\u00e7os"] ?? p["Servicos"] ?? p["servicos"]);
    const materialNotionIds = getRelationIds(p["Materiais"] ?? p["materiais"]);
    const vehicleNotionIds = getRelationIds(p["Ve\u00edculo"] ?? p["Veiculo"] ?? p["Frota"] ?? p["frota"]);

    if (!name.trim()) {
      console.warn(`  Skipping OS with empty name (Notion ID: ${page.id})`);
      skipped++;
      continue;
    }

    // Resolve vehicle (single relation)
    let vehicleId: string | null = null;
    if (vehicleNotionIds.length > 0) {
      vehicleId = notionToLocalId[vehicleNotionIds[0]] ?? null;
    }

    try {
      const so = await prisma.serviceOrder.create({
        data: {
          name: name.trim(),
          status,
          priority: Math.round(priority),
          type,
          date,
          warranty,
          kmDiscount,
          tollDiscount,
          parking,
          mealAllowance,
          overnightAllowance,
          materialCost,
          transportCost,
          laborCost,
          manHours,
          totalCost,
          materialsUsedNotes: materialsUsedNotes || null,
          servicesPerformed: servicesPerformed || null,
          managerComment: managerComment || null,
          vehicleId,
        },
      });
      notionToLocalId[page.id] = so.id;
      created++;

      // Create junction records for stores
      for (const notionId of storeNotionIds) {
        const storeId = notionToLocalId[notionId];
        if (storeId) {
          await prisma.serviceOrderStore.create({
            data: { serviceOrderId: so.id, storeId },
          }).catch((err) => {
            console.warn(`    Could not link store ${notionId} to OS ${so.id}: ${err.message}`);
          });
          junctionCount++;
        } else {
          console.warn(`    Store relation not found for Notion ID: ${notionId}`);
        }
      }

      // Create junction records for employees
      for (const notionId of employeeNotionIds) {
        const employeeId = notionToLocalId[notionId];
        if (employeeId) {
          await prisma.serviceOrderEmployee.create({
            data: { serviceOrderId: so.id, employeeId },
          }).catch((err) => {
            console.warn(`    Could not link employee ${notionId} to OS ${so.id}: ${err.message}`);
          });
          junctionCount++;
        } else {
          console.warn(`    Employee relation not found for Notion ID: ${notionId}`);
        }
      }

      // Create junction records for service types
      for (const notionId of serviceTypeNotionIds) {
        const serviceTypeId = notionToLocalId[notionId];
        if (serviceTypeId) {
          await prisma.serviceOrderServiceType.create({
            data: { serviceOrderId: so.id, serviceTypeId },
          }).catch((err) => {
            console.warn(`    Could not link service type ${notionId} to OS ${so.id}: ${err.message}`);
          });
          junctionCount++;
        } else {
          console.warn(`    ServiceType relation not found for Notion ID: ${notionId}`);
        }
      }

      // Create junction records for materials
      for (const notionId of materialNotionIds) {
        const materialId = notionToLocalId[notionId];
        if (materialId) {
          await prisma.serviceOrderMaterial.create({
            data: { serviceOrderId: so.id, materialId },
          }).catch((err) => {
            console.warn(`    Could not link material ${notionId} to OS ${so.id}: ${err.message}`);
          });
          junctionCount++;
        } else {
          console.warn(`    Material relation not found for Notion ID: ${notionId}`);
        }
      }
    } catch (err: any) {
      console.error(`  Error creating OS "${name.trim()}": ${err.message}`);
      skipped++;
    }
  }

  console.log(`  Service orders: ${created} created, ${skipped} skipped, ${junctionCount} junction records.`);
}

// ---------------------------------------------------------------------------
// Clear all existing data
// ---------------------------------------------------------------------------

async function clearDatabase() {
  console.log("Clearing existing data...");

  // Delete in order: junction tables first, then main entities
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
  console.log("=== Central 44 - Notion to PostgreSQL Migration ===\n");
  const startTime = Date.now();

  // Step 1: Clear database
  await clearDatabase();

  // Step 2: Fetch all data from Notion (in parallel)
  console.log("\nFetching data from Notion...");

  const [lojasPages, funcPages, frotaPages, servicosPages, materiaisPages, osPages] =
    await Promise.all([
      fetchAllPages(DB_IDS.lojas).then((p) => {
        console.log(`  Lojas: ${p.length} records`);
        return p;
      }),
      fetchAllPages(DB_IDS.funcionarios).then((p) => {
        console.log(`  Funcionarios: ${p.length} records`);
        return p;
      }),
      fetchAllPages(DB_IDS.frota).then((p) => {
        console.log(`  Frota: ${p.length} records`);
        return p;
      }),
      fetchAllPages(DB_IDS.servicos).then((p) => {
        console.log(`  Servicos: ${p.length} records`);
        return p;
      }),
      fetchAllPages(DB_IDS.materiais).then((p) => {
        console.log(`  Materiais: ${p.length} records`);
        return p;
      }),
      fetchAllPages(DB_IDS.os).then((p) => {
        console.log(`  Ordens de Servico: ${p.length} records`);
        return p;
      }),
    ]);

  // Step 3: Migrate lookup tables first (order matters for relation resolution)
  await migrateLojas(lojasPages);
  await migrateFuncionarios(funcPages);
  await migrateFrota(frotaPages);
  await migrateServicos(servicosPages);
  await migrateMateriais(materiaisPages);

  // Step 4: Migrate service orders (depends on all lookup tables)
  await migrateOrdensDeServico(osPages);

  // Done
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Migration complete in ${elapsed}s ===`);
  console.log(`  Total ID mappings: ${Object.keys(notionToLocalId).length}`);
}

main()
  .catch((err) => {
    console.error("\nMigration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
