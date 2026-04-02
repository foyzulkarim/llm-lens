export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class OllamaConnectionError extends Error {
  cause: Error;

  constructor(message: string, cause: Error) {
    super(message);
    this.name = "OllamaConnectionError";
    this.cause = cause;
    Object.setPrototypeOf(this, OllamaConnectionError.prototype);
  }
}

export class OllamaResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaResponseError";
    Object.setPrototypeOf(this, OllamaResponseError.prototype);
  }
}
