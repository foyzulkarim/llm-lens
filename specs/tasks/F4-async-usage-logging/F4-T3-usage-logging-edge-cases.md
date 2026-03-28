# TASK: Usage Logging Defensive Edge Cases

> **Date:** 2026-03-28
> **Phase:** Phase 2 — Live Session
> **Epic:** F4 — Async Usage Logging
> **Effort:** s
> **Priority:** high
> **Depends on:** F4-T2-fire-and-forget-proxy-integration.md
> **Plan source:** specs/plans/PLAN-F4-async-usage-logging.md

## Description

Handle defensive edge cases in the usage logging path: missing user context (belt-and-suspenders guard even though auth middleware should always set it), zero token counts from Ollama, and concurrent request safety. These guards ensure the logging path is robust without adding complexity beyond what the plan specifies.

## Test Plan

### Test File(s)
- `src/__tests__/unit/proxy/chatHandler.usageLogging.edge.test.ts`

### Test Scenarios

#### Missing User Context

- **skips logging when req.user is undefined** — GIVEN req.user is undefined (auth middleware somehow bypassed) WHEN the handler runs after a successful proxy response THEN usageLogger.log() is NOT called
- **logs warning when user context is missing** — GIVEN req.user is undefined WHEN the handler runs after a successful proxy response THEN console.warn is called with a message indicating missing user context
- **still sends the proxy response when user context is missing** — GIVEN req.user is undefined WHEN the handler runs THEN res.json() is still called with the proxy response (logging skip does not break the response)

#### Zero and Edge-Case Token Values

- **logs zero token counts as-is** — GIVEN Ollama returns promptTokens=0, completionTokens=0, totalTokens=0 WHEN the handler runs THEN usageLogger.log() is called with all zeros (not skipped or treated as error)
- **logs large token counts without truncation** — GIVEN Ollama returns promptTokens=100000, completionTokens=50000, totalTokens=150000 WHEN the handler runs THEN usageLogger.log() receives the exact values

#### Concurrent Request Safety

- **concurrent requests produce independent log entries** — GIVEN two simultaneous requests from the same user WHEN both handlers complete THEN usageLogger.log() is called twice with independent records (no shared state between calls)

## Implementation Notes

- **Layer(s):** Controller/handler (`src/proxy/`)
- **Pattern reference:** Edge case table from plan document
- **Key decisions:**
  - Missing user context: skip logging + console.warn (not an error — auth middleware should prevent this)
  - Zero tokens: log as-is, no validation (valid data per plan)
  - No deduplication for concurrent requests — each request is independent
  - These are defensive checks, not business logic — keep them minimal
- **Libraries:** None beyond existing dependencies

## Scope Boundaries

- Do NOT add token validation or rejection of zero/negative values
- Do NOT add request deduplication
- Do NOT add retry logic
- Do NOT modify UsageLoggerService behavior
- Keep defensive checks minimal — guard clauses, not elaborate validation

## Files Expected

**New files:**
- `src/__tests__/unit/proxy/chatHandler.usageLogging.edge.test.ts`

**Modified files:**
- `src/proxy/chatHandler.ts` (or equivalent) — add guard clause for missing user context

**Must NOT modify:**
- `src/usage/usageLoggerService.ts`
- `src/usage/usageRepository.ts`

## TDD Sequence

1. Write test: skips logging when req.user is undefined → add guard clause in handler
2. Write test: logs warning when user context is missing → add console.warn in guard
3. Write test: still sends proxy response when user missing → verify guard doesn't break response
4. Write test: logs zero token counts as-is → verify no validation rejects zeros
5. Write test: concurrent requests produce independent logs → verify no shared mutable state

---
_Generated from: specs/plans/PLAN-F4-async-usage-logging.md_
_Next step: "Implement task: specs/tasks/F4-async-usage-logging/F4-T3-usage-logging-edge-cases.md" using the TDD skill._
