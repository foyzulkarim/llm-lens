import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  OllamaConnectionError,
  OllamaResponseError,
} from "../../../errors";

describe("Custom Error Classes", () => {
  it("ValidationError has correct properties", () => {
    const error = new ValidationError("invalid email");

    expect(error.name).toBe("ValidationError");
    expect(error.message).toBe("invalid email");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
  });

  it("AuthenticationError has correct properties", () => {
    const error = new AuthenticationError("bad key");

    expect(error.name).toBe("AuthenticationError");
    expect(error.message).toBe("bad key");
    expect(error).toBeInstanceOf(Error);
  });

  it("NotFoundError has correct properties", () => {
    const error = new NotFoundError("user not found");

    expect(error.name).toBe("NotFoundError");
    expect(error.message).toBe("user not found");
    expect(error).toBeInstanceOf(Error);
  });

  it("OllamaConnectionError wraps original error", () => {
    const cause = new Error("ECONNREFUSED");
    const error = new OllamaConnectionError("connection failed", cause);

    expect(error.name).toBe("OllamaConnectionError");
    expect(error.message).toBe("connection failed");
    expect(error.cause).toBe(cause);
    expect(error).toBeInstanceOf(Error);
  });

  it("OllamaResponseError has correct properties", () => {
    const error = new OllamaResponseError("bad response");

    expect(error.name).toBe("OllamaResponseError");
    expect(error.message).toBe("bad response");
    expect(error).toBeInstanceOf(Error);
  });
});
