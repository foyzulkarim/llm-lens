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
        ...buildDateFilter(from, to),
      },
    });
  }

  async findByModel(model: string, from?: Date, to?: Date): Promise<UsageLogEntry[]> {
    return this.prisma.usageLog.findMany({
      where: {
        model,
        ...buildDateFilter(from, to),
      },
    });
  }

  async findAll(from?: Date, to?: Date): Promise<UsageLogEntry[]> {
    return this.prisma.usageLog.findMany({
      where: {
        ...buildDateFilter(from, to),
      },
    });
  }
}

function buildDateFilter(from?: Date, to?: Date): { createdAt?: { gte?: Date; lte?: Date } } {
  const filter: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (from !== undefined) {
    filter.createdAt = { gte: from };
  }
  if (to !== undefined) {
    filter.createdAt = { ...filter.createdAt, lte: to };
  }
  return filter;
}
