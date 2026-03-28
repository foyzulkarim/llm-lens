import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

let prisma: PrismaClient;
let dbPath: string;

export async function setupTestDb(): Promise<PrismaClient> {
  dbPath = path.join(
    os.tmpdir(),
    `llm-lens-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
  );
  const dbUrl = `file:${dbPath}`;

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "pipe",
  });

  prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  await prisma.$connect();
  return prisma;
}

export async function resetDb(): Promise<void> {
  await prisma.usageLog.deleteMany();
  await prisma.apiKey.deleteMany();
}

export async function teardownTestDb(): Promise<void> {
  await prisma.$disconnect();
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
}
