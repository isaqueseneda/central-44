/**
 * Import completed OS data from Google Drive "ORDEM DE SERVIÇO JA EXECULTADOS" spreadsheet
 * This imports 125 records with: employee, OS number, city, date, services, materials, costs
 *
 * Run: npx tsx scripts/import-from-drive.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    "postgresql://isaqueseneda@localhost:5432/central44?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// Google Drive file ID
const EXECUTADOS_FILE_ID = "1NznaEMkhx0ii7nRQREWqM1zqzrjUqex_m4MGFY87NfE";

interface OSRow {
  employee: string;
  osNumber: string;
  city: string;
  date: string;
  servicesPerformed: string;
  materials: string;
  materialCost: number | null;
  totalCost: number | null;
}

function parseBRLCurrency(value: string): number | null {
  if (!value || value.trim() === "") return null;
  // "R$ 1.749,83" -> 1749.83
  const cleaned = value
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseBRDate(value: string): Date | null {
  if (!value || value.trim() === "") return null;
  // "30/09/2024" -> Date
  const parts = value.trim().split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return isNaN(d.getTime()) ? null : d;
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function fetchFileContent(): Promise<string> {
  // Use the Google Drive API directly via googleapis
  const fs = await import("fs");
  const path = await import("path");
  const { google } = await import("googleapis");

  const tokenPath = path.join(process.cwd(), "google-tokens.json");
  if (!fs.existsSync(tokenPath)) {
    throw new Error("No Google tokens found. Run the OAuth flow first.");
  }

  const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/api/google/callback",
  );
  auth.setCredentials(tokens);

  const drive = google.drive({ version: "v3", auth });

  const exported = await drive.files.export(
    { fileId: EXECUTADOS_FILE_ID, mimeType: "text/csv" },
    { responseType: "text" },
  );

  return exported.data as string;
}

async function main() {
  console.log("🔄 Fetching OS data from Google Drive...");
  const csvContent = await fetchFileContent();

  const lines = csvContent.split("\n");
  console.log(`📄 Got ${lines.length} lines`);

  // Parse CSV - header is first row
  // QUEM FEZ, ORDEM DE SERVIÇO, CIDADE, DATA, SERVIÇO EXECULTADO, MATERIAIS, VALOR MATERIAIS, VALOR TOTAL
  const rows: OSRow[] = [];
  let currentRow: Partial<OSRow> | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = parseCSVRow(line);

    // If first column has content, it's a new row
    if (cols[0] && cols[0].trim() && cols[1] && cols[1].trim()) {
      // Save previous row
      if (currentRow && currentRow.employee && currentRow.osNumber) {
        rows.push(currentRow as OSRow);
      }

      currentRow = {
        employee: cols[0].trim().replace(/\t/g, ""),
        osNumber: cols[1].trim(),
        city: (cols[2] || "").trim(),
        date: (cols[3] || "").trim(),
        servicesPerformed: (cols[4] || "").trim(),
        materials: (cols[5] || "").trim(),
        materialCost: parseBRLCurrency(cols[6] || ""),
        totalCost: parseBRLCurrency(cols[7] || ""),
      };
    } else if (currentRow) {
      // Continuation of previous row (multiline services/materials)
      if (cols[4]) {
        currentRow.servicesPerformed =
          (currentRow.servicesPerformed || "") + "\n" + cols[4].trim();
      }
      if (cols[5]) {
        currentRow.materials =
          (currentRow.materials || "") + "\n" + cols[5].trim();
      }
    }
  }

  // Don't forget last row
  if (currentRow && currentRow.employee && currentRow.osNumber) {
    rows.push(currentRow as OSRow);
  }

  console.log(`📊 Parsed ${rows.length} OS records`);

  // Get existing data for matching
  const stores = await prisma.store.findMany();
  const employees = await prisma.employee.findMany();
  const existingOS = await prisma.serviceOrder.findMany({
    select: { id: true, orderNumber: true, name: true },
  });

  console.log(
    `📋 Existing: ${stores.length} stores, ${employees.length} employees, ${existingOS.length} OS`,
  );

  // Build lookup maps
  const storeByCity = new Map<string, (typeof stores)[0]>();
  for (const store of stores) {
    storeByCity.set(store.city.toLowerCase(), store);
    storeByCity.set(store.sigla.toLowerCase(), store);
  }

  const employeeByName = new Map<string, (typeof employees)[0]>();
  for (const emp of employees) {
    employeeByName.set(emp.shortName.toLowerCase(), emp);
    if (emp.fullName) {
      employeeByName.set(emp.fullName.toLowerCase(), emp);
    }
  }

  // Track the highest existing orderNumber
  let maxOrderNum = Math.max(...existingOS.map((o) => o.orderNumber), 0);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      // Check if this OS already exists (by OS number pattern in name)
      const alreadyExists = existingOS.some(
        (o) =>
          o.name.includes(row.osNumber) ||
          o.name.toLowerCase() === row.city.toLowerCase(),
      );

      if (alreadyExists) {
        skipped++;
        continue;
      }

      // Find store
      const cityLower = row.city.toLowerCase().trim();
      let store = storeByCity.get(cityLower);
      // Try partial match
      if (!store) {
        for (const [key, s] of storeByCity.entries()) {
          if (
            cityLower.includes(key) ||
            key.includes(cityLower.split(" ")[0])
          ) {
            store = s;
            break;
          }
        }
      }

      // Find employee
      const empName = row.employee
        .toLowerCase()
        .split(/\s+/)
        .slice(0, 2)
        .join(" ");
      let employee = employeeByName.get(empName);
      if (!employee) {
        // Try first name only
        const firstName = row.employee.toLowerCase().split(/\s+/)[0];
        for (const [key, e] of employeeByName.entries()) {
          if (key.startsWith(firstName) || key.includes(firstName)) {
            employee = e;
            break;
          }
        }
      }

      // Parse date
      const date = parseBRDate(row.date);

      // Determine OS type from services
      let type: "GENERAL" | "ALARM" | "LED" = "GENERAL";
      const servLower = row.servicesPerformed.toLowerCase();
      if (
        servLower.includes("alarme") ||
        servLower.includes("sensor") ||
        servLower.includes("intrus")
      ) {
        type = "ALARM";
      } else if (
        servLower.includes("led") ||
        servLower.includes("luminaria") ||
        servLower.includes("colmeia")
      ) {
        type = "LED";
      }

      maxOrderNum++;

      // Create service order
      const order = await prisma.serviceOrder.create({
        data: {
          name: `${row.city} - ${row.osNumber}`,
          orderNumber: maxOrderNum,
          status: "PAID", // These are completed/executed
          priority: 0,
          type,
          date,
          warranty: false,
          servicesPerformed: row.servicesPerformed || null,
          materialsUsedNotes: row.materials || null,
          materialCost: row.materialCost,
          totalCost: row.totalCost,
        },
      });

      // Link store if found
      if (store) {
        await prisma.serviceOrderStore.create({
          data: {
            serviceOrderId: order.id,
            storeId: store.id,
          },
        });
      }

      // Link employee if found
      if (employee) {
        await prisma.serviceOrderEmployee.create({
          data: {
            serviceOrderId: order.id,
            employeeId: employee.id,
          },
        });
      }

      created++;

      if (created % 20 === 0) {
        console.log(`  ✅ Created ${created} OS so far...`);
      }
    } catch (err: any) {
      console.error(`  ❌ Error for OS ${row.osNumber}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n🏁 Import complete:`);
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);

  // Final count
  const totalOS = await prisma.serviceOrder.count();
  console.log(`  📊 Total OS in database: ${totalOS}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
