import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  let connectionString = process.env.DATABASE_URL!;
  // Ensure SSL is enabled but don't force verify-full (requires CA certs, fails on Windows)
  if (!connectionString.includes("sslmode=")) {
    connectionString += `${connectionString.includes("?") ? "&" : "?"}sslmode=require`;
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

globalForPrisma.prisma = prisma;
