import { IUsageRepo } from "../interfaces/IUsageRepo";

export interface UsageSummary {
  totalRequests: number;
  totalTokens: number;
  avgLatencyMs: number;
}

export class UsageSummaryService {
  constructor(private usageRepo: IUsageRepo) {}

  async getSummary(userId?: string, model?: string): Promise<UsageSummary> {
    let logs = userId ? await this.usageRepo.findByUser(userId) : await this.usageRepo.findAll();

    if (model) {
      logs = logs.filter((l) => l.model === model);
    }

    if (logs.length === 0) {
      return { totalRequests: 0, totalTokens: 0, avgLatencyMs: 0 };
    }

    const totalRequests = logs.length;
    const totalTokens = logs.reduce((sum, l) => sum + l.totalTokens, 0);
    const avgLatencyMs = logs.reduce((sum, l) => sum + l.latencyMs, 0) / totalRequests;

    return { totalRequests, totalTokens, avgLatencyMs };
  }
}
