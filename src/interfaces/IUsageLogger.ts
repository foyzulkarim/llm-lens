export interface UsageRecord {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

export interface IUsageLogger {
  log(record: UsageRecord): void;
}
