import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface TestDbHandle {
  prisma: PrismaClient;
  resetDb: () => Promise<void>;
  teardown: () => Promise<void>;
}

export async function setupTestDb(): Promise<TestDbHandle> {
  const dbPath = path.join(
    os.tmpdir(),
    `llm-lens-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
  );
  const dbUrl = `file:${dbPath}`;

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "pipe",
  });

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  await prisma.$connect();

  const resetDb = async () => {
    await prisma.usageLog.deleteMany();
    await prisma.apiKey.deleteMany();
  };

  const teardown = async () => {
    await prisma.$disconnect();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  };

  return { prisma, resetDb, teardown };
}
