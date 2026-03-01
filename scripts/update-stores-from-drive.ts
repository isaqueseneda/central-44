/**
 * Update store records with distance/phone data from Google Drive CABEÇALHO
 * Run: npx tsx scripts/update-stores-from-drive.ts
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

const CABECALHO_FILE_ID = "1zz3V3rTjedvhcsRVDZzqRWhp0FpaCz_AsazeSkIDODk";

interface StoreInfo {
  storeNumber: number;
  city: string;
  state: string;
  address: string;
  distance: number | null;
  phone: string | null;
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

function parseStoreFromLine(
  numberStr: string,
  clientLine: string,
  addressLine: string,
  distanceLine: string,
): StoreInfo | null {
  const num = parseInt(numberStr.trim());
  if (isNaN(num)) return null;

  // Parse city/state from "CLIENTE: LOJAS CEM S.A FILIAL: 003 - SÃO ROQUE - SP"
  const filialMatch = clientLine.match(
    /FILIAL:\s*(\d+)\s*-\s*(.+?)\s*-\s*([A-Z]{2})/,
  );
  if (!filialMatch) return null;

  const city = filialMatch[2].trim();
  const state = filialMatch[3].trim();

  // Parse address from "ENDEREÇO: RUA PADRE LUIS, 345 - CENTRO"
  let address = "";
  const addrMatch = addressLine.match(/ENDEREÇO:\s*(.+)/);
  if (addrMatch) address = addrMatch[1].trim();

  // Parse distance from "DISTÂNCIA: 145 KM ... FONE: (15) 2105-1650"
  let distance: number | null = null;
  const distMatch = distanceLine.match(/DIST[ÂA]NCIA:\s*(\d+)\s*KM/);
  if (distMatch) distance = parseInt(distMatch[1]) * 2; // Convert to round trip

  let phone: string | null = null;
  const phoneMatch = distanceLine.match(/FONE:\s*(\(\d+\)\s*[\d\-\s]+)/);
  if (phoneMatch) phone = phoneMatch[1].trim();

  return { storeNumber: num, city, state, address, distance, phone };
}

async function fetchFileContent(): Promise<string> {
  const fs = await import("fs");
  const path = await import("path");
  const { google } = await import("googleapis");

  const tokenPath = path.join(process.cwd(), "google-tokens.json");
  const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/api/google/callback",
  );
  auth.setCredentials(tokens);

  const drive = google.drive({ version: "v3", auth });
  const exported = await drive.files.export(
    { fileId: CABECALHO_FILE_ID, mimeType: "text/csv" },
    { responseType: "text" },
  );
  return exported.data as string;
}

async function main() {
  console.log("🔄 Fetching CABEÇALHO data from Google Drive...");
  const csvContent = await fetchFileContent();
  const lines = csvContent.split("\n");
  console.log(`📄 Got ${lines.length} lines`);

  // Parse store info - format is 3 lines per entry (number+client, address, distance)
  // Two stores per row (columns 0-2 and columns 3-4)
  const storeInfos: StoreInfo[] = [];

  for (let i = 0; i < lines.length - 2; i++) {
    const cols1 = parseCSVRow(lines[i]);
    const cols2 = parseCSVRow(lines[i + 1]);
    const cols3 = parseCSVRow(lines[i + 2]);

    // Left store (columns 0-1)
    if (cols1[0] && cols1[1] && cols1[1].includes("FILIAL")) {
      const info = parseStoreFromLine(
        cols1[0],
        cols1[1],
        cols2[1] || "",
        cols3[1] || "",
      );
      if (info) storeInfos.push(info);
    }

    // Right store (columns 3-4)
    if (cols1[3] && cols1[4] && cols1[4].includes("FILIAL")) {
      const info = parseStoreFromLine(
        cols1[3],
        cols1[4],
        cols2[4] || "",
        cols3[4] || "",
      );
      if (info) storeInfos.push(info);
    }
  }

  console.log(`📊 Parsed ${storeInfos.length} store entries from CABEÇALHO`);

  // Get existing stores
  const stores = await prisma.store.findMany();
  console.log(`📋 Existing stores: ${stores.length}`);

  // Build lookup by city (lowercase)
  const storeByCity = new Map<string, (typeof stores)[0]>();
  for (const store of stores) {
    storeByCity.set(store.city.toLowerCase(), store);
  }

  let updated = 0;
  let notFound = 0;

  for (const info of storeInfos) {
    const existing = storeByCity.get(info.city.toLowerCase());
    if (!existing) {
      notFound++;
      continue;
    }

    const updates: Record<string, any> = {};

    // Update distance if we don't have one
    if (
      info.distance &&
      (!existing.kmRoundTrip || existing.kmRoundTrip === 0)
    ) {
      updates.kmRoundTrip = info.distance;
    }

    // Update phone if we don't have one
    if (info.phone && !existing.phone) {
      updates.phone = info.phone;
    }

    // Update address if more complete
    if (info.address && info.address.length > (existing.address?.length || 0)) {
      updates.address = info.address;
    }

    // Update store number
    if (info.storeNumber && !existing.storeNumber) {
      updates.storeNumber = info.storeNumber;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.store.update({
        where: { id: existing.id },
        data: updates,
      });
      updated++;
    }
  }

  console.log(`\n🏁 Store update complete:`);
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ❓ Not found in DB: ${notFound}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
