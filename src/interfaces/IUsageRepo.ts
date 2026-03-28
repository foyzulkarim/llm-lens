import { UsageRecord } from "./IUsageLogger";

export interface UsageLogEntry extends UsageRecord {
  id: string;
  createdAt: Date;
}

export interface IUsageRepo {
  create(record: UsageRecord): Promise<UsageLogEntry>;
  findByUser(userId: string, from?: Date, to?: Date): Promise<UsageLogEntry[]>;
  findByModel(model: string, from?: Date, to?: Date): Promise<UsageLogEntry[]>;
  findAll(from?: Date, to?: Date): Promise<UsageLogEntry[]>;
}
