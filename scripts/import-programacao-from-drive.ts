/**
 * Import PROGRAMAÇÃO DE PESSOAL 2025 from Google Drive
 * Parses daily staff scheduling data: teams, job types, cities, vehicles, hours, absences
 *
 * Run: npx tsx scripts/import-programacao-from-drive.ts
 */

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new pg.Pool({
  connectionString:
    "postgresql://isaqueseneda@localhost:5432/central44?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const PROGRAMACAO_FILE_ID = "10UBHmtYZ5bEeqy_fhw8YLpIn7diM361EqFIHCrOVOVQ";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface ParsedTeam {
  jobType: "MAN" | "REF" | "OBRA";
  city: string;
  members: { name: string; hours: number | null }[];
  driverName: string | null;
  vehiclePlate: string | null;
}

interface ParsedDay {
  date: Date;
  dayOfWeek: number; // 0=Sun ... 6=Sat
  isHoliday: boolean;
  holidayName: string | null;
  teams: ParsedTeam[];
  folgaEmployees: string[];
  faltaEmployees: string[];
  feriasEmployees: string[];
}

// ──────────────────────────────────────────────
// CSV Parsing helpers
// ──────────────────────────────────────────────

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

function parseBRDate(dateStr: string): Date | null {
  // "02/01/2025" -> Date
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map((p) => parseInt(p));
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

function parseHours(val: string): number | null {
  if (!val || val.trim() === "" || val.trim() === "-") return null;
  // "0,5" -> 0.5, "1,5" -> 1.5, "10,5" -> 10.5
  const cleaned = val.trim().replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

const dayOfWeekMap: Record<string, number> = {
  "domingo": 0,
  "segunda-feira": 1,
  "terça-feira": 2,
  "quarta-feira": 3,
  "quinta-feira": 4,
  "sexta-feira": 5,
  "sábado": 6,
};

function parseJobType(label: string): "MAN" | "REF" | "OBRA" | null {
  const l = label.trim().toUpperCase();
  if (l.includes("LOJAS CEM MAN")) return "MAN";
  if (l.includes("LOJAS CEM REF")) return "REF";
  if (l.includes("LOJAS CEM OBRA")) return "OBRA";
  return null;
}

// ──────────────────────────────────────────────
// Main parsing logic
// ──────────────────────────────────────────────

function parseProgramacaoCSV(csvContent: string): ParsedDay[] {
  const lines = csvContent.split(/\r?\n/);
  const days: ParsedDay[] = [];

  let i = 0;
  while (i < lines.length) {
    const cols = parseCSVRow(lines[i]);

    // Look for DATA row: ",,,,,,DATA,,02/01/2025,,Quinta-Feira,..."
    const dataIdx = cols.findIndex((c) => c.trim() === "DATA");
    if (dataIdx === -1) {
      i++;
      continue;
    }

    // Parse date and day-of-week
    const dateStr = cols[dataIdx + 2]?.trim();
    const dayName = cols[dataIdx + 4]?.trim().toLowerCase();

    if (!dateStr) {
      i++;
      continue;
    }

    const date = parseBRDate(dateStr);
    if (!date) {
      i++;
      continue;
    }

    const dayOfWeek = dayOfWeekMap[dayName] ?? date.getDay();

    // Check if rest of line has FERIADO
    const restOfLine = cols.slice(dataIdx + 5).join(" ").trim();
    const isHoliday = restOfLine.includes("FERIADO");
    const holidayName = isHoliday ? "Feriado" : null;

    i++; // Move past DATA row

    // Skip empty row after DATA
    if (i < lines.length && parseCSVRow(lines[i]).every((c) => !c.trim())) {
      i++;
    }

    // Now parse the FOLGA row to find team assignments
    // The FOLGA row contains: FOLGA,LOJAS CEM MAN,,LOJAS CEM REF,,LOJAS CEM OBRA,...
    // Columns are paired: even cols have job type, odd cols have city below
    const folgaCols = i < lines.length ? parseCSVRow(lines[i]) : [];

    // Detect team columns from FOLGA row
    interface TeamColumn {
      colIdx: number;
      jobType: "MAN" | "REF" | "OBRA";
    }
    const teamColumns: TeamColumn[] = [];
    const folgaEmployees: string[] = [];

    for (let c = 0; c < folgaCols.length; c++) {
      const val = folgaCols[c].trim();
      const jt = parseJobType(val);
      if (jt) {
        teamColumns.push({ colIdx: c, jobType: jt });
      }
    }

    i++; // Move past FOLGA row

    // Next row has city names for each team
    const cityCols = i < lines.length ? parseCSVRow(lines[i]) : [];
    const teamCities: Record<number, string> = {};
    for (const tc of teamColumns) {
      const city = cityCols[tc.colIdx]?.trim();
      if (city) teamCities[tc.colIdx] = city;
    }
    i++; // Move past city row

    // Now collect employee names per team column
    // Employee rows continue until we hit FALTA or empty block
    const teamMembers: Record<
      number,
      { name: string; hours: number | null }[]
    > = {};
    for (const tc of teamColumns) {
      teamMembers[tc.colIdx] = [];
    }

    // Also collect FOLGA employees (in column 0 or in the FOLGA columns)
    while (i < lines.length) {
      const row = parseCSVRow(lines[i]);
      const firstCell = row[0]?.trim().toUpperCase();

      // Stop when we hit FALTA, FERIAS, or a new section marker
      if (firstCell === "FALTA" || firstCell === "FERIAS") break;
      if (row.every((c) => !c.trim())) {
        i++;
        continue;
      }

      // Collect employees from each team column
      for (const tc of teamColumns) {
        const empName = row[tc.colIdx]?.trim();
        const hoursVal = row[tc.colIdx + 1]?.trim();
        if (empName && empName !== "FOLGA" && !parseJobType(empName)) {
          teamMembers[tc.colIdx].push({
            name: empName,
            hours: parseHours(hoursVal || ""),
          });
        }
      }

      // Check for FOLGA employees in column 0 (employees not assigned to teams)
      const col0 = row[0]?.trim();
      if (
        col0 &&
        col0 !== "FOLGA" &&
        col0 !== "FALTA" &&
        col0 !== "FERIAS" &&
        !parseJobType(col0) &&
        col0 !== "MOTORISTA" &&
        col0 !== "VEÍCULO" &&
        !col0.match(/^\d/)
      ) {
        // This is an employee on FOLGA (day off) listed in column 0
        folgaEmployees.push(col0);
      }

      i++;
    }

    // Parse FALTA section
    const faltaEmployees: string[] = [];
    if (
      i < lines.length &&
      parseCSVRow(lines[i])[0]?.trim().toUpperCase() === "FALTA"
    ) {
      // FALTA employees may be listed inline or in the next rows
      const faltaRow = parseCSVRow(lines[i]);
      for (let c = 1; c < faltaRow.length; c++) {
        const name = faltaRow[c]?.trim();
        if (name && name.length > 1) faltaEmployees.push(name);
      }
      i++;

      // Skip until FERIAS
      while (i < lines.length) {
        const row = parseCSVRow(lines[i]);
        const firstCell = row[0]?.trim().toUpperCase();
        if (firstCell === "FERIAS") break;
        // Collect any named employees
        for (const cell of row) {
          const name = cell?.trim();
          if (
            name &&
            name.length > 2 &&
            name !== "FALTA" &&
            !name.match(/^\d/) &&
            name !== ""
          ) {
            // Could be absent employee listed below FALTA
          }
        }
        i++;
      }
    }

    // Parse FERIAS section
    const feriasEmployees: string[] = [];
    if (
      i < lines.length &&
      parseCSVRow(lines[i])[0]?.trim().toUpperCase() === "FERIAS"
    ) {
      i++; // Move past FERIAS label row
      // Next row(s) may have employee names on vacation
      while (i < lines.length) {
        const row = parseCSVRow(lines[i]);
        const firstCell = row[0]?.trim();
        // Stop when we hit the employee count row (starts with numbers) or MOTORISTA
        if (
          firstCell?.match(/^\d/) ||
          firstCell?.toUpperCase() === "MOTORISTA"
        )
          break;
        if (row.every((c) => !c.trim())) {
          i++;
          continue;
        }
        // Collect vacation employees
        for (const cell of row) {
          const name = cell?.trim();
          if (name && name.length > 2 && !name.match(/^\d/)) {
            feriasEmployees.push(name);
          }
        }
        i++;
      }
    }

    // Skip employee count row
    if (i < lines.length && parseCSVRow(lines[i])[0]?.trim()?.match(/^\d/)) {
      i++;
    }

    // Parse MOTORISTA row
    const driverByCol: Record<number, string> = {};
    if (
      i < lines.length &&
      parseCSVRow(lines[i])[0]?.trim().toUpperCase() === "MOTORISTA"
    ) {
      const driverRow = parseCSVRow(lines[i]);
      for (const tc of teamColumns) {
        const driverName = driverRow[tc.colIdx]?.trim();
        if (driverName && driverName !== "MOTORISTA") {
          driverByCol[tc.colIdx] = driverName;
        }
      }
      i++;
    }

    // Skip hours row (numbers)
    if (i < lines.length) i++;

    // Parse VEÍCULO row
    const vehicleByCol: Record<number, string> = {};
    if (
      i < lines.length &&
      parseCSVRow(lines[i])[0]?.trim().toUpperCase() === "VEÍCULO"
    ) {
      const vehicleRow = parseCSVRow(lines[i]);
      for (const tc of teamColumns) {
        const plate = vehicleRow[tc.colIdx]?.trim();
        if (
          plate &&
          plate !== "VEÍCULO" &&
          plate !== "-" &&
          plate.length > 3
        ) {
          vehicleByCol[tc.colIdx] = plate;
        }
      }
      i++;
    }

    // Build teams
    const teams: ParsedTeam[] = [];
    for (const tc of teamColumns) {
      const members = teamMembers[tc.colIdx] || [];
      if (members.length === 0) continue;

      teams.push({
        jobType: tc.jobType,
        city: teamCities[tc.colIdx] || "N/A",
        members,
        driverName: driverByCol[tc.colIdx] || null,
        vehiclePlate: vehicleByCol[tc.colIdx] || null,
      });
    }

    days.push({
      date,
      dayOfWeek,
      isHoliday,
      holidayName,
      teams,
      folgaEmployees,
      faltaEmployees,
      feriasEmployees,
    });

    // Continue to next DATA block
  }

  return days;
}

// ──────────────────────────────────────────────
// Google Drive fetch
// ──────────────────────────────────────────────

async function fetchFileContent(): Promise<string> {
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
    "http://localhost:3000/api/google/callback"
  );
  auth.setCredentials(tokens);

  const drive = google.drive({ version: "v3", auth });
  const exported = await drive.files.export(
    { fileId: PROGRAMACAO_FILE_ID, mimeType: "text/csv" },
    { responseType: "text" }
  );
  return exported.data as string;
}

// ──────────────────────────────────────────────
// Import to database
// ──────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log("🔄 Fetching PROGRAMAÇÃO DE PESSOAL 2025 from Google Drive...");
  const csvContent = await fetchFileContent();
  console.log(`📄 Got ${csvContent.length} characters`);

  const days = parseProgramacaoCSV(csvContent);
  console.log(`📊 Parsed ${days.length} daily schedules`);

  // Show summary
  const withTeams = days.filter((d) => d.teams.length > 0);
  const holidays = days.filter((d) => d.isHoliday);
  console.log(`  📋 Days with team assignments: ${withTeams.length}`);
  console.log(`  🎉 Holidays: ${holidays.length}`);

  // Get employees and vehicles for matching
  const employees = await prisma.employee.findMany();
  const vehicles = await prisma.vehicle.findMany();

  const empByName = new Map<string, string>(); // lowercase name -> id
  for (const emp of employees) {
    empByName.set(emp.shortName.toLowerCase(), emp.id);
    if (emp.fullName) {
      empByName.set(emp.fullName.toLowerCase(), emp.id);
      // Also first name
      const first = emp.fullName.toLowerCase().split(/\s+/)[0];
      if (!empByName.has(first)) empByName.set(first, emp.id);
    }
    // First name from shortName
    const first = emp.shortName.toLowerCase().split(/\s+/)[0];
    if (!empByName.has(first)) empByName.set(first, emp.id);
  }

  const vehicleByPlate = new Map<string, string>();
  for (const v of vehicles) {
    vehicleByPlate.set(
      v.licensePlate.replace(/[\s-]/g, "").toUpperCase(),
      v.id
    );
  }

  function findEmployeeId(name: string): string | null {
    const lower = name.toLowerCase().trim();
    if (empByName.has(lower)) return empByName.get(lower)!;
    // Try without trailing dot
    const noDot = lower.replace(/\.$/, "");
    if (empByName.has(noDot)) return empByName.get(noDot)!;
    // Try first name
    const first = lower.split(/\s+/)[0];
    if (empByName.has(first)) return empByName.get(first)!;
    return null;
  }

  function findVehicleId(plate: string): string | null {
    const cleaned = plate.replace(/[\s-]/g, "").toUpperCase();
    if (vehicleByPlate.has(cleaned)) return vehicleByPlate.get(cleaned)!;
    return null;
  }

  // Group days by week (Monday start)
  const weekMap = new Map<string, ParsedDay[]>();
  for (const day of days) {
    const monday = getMondayOfWeek(day.date);
    const key = monday.toISOString().slice(0, 10);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(day);
  }

  console.log(`📅 ${weekMap.size} weeks of data`);

  // Import all data (no date filter)

  let weeksImported = 0;
  let daysImported = 0;
  let teamsImported = 0;
  let membersImported = 0;
  let absencesImported = 0;
  let skipped = 0;

  for (const [weekKey, weekDays] of weekMap) {
    const monday = new Date(weekKey + "T00:00:00.000Z");
    // Create or find WeeklySchedule
    let schedule = await prisma.weeklySchedule.findUnique({
      where: { weekStart: monday },
    });

    if (!schedule) {
      schedule = await prisma.weeklySchedule.create({
        data: {
          weekStart: monday,
          status: monday < new Date() ? "COMPLETED" : "PUBLISHED",
        },
      });
    }

    for (const day of weekDays) {
      // Create DailySchedule
      const dateOnly = new Date(
        Date.UTC(
          day.date.getFullYear(),
          day.date.getMonth(),
          day.date.getDate()
        )
      );

      // Check if daily schedule already exists
      const existingDaily = await prisma.dailySchedule.findUnique({
        where: {
          weeklyScheduleId_date: {
            weeklyScheduleId: schedule.id,
            date: dateOnly,
          },
        },
      });

      if (existingDaily) continue;

      const dailySchedule = await prisma.dailySchedule.create({
        data: {
          weeklyScheduleId: schedule.id,
          date: dateOnly,
          dayOfWeek: day.dayOfWeek,
          isHoliday: day.isHoliday,
          holidayName: day.holidayName,
        },
      });

      // Create teams
      for (const team of day.teams) {
        const driverId = team.driverName
          ? findEmployeeId(team.driverName)
          : null;
        const vehicleId = team.vehiclePlate
          ? findVehicleId(team.vehiclePlate)
          : null;

        const dailyTeam = await prisma.dailyTeam.create({
          data: {
            dailyScheduleId: dailySchedule.id,
            jobType: team.jobType,
            city: team.city,
            driverId,
            vehicleId,
          },
        });

        teamsImported++;

        // Create team members
        for (const member of team.members) {
          const empId = findEmployeeId(member.name);
          if (!empId) continue;

          try {
            await prisma.dailyTeamMember.create({
              data: {
                dailyTeamId: dailyTeam.id,
                employeeId: empId,
                hours: member.hours,
              },
            });
            membersImported++;
          } catch {
            // Duplicate - skip
          }
        }
      }

      // Create absences
      const allAbsences = [
        ...day.folgaEmployees.map((name) => ({
          name,
          type: "FOLGA" as const,
        })),
        ...day.faltaEmployees.map((name) => ({
          name,
          type: "FALTA" as const,
        })),
        ...day.feriasEmployees.map((name) => ({
          name,
          type: "FERIAS" as const,
        })),
      ];

      for (const absence of allAbsences) {
        const empId = findEmployeeId(absence.name);
        if (!empId) continue;

        try {
          await prisma.dailyAbsence.create({
            data: {
              dailyScheduleId: dailySchedule.id,
              employeeId: empId,
              type: absence.type,
            },
          });
          absencesImported++;
        } catch {
          // Duplicate - skip
        }
      }

      daysImported++;
    }

    weeksImported++;
  }

  console.log(`\n🏁 Import complete:`);
  console.log(`  📅 Weeks imported: ${weeksImported}`);
  console.log(`  📋 Days imported: ${daysImported}`);
  console.log(`  👷 Teams created: ${teamsImported}`);
  console.log(`  👤 Team members: ${membersImported}`);
  console.log(`  🏖️  Absences: ${absencesImported}`);
  console.log(`  ⏭️  Weeks skipped (older than 3 months): ${skipped}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
