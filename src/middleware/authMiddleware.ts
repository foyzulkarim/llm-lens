import { Request, Response, NextFunction, RequestHandler } from "express";
import { IAuthProvider, UserContext } from "../interfaces/IAuthProvider";
import { AuthenticationError } from "../errors";

// Augment Express Request with userContext for authenticated routes
declare module "express-serve-static-core" {
  interface Request {
    userContext?: UserContext;
  }
}

export function createAuthMiddleware(authProvider: IAuthProvider): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      next(new AuthenticationError("Invalid API key"));
      return;
    }

    try {
      const userContext = await authProvider.authenticate(apiKey);
      req.userContext = userContext;
      next();
    } catch (err) {
      next(err instanceof Error ? err : new Error(String(err)));
    }
  };
}
