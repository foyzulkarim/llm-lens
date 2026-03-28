# Plan: Async Usage Logging (F4)

> **Date:** 2026-03-28
> **Project source:** specs/plans/PROJECT-ollama-usage-intelligence-api.md
> **Estimated tasks:** 4
> **Planning session:** detailed

## Summary

Implement fire-and-forget usage logging that captures metadata from every proxied chat request (model, tokens, latency, user, timestamp) and writes it to the UsageLog table asynchronously. The client receives their Ollama response immediately; the log write happens in the background. Failed log writes are caught and logged to console — they never affect the client response.

## Requirements

### Functional Requirements
1. After a successful proxy response, a UsageLog record is written to the database
2. The log record contains: userId (from auth context), model, promptTokens, completionTokens, totalTokens, latencyMs, and auto-generated timestamp
3. The logging happens asynchronously — the client response is NOT delayed by the log write
4. A failed log write does not affect the proxy response (fire-and-forget)
5. Each proxied request produces exactly one log entry
6. Failed log writes are reported to console.error with the original error

### Non-Functional Requirements
1. Logging overhead on the response path must be zero (truly non-blocking)
2. Under normal conditions, the log write should complete within 100ms (local SQLite)
3. The logging mechanism must handle concurrent requests without data corruption

## Detailed Specifications

### UsageLoggerService (implements IUsageLogger)

```typescript
class UsageLoggerService implements IUsageLogger {
  constructor(private usageRepo: IUsageRepo) {}

  async log(record: UsageRecord): Promise<void> {
    await this.usageRepo.create(record);
  }
}
```

The service itself is simple — the async/fire-and-forget behavior lives in the **caller** (the proxy handler), not in the logger.

### Integration into Proxy Handler

```typescript
// In the proxy controller, after sending response:
async function chatHandler(req, res) {
  const result = await proxyService.forwardChat(chatRequest);

  // Send response immediately
  res.json(formatResponse(result));

  // Fire-and-forget: log usage in background
  usageLogger.log({
    userId: req.user.userId,
    model: result.model,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    totalTokens: result.usage.totalTokens,
    latencyMs: result.latencyMs,
  }).catch(err => {
    console.error('Failed to log usage:', err);
  });
}
```

Key pattern: `res.json()` is called BEFORE the log write. The `.catch()` on the promise prevents unhandled rejection without blocking the response.

### UsageRecord Shape

```typescript
interface UsageRecord {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}
```

The `createdAt` timestamp is set by Prisma's `@default(now())`, not by the caller.

### Verification Approach

Since logging is async, tests need to wait for the log write to complete before asserting. Strategies:
- **Unit tests:** Mock IUsageRepo; verify `.create()` was called with correct args
- **Integration tests:** After the API call, poll/wait briefly then query the database
- **API tests:** Use `await new Promise(r => setTimeout(r, 100))` after the request, then check the DB

## Edge Cases & Failure Modes

| Scenario | Decision | Rationale |
|----------|----------|-----------|
| Database is full / write fails | Log to console.error, don't retry | Fire-and-forget; retries add complexity without value for workshop scope |
| Ollama returns 0 for token counts | Log as-is (zeros) | Valid data; downstream features handle zero-token entries |
| User context missing (shouldn't happen — auth middleware) | Defensive check; skip logging, log warning | Belt-and-suspenders; auth middleware should always set user |
| Concurrent requests from same user | Each produces independent log entry | No deduplication needed; each request is unique |
| Proxy request fails (Ollama error) | Do NOT log usage | Only successful proxy requests should produce usage logs; failed requests didn't consume tokens |
| Log write is extremely slow (SQLite lock) | No timeout; it completes eventually | Local SQLite shouldn't be slow; if it is, the log just arrives late |
| Server shuts down while log write is in flight | Log may be lost | Acceptable for workshop scope; production would need graceful shutdown |

## Decisions Log

| # | Decision | Alternatives Considered | Chosen Because |
|---|----------|------------------------|----------------|
| 1 | Fire-and-forget (not blocking) | Sync logging, message queue | Client latency is sacred; log loss is acceptable |
| 2 | `.catch()` on the log promise (not try/catch) | try/catch block, global unhandled rejection handler | Explicit per-call error handling; clear intent |
| 3 | Log only successful proxy requests | Log all requests including failures | Failed requests didn't consume Ollama resources; logging them would skew usage data |
| 4 | Timestamp set by database, not by application | Application-level timestamp | Simpler; no clock skew between app and DB; consistent with Prisma convention |
| 5 | No retry on failure | Retry with backoff | Workshop scope; complexity not justified; fire-and-forget is the teaching point |

## Scope Boundaries

### In Scope
- UsageLoggerService implementing IUsageLogger
- Integration of fire-and-forget logging into the proxy handler
- Unit tests for UsageLoggerService (mocked IUsageRepo)
- Unit tests for the fire-and-forget pattern (verify response sent before log write)
- Integration tests verifying log entries appear in the database after proxy requests
- API test: make proxy request, verify UsageLog row created

### Out of Scope
- Log aggregation or analytics (F6, F7)
- Retry logic for failed writes
- Batch/buffered writes
- Logging of failed proxy requests

## Dependencies

### Depends On
- F1 — IUsageLogger interface, IUsageRepo, PrismaUsageRepository, UsageLog model
- F3 — Proxy handler where logging is integrated

### Depended On By
- F6 (Cost Tracking) — reads from UsageLog table populated by this feature
- F7 (Usage Alerts) — reads from UsageLog table populated by this feature

## Architecture Notes

The fire-and-forget pattern is intentionally simple: call the async function, attach a `.catch()`, don't `await` it in the response path. This is the design question for the live session — students discuss sync vs async and the trade-offs.

The separation of concerns is clean: ProxyService handles the Ollama call and returns metadata including latency. The controller sends the response and fires the log. UsageLoggerService does the write. Each piece is independently testable.

---
_This plan is the input for the Feature Planning skill._
_Review this document, then run: "Generate task from plan: specs/plans/PLAN-F4-async-usage-logging.md"_
