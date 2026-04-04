import { Request, Response } from "express";
import { createAuthMiddleware } from "../../../middleware/authMiddleware";
import { IAuthProvider, UserContext } from "../../../interfaces/IAuthProvider";
import { AuthenticationError } from "../../../errors";

function makeNext(): jest.Mock {
  return jest.fn();
}

function makeReq(headers: Record<string, string | string[] | undefined> = {}): Request {
  return { headers } as unknown as Request;
}

const res = {} as Response;

function makeProvider(result: UserContext | Error): IAuthProvider {
  return {
    authenticate: jest.fn().mockImplementation(() => {
      if (result instanceof Error) return Promise.reject(result);
      return Promise.resolve(result);
    }),
  };
}

const validContext: UserContext = {
  userId: "user-1",
  userName: "Alice",
  apiKey: "valid-key",
};

describe("createAuthMiddleware", () => {
  describe("Missing / malformed header", () => {
    it("calls next with AuthenticationError when x-api-key header is absent", async () => {
      const middleware = createAuthMiddleware(makeProvider(validContext));
      const req = makeReq({});
      const next = makeNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it("calls next with AuthenticationError when x-api-key is an array", async () => {
      const middleware = createAuthMiddleware(makeProvider(validContext));
      const req = makeReq({ "x-api-key": ["key1", "key2"] });
      const next = makeNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe("Valid key", () => {
    it("sets req.userContext and calls next() on success", async () => {
      const middleware = createAuthMiddleware(makeProvider(validContext));
      const req = makeReq({ "x-api-key": "valid-key" });
      const next = makeNext();

      await middleware(req, res, next);

      expect(req.userContext).toEqual(validContext);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("Auth provider failure", () => {
    it("forwards AuthenticationError from provider via next(err)", async () => {
      const error = new AuthenticationError("Invalid API key");
      const middleware = createAuthMiddleware(makeProvider(error));
      const req = makeReq({ "x-api-key": "bad-key" });
      const next = makeNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
