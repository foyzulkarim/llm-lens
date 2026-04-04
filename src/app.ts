import express, { Express } from "express";
import { PrismaClient } from "@prisma/client";
import { errorHandler } from "./middleware/errorHandler";
import { createAuthMiddleware } from "./middleware/authMiddleware";
import { PrismaApiKeyRepository } from "./auth/apiKeyRepository";
import { ApiKeyAuthProvider } from "./auth/apiKeyAuthProvider";
import { PrismaUsageRepository } from "./usage/usageRepository";
import { UsageSummaryService } from "./usage/usageSummaryService";
import { createUsageSummaryRouter } from "./usage/usageSummaryRouter";

export function createApp(prisma: PrismaClient): Express {
  const app = express();

  app.use(express.json());

  // Public routes — registered before auth middleware
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Auth middleware — protects all routes registered below
  const apiKeyRepo = new PrismaApiKeyRepository(prisma);
  const authProvider = new ApiKeyAuthProvider(apiKeyRepo);
  app.use(createAuthMiddleware(authProvider));

  // Protected routes
  const usageRepo = new PrismaUsageRepository(prisma);
  const summaryService = new UsageSummaryService(usageRepo);
  app.use("/api/usage", createUsageSummaryRouter(summaryService));

  app.use(errorHandler);

  return app;
}
