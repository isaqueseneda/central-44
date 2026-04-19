/**
 * Database backup script for Central 44.
 * Exports all tables as JSON and optionally uploads to Google Drive.
 *
 * Usage: npx tsx scripts/backup-db.ts [timestamp]
 *
 * No pg_dump needed — uses Prisma to query all tables and saves as JSON.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { google } from "googleapis";

// Load env
import "dotenv/config";

const BACKUPS_DIR = path.join(process.cwd(), "backups");
const TOKEN_PATH = path.join(process.cwd(), "google-tokens.json");
const DRIVE_FOLDER_NAME = "Central44-Backups";

async function createPrisma() {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");
  // Ensure SSL is enabled but don't force verify-full (requires CA certs, fails on Windows)
  if (!connectionString.includes("sslmode=")) {
    connectionString += `${connectionString.includes("?") ? "&" : "?"}sslmode=require`;
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

async function exportDatabase(prisma: PrismaClient) {
  console.log("[BACKUP] Exportando tabelas...");

  const data: Record<string, unknown[]> = {};

  // Export all tables
  const tables = [
    { name: "stores", query: () => prisma.store.findMany() },
    { name: "employees", query: () => prisma.employee.findMany() },
    { name: "vehicles", query: () => prisma.vehicle.findMany() },
    { name: "serviceTypes", query: () => prisma.serviceType.findMany() },
    { name: "materials", query: () => prisma.material.findMany() },
    { name: "serviceOrders", query: () => prisma.serviceOrder.findMany() },
    { name: "serviceOrderStores", query: () => prisma.serviceOrderStore.findMany() },
    { name: "serviceOrderEmployees", query: () => prisma.serviceOrderEmployee.findMany() },
    { name: "serviceOrderServiceTypes", query: () => prisma.serviceOrderServiceType.findMany() },
    { name: "serviceOrderMaterials", query: () => prisma.serviceOrderMaterial.findMany() },
    { name: "serviceOrderTeams", query: () => prisma.serviceOrderTeam.findMany() },
    { name: "travelExpenses", query: () => prisma.travelExpense.findMany() },
    { name: "teams", query: () => prisma.team.findMany() },
    { name: "teamMembers", query: () => prisma.teamMember.findMany() },
    { name: "teamScheduleAssignments", query: () => prisma.teamScheduleAssignment.findMany() },
    { name: "dataSuggestions", query: () => prisma.dataSuggestion.findMany() },
    { name: "settings", query: () => prisma.setting.findMany() },
  ] as const;

  for (const table of tables) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data[table.name] = await (table.query as () => Promise<any[]>)();
      console.log(`  ${table.name}: ${data[table.name].length} registros`);
    } catch (e) {
      console.log(`  ${table.name}: tabela nao encontrada (pulando)`);
    }
  }

  return data;
}

function getAuthorizedDriveClient() {
  if (!fs.existsSync(TOKEN_PATH)) return null;

  try {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    client.setCredentials(tokens);

    // Auto-refresh tokens
    client.on("tokens", (newTokens) => {
      const existing = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
      const merged = { ...existing, ...newTokens };
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
    });

    return google.drive({ version: "v3", auth: client });
  } catch {
    return null;
  }
}

async function findOrCreateFolder(drive: ReturnType<typeof google.drive>, folderName: string) {
  // Search for existing folder
  const res = await drive.files.list({
    q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create new folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  console.log(`[BACKUP] Pasta '${folderName}' criada no Google Drive.`);
  return folder.data.id!;
}

async function uploadToDrive(drive: ReturnType<typeof google.drive>, filePath: string, fileName: string) {
  try {
    const folderId = await findOrCreateFolder(drive, DRIVE_FOLDER_NAME);

    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: "application/json",
        body: fs.createReadStream(filePath),
      },
      fields: "id",
    });

    console.log(`[BACKUP] Upload para Google Drive concluido: ${fileName}`);

    // Clean up old backups on Drive (keep last 30)
    const oldFiles = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, createdTime)",
      orderBy: "createdTime desc",
      pageSize: 100,
    });

    const files = oldFiles.data.files || [];
    if (files.length > 30) {
      for (const file of files.slice(30)) {
        await drive.files.delete({ fileId: file.id! });
      }
      console.log(`[BACKUP] ${files.length - 30} backups antigos removidos do Drive.`);
    }
  } catch (e) {
    console.log(`[BACKUP] AVISO: Upload para Google Drive falhou: ${(e as Error).message}`);
    console.log("[BACKUP] O backup local foi salvo com sucesso.");
  }
}

async function main() {
  const timestamp = process.argv[2] || new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `central44_backup_${timestamp}.json`;
  const filePath = path.join(BACKUPS_DIR, fileName);

  // Ensure backups dir exists
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const prisma = await createPrisma();

  try {
    // Export all data
    const data = await exportDatabase(prisma);

    // Add metadata
    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      tables: data,
    };

    // Save locally
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    console.log(`[BACKUP] Salvo localmente: ${fileName} (${sizeMB} MB)`);

    // Upload to Google Drive if authenticated
    const drive = getAuthorizedDriveClient();
    if (drive) {
      await uploadToDrive(drive, filePath, fileName);
    } else {
      console.log("[BACKUP] Google Drive nao autenticado — somente backup local.");
      console.log("[BACKUP] Para ativar backup na nuvem, acesse http://localhost:3000/api/google/auth");
    }

    console.log("[BACKUP] Concluido com sucesso!");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[BACKUP] ERRO:", e.message);
  process.exit(1);
});
