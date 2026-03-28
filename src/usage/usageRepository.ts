import { PrismaClient } from "@prisma/client";
import { IUsageRepo, UsageLogEntry } from "../interfaces/IUsageRepo";
import { UsageRecord } from "../interfaces/IUsageLogger";

export class PrismaUsageRepository implements IUsageRepo {
  constructor(private prisma: PrismaClient) {}

  async create(record: UsageRecord): Promise<UsageLogEntry> {
    return this.prisma.usageLog.create({ data: record });
  }

  async findByUser(userId: string, from?: Date, to?: Date): Promise<UsageLogEntry[]> {
    return this.prisma.usageLog.findMany({
      where: {
        userId,
        ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
      },
    });
  }

  async findByModel(model: string, from?: Date, to?: Date): Promise<UsageLogEntry[]> {
    return this.prisma.usageLog.findMany({
      where: {
        model,
        ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
      },
    });
  }

  async findAll(from?: Date, to?: Date): Promise<UsageLogEntry[]> {
    return this.prisma.usageLog.findMany({
      where: {
        ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
      },
    });
  }
}
