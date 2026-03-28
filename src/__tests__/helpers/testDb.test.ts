import { setupTestDb, resetDb, teardownTestDb } from "./testDb";
import { PrismaClient } from "@prisma/client";

describe("testDb helper", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it("provides a working Prisma client", async () => {
    const result = await prisma.$queryRaw<{ result: number }[]>`SELECT 1 AS result`;

    expect(Number(result[0].result)).toBe(1);
  });

  it("resetDb clears all tables", async () => {
    await prisma.usageLog.create({
      data: {
        userId: "user-1",
        model: "llama3",
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        latencyMs: 100,
      },
    });

    await resetDb();

    const logs = await prisma.usageLog.findMany();
    expect(logs).toHaveLength(0);
  });
});
