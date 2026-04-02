import { setupTestDb } from "./testDb";

describe("testDb helper", () => {
  const handlePromise = setupTestDb();

  afterAll(async () => {
    const handle = await handlePromise;
    await handle.teardown();
  });

  it("provides a working Prisma client", async () => {
    const handle = await handlePromise;
    const result = await handle.prisma.$queryRaw<{ result: number }[]>`SELECT 1 AS result`;

    expect(Number(result[0].result)).toBe(1);
  });

  it("resetDb clears all tables", async () => {
    const handle = await handlePromise;
    await handle.prisma.usageLog.create({
      data: {
        userId: "user-1",
        model: "llama3",
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        latencyMs: 100,
      },
    });

    await handle.resetDb();

    const logs = await handle.prisma.usageLog.findMany();
    expect(logs).toHaveLength(0);
  });
});
