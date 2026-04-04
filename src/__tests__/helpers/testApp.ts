import { Express } from "express";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app";

export function createTestApp(prisma: PrismaClient): Express {
  return createApp(prisma);
}
