import { PrismaClient } from "@prisma/client";
import { setupTestDb, resetDb, teardownTestDb } from "../../helpers/testDb";
import { PrismaUsageRepository } from "../../../usage/usageRepository";
import { UsageRecord } from "../../../interfaces/IUsageLogger";

const baseRecord: UsageRecord = {
  userId: "user-1",
  model: "llama3",
  promptTokens: 10,
  completionTokens: 20,
  totalTokens: 30,
  latencyMs: 100,
};

describe("PrismaUsageRepository", () => {
  let prisma: PrismaClient;
  let repo: PrismaUsageRepository;

  beforeAll(async () => {
    prisma = await setupTestDb();
    repo = new PrismaUsageRepository(prisma);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  afterEach(async () => {
    await resetDb();
  });

  describe("create()", () => {
    it("creates a usage log entry", async () => {
      const entry = await repo.create(baseRecord);

      expect(entry.id).toBeDefined();
      expect(entry.userId).toBe("user-1");
      expect(entry.model).toBe("llama3");
      expect(entry.promptTokens).toBe(10);
      expect(entry.completionTokens).toBe(20);
      expect(entry.totalTokens).toBe(30);
      expect(entry.latencyMs).toBe(100);
    });

    it("sets createdAt automatically", async () => {
      const before = new Date();
      const entry = await repo.create(baseRecord);
      const after = new Date();

      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entry.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("findByUser()", () => {
    it("returns logs for a specific user", async () => {
      await repo.create({ ...baseRecord, userId: "user-1" });
      await repo.create({ ...baseRecord, userId: "user-2" });

      const results = await repo.findByUser("user-1");

      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe("user-1");
    });

    it("filters by date range", async () => {
      const past = new Date("2026-01-01T00:00:00Z");
      const recent = new Date("2026-03-28T00:00:00Z");

      await prisma.usageLog.create({
        data: { ...baseRecord, createdAt: past },
      });
      await prisma.usageLog.create({
        data: { ...baseRecord, createdAt: recent },
      });

      const from = new Date("2026-03-01T00:00:00Z");
      const to = new Date("2026-03-31T00:00:00Z");
      const results = await repo.findByUser("user-1", from, to);

      expect(results).toHaveLength(1);
      expect(results[0].createdAt.getTime()).toBe(recent.getTime());
    });

    it("returns empty array for unknown user", async () => {
      const results = await repo.findByUser("user-99");

      expect(results).toEqual([]);
    });

    it("returns all user logs when no date range", async () => {
      for (let i = 0; i < 5; i++) {
        await repo.create({ ...baseRecord, userId: "user-1" });
      }

      const results = await repo.findByUser("user-1");

      expect(results).toHaveLength(5);
    });
  });

  describe("findByModel()", () => {
    it("returns logs for a specific model", async () => {
      await repo.create({ ...baseRecord, model: "llama3" });
      await repo.create({ ...baseRecord, model: "mistral" });

      const results = await repo.findByModel("llama3");

      expect(results).toHaveLength(1);
      expect(results[0].model).toBe("llama3");
    });

    it("filters by date range", async () => {
      const past = new Date("2026-01-01T00:00:00Z");
      const recent = new Date("2026-03-28T00:00:00Z");

      await prisma.usageLog.create({
        data: { ...baseRecord, model: "llama3", createdAt: past },
      });
      await prisma.usageLog.create({
        data: { ...baseRecord, model: "llama3", createdAt: recent },
      });

      const from = new Date("2026-03-01T00:00:00Z");
      const to = new Date("2026-03-31T00:00:00Z");
      const results = await repo.findByModel("llama3", from, to);

      expect(results).toHaveLength(1);
    });

    it("returns empty array for unknown model", async () => {
      const results = await repo.findByModel("unknown");

      expect(results).toEqual([]);
    });
  });

  describe("findAll()", () => {
    it("returns all logs", async () => {
      for (let i = 0; i < 10; i++) {
        await repo.create({
          ...baseRecord,
          userId: `user-${i}`,
          model: i % 2 === 0 ? "llama3" : "mistral",
        });
      }

      const results = await repo.findAll();

      expect(results).toHaveLength(10);
    });

    it("filters by date range", async () => {
      const past = new Date("2026-01-01T00:00:00Z");
      const recent = new Date("2026-03-28T00:00:00Z");

      await prisma.usageLog.create({ data: { ...baseRecord, createdAt: past } });
      await prisma.usageLog.create({ data: { ...baseRecord, createdAt: recent } });

      const from = new Date("2026-03-01T00:00:00Z");
      const to = new Date("2026-03-31T00:00:00Z");
      const results = await repo.findAll(from, to);

      expect(results).toHaveLength(1);
    });

    it("returns empty array when no logs", async () => {
      const results = await repo.findAll();

      expect(results).toEqual([]);
    });
  });
});
