import request from "supertest";
import { Express } from "express";
import { setupTestDb, TestDbHandle } from "../../helpers/testDb";
import { createTestApp } from "../../helpers/testApp";

describe("Auth Flow Integration", () => {
  let app: Express;
  let handle: TestDbHandle;

  beforeAll(async () => {
    handle = await setupTestDb();
    app = createTestApp(handle.prisma);

    // Test-only protected route to verify userContext is populated
    app.get("/api/test-protected", (req, res) => {
      res.json({ userId: req.userContext?.userId });
    });
  });

  afterAll(async () => {
    await handle.teardown();
  });

  afterEach(async () => {
    await handle.resetDb();
  });

  describe("Public route", () => {
    it("GET /health returns 200 without API key", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
    });
  });

  describe("Missing / invalid key on protected route", () => {
    it("returns 401 with AUTHENTICATION_ERROR when header is missing", async () => {
      const res = await request(app).get("/api/test-protected");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("returns 401 with AUTHENTICATION_ERROR for an unknown key", async () => {
      const res = await request(app).get("/api/test-protected").set("x-api-key", "does-not-exist");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("returns 401 with AUTHENTICATION_ERROR for a revoked key", async () => {
      await handle.prisma.apiKey.create({
        data: {
          key: "revoked-key",
          userId: "user-2",
          userName: "Bob",
          isActive: false,
        },
      });

      const res = await request(app).get("/api/test-protected").set("x-api-key", "revoked-key");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("AUTHENTICATION_ERROR");
    });
  });

  describe("Valid key", () => {
    it("passes auth and populates userContext for a valid key", async () => {
      await handle.prisma.apiKey.create({
        data: {
          key: "test-key-alice-001",
          userId: "user-1",
          userName: "Alice",
          isActive: true,
        },
      });

      const res = await request(app)
        .get("/api/test-protected")
        .set("x-api-key", "test-key-alice-001");

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe("user-1");
    });
  });
});
