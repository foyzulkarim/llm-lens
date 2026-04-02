import { seed } from "../../../prisma/seed";
import { PrismaClient } from "@prisma/client";
import { setupTestDb, TestDbHandle } from "../helpers/testDb";

describe("Seed Script", () => {
  let prisma: PrismaClient;
  let handle: TestDbHandle;

  beforeAll(async () => {
    handle = await setupTestDb();
    prisma = handle.prisma;
  });

  afterAll(async () => {
    await handle.teardown();
  });

  beforeEach(async () => {
    await handle.resetDb();
  });

  it("seed is idempotent", async () => {
    await seed(prisma);
    await seed(prisma);

    const keyCount = await prisma.apiKey.count();
    expect(keyCount).toBe(4);

    const logCount = await prisma.usageLog.count();
    expect(logCount).toBeGreaterThanOrEqual(80);
    expect(logCount).toBeLessThanOrEqual(100);
  });

  it("spreads logs across 14 days", async () => {
    await seed(prisma);

    const logs = await prisma.usageLog.findMany({ orderBy: { createdAt: "asc" } });
    const dates = logs.map((l) => l.createdAt.getTime());
    const spanDays = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24);

    expect(spanDays).toBeGreaterThanOrEqual(13);
  });

  it("spreads logs across multiple users", async () => {
    await seed(prisma);

    const user1 = await prisma.usageLog.findMany({ where: { userId: "user-1" } });
    const user2 = await prisma.usageLog.findMany({ where: { userId: "user-2" } });
    const user3 = await prisma.usageLog.findMany({ where: { userId: "user-3" } });
    const admin = await prisma.usageLog.findMany({ where: { userId: "admin-1" } });

    expect(user1.length).toBeGreaterThan(0);
    expect(user2.length).toBeGreaterThan(0);
    expect(user3.length).toBeGreaterThan(0);
    expect(admin).toHaveLength(0);
  });

  it("spreads logs across multiple models", async () => {
    await seed(prisma);

    const llama3 = await prisma.usageLog.findMany({ where: { model: "llama3" } });
    const mistral = await prisma.usageLog.findMany({ where: { model: "mistral" } });
    const codellama = await prisma.usageLog.findMany({ where: { model: "codellama" } });

    expect(llama3.length).toBeGreaterThan(0);
    expect(mistral.length).toBeGreaterThan(0);
    expect(codellama.length).toBeGreaterThan(0);
  });

  it("creates 80-100 usage log entries", async () => {
    await seed(prisma);

    const count = await prisma.usageLog.count();

    expect(count).toBeGreaterThanOrEqual(80);
    expect(count).toBeLessThanOrEqual(100);
  });

  it("creates all test API keys", async () => {
    await seed(prisma);

    const keys = await prisma.apiKey.findMany({ orderBy: { userId: "asc" } });

    expect(keys).toHaveLength(4);
    expect(keys[0]).toMatchObject({
      userId: "admin-1",
      userName: "Admin",
      key: "test-key-admin-004",
      isActive: true,
    });
    expect(keys[1]).toMatchObject({
      userId: "user-1",
      userName: "Alice",
      key: "test-key-alice-001",
      isActive: true,
    });
    expect(keys[2]).toMatchObject({
      userId: "user-2",
      userName: "Bob",
      key: "test-key-bob-002",
      isActive: true,
    });
    expect(keys[3]).toMatchObject({
      userId: "user-3",
      userName: "Charlie",
      key: "test-key-charlie-003",
      isActive: true,
    });
  });
});
