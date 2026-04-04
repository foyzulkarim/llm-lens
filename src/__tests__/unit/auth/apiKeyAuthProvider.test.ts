import { ApiKeyAuthProvider } from "../../../auth/apiKeyAuthProvider";
import { IApiKeyRepo, ApiKeyRecord } from "../../../interfaces/IApiKeyRepo";
import { AuthenticationError } from "../../../errors";

function makeRecord(overrides: Partial<ApiKeyRecord> = {}): ApiKeyRecord {
  return {
    id: "id-1",
    key: "valid-key",
    userId: "user-1",
    userName: "Alice",
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeRepo(record: ApiKeyRecord | null): IApiKeyRepo {
  return {
    findByKey: jest.fn().mockResolvedValue(record),
  };
}

describe("ApiKeyAuthProvider", () => {
  describe("authenticate() — happy path", () => {
    it("returns UserContext for a valid active key", async () => {
      const record = makeRecord();
      const provider = new ApiKeyAuthProvider(makeRepo(record));

      const result = await provider.authenticate("valid-key");

      expect(result).toEqual({
        userId: "user-1",
        userName: "Alice",
      });
    });
  });

  describe("authenticate() — failures", () => {
    it("throws AuthenticationError when key not found", async () => {
      const provider = new ApiKeyAuthProvider(makeRepo(null));

      await expect(provider.authenticate("unknown-key")).rejects.toThrow(AuthenticationError);
    });

    it("throws AuthenticationError when key is inactive", async () => {
      const record = makeRecord({ isActive: false });
      const provider = new ApiKeyAuthProvider(makeRepo(record));

      await expect(provider.authenticate("revoked-key")).rejects.toThrow(AuthenticationError);
    });

    it("uses same error message for all failures", async () => {
      const providerNotFound = new ApiKeyAuthProvider(makeRepo(null));
      const providerInactive = new ApiKeyAuthProvider(makeRepo(makeRecord({ isActive: false })));

      const errNotFound = await providerNotFound.authenticate("x").catch((e: unknown) => e);
      const errInactive = await providerInactive.authenticate("x").catch((e: unknown) => e);

      expect((errNotFound as AuthenticationError).message).toBe("Invalid API key");
      expect((errInactive as AuthenticationError).message).toBe("Invalid API key");
    });
  });
});
