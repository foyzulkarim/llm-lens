import express from "express";
import { PrismaClient } from "@prisma/client";
import { errorHandler } from "./middleware/errorHandler";
import { PrismaUsageRepository } from "./usage/usageRepository";
import { UsageSummaryService } from "./usage/usageSummaryService";
import { createUsageSummaryRouter } from "./usage/usageSummaryRouter";

const app = express();
const prisma = new PrismaClient();
const usageRepo = new PrismaUsageRepository(prisma);
const summaryService = new UsageSummaryService(usageRepo);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/usage", createUsageSummaryRouter(summaryService));

app.use(errorHandler);

export default app;
