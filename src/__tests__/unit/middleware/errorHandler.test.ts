import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../../middleware/errorHandler";
import { ValidationError, AuthenticationError, NotFoundError } from "../../../errors";

function makeMocks() {
  const req = {} as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe("Error Handler Middleware", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  it("maps ValidationError to 400", () => {
    const { req, res, next } = makeMocks();
    const error = new ValidationError("invalid email");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "invalid email", code: "VALIDATION_ERROR", status: 400 },
    });
  });

  it("maps AuthenticationError to 401", () => {
    const { req, res, next } = makeMocks();
    const error = new AuthenticationError("bad key");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "bad key", code: "AUTHENTICATION_ERROR", status: 401 },
    });
  });

  it("maps NotFoundError to 404", () => {
    const { req, res, next } = makeMocks();
    const error = new NotFoundError("user not found");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "user not found", code: "NOT_FOUND", status: 404 },
    });
  });

  it("maps unknown errors to 500", () => {
    const { req, res, next } = makeMocks();
    const error = new Error("something exploded");
    process.env.NODE_ENV = "development";

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "something exploded", code: "INTERNAL_ERROR", status: 500 },
    });
  });

  it("hides error details in production", () => {
    const { req, res, next } = makeMocks();
    const error = new Error("secret internal failure");
    process.env.NODE_ENV = "production";

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "Internal server error", code: "INTERNAL_ERROR", status: 500 },
    });
  });

  it("shows error details in development", () => {
    const { req, res, next } = makeMocks();
    const error = new Error("secret internal failure");
    process.env.NODE_ENV = "development";

    errorHandler(error, req, res, next);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.error.message).toBe("secret internal failure");
  });

  it("logs errors to console.error", () => {
    const { req, res, next } = makeMocks();
    const error = new ValidationError("oops");
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    errorHandler(error, req, res, next);

    expect(spy).toHaveBeenCalledWith(error);
  });
});
