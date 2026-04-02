import { Request, Response, NextFunction } from "express";
import { ValidationError, AuthenticationError, NotFoundError } from "../errors";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);

  if (err instanceof ValidationError) {
    res
      .status(400)
      .json({ error: { message: err.message, code: "VALIDATION_ERROR", status: 400 } });
    return;
  }

  if (err instanceof AuthenticationError) {
    res
      .status(401)
      .json({ error: { message: err.message, code: "AUTHENTICATION_ERROR", status: 401 } });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { message: err.message, code: "NOT_FOUND", status: 404 } });
    return;
  }

  const message = process.env.NODE_ENV === "production" ? "Internal server error" : err.message;

  res.status(500).json({ error: { message, code: "INTERNAL_ERROR", status: 500 } });
}
