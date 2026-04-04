import { PrismaClient } from "@prisma/client";
import { setupTestDb, TestDbHandle } from "../../helpers/testDb";
import { PrismaApiKeyRepository } from "../../../auth/apiKeyRepository";

describe("PrismaApiKeyRepository", () => {
  let prisma: PrismaClient;
  let repo: PrismaApiKeyRepository;
  let handle: TestDbHandle;

  beforeAll(async () => {
    handle = await setupTestDb();
    prisma = handle.prisma;
    repo = new PrismaApiKeyRepository(prisma);
  });

  afterAll(async () => {
    await handle.teardown();
  });

  afterEach(async () => {
    await handle.resetDb();
  });

  describe("findByKey()", () => {
    it("returns the record for an existing key", async () => {
      const created = await prisma.apiKey.create({
        data: {
          key: "test-key",
          userId: "user-1",
          userName: "Alice",
          isActive: true,
        },
      });

      const result = await repo.findByKey("test-key");

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);
      expect(result!.key).toBe("test-key");
      expect(result!.userId).toBe("user-1");
      expect(result!.userName).toBe("Alice");
      expect(result!.isActive).toBe(true);
      expect(result!.createdAt).toBeInstanceOf(Date);
    });

    it("returns null for an unknown key", async () => {
      const result = await repo.findByKey("unknown-key");

      expect(result).toBeNull();
    });

    it("returns inactive keys without filtering", async () => {
      await prisma.apiKey.create({
        data: {
          key: "revoked-key",
          userId: "user-2",
          userName: "Bob",
          isActive: false,
        },
      });

      const result = await repo.findByKey("revoked-key");

      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
    });
  });
});
