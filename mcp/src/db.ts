import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://isaqueseneda@localhost:5432/central44?schema=public";

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });
