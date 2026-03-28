# Plan: Cost Tracking & Reporting (F6)

> **Date:** 2026-03-28
> **Project source:** specs/plans/PROJECT-ollama-usage-intelligence-api.md
> **Estimated tasks:** 5
> **Planning session:** detailed

## Summary

Administrators configure per-model token pricing (simulating what it would cost on a paid API). The system calculates costs by joining usage logs with pricing configurations, applying the pricing that was active at the time of each request. This lets teams understand the economic value of their local Ollama usage.

## Requirements

### Functional Requirements
1. `POST /api/pricing` — Set pricing for a model (costPerPromptToken, costPerCompletionToken, currency, effectiveDate)
2. `GET /api/pricing` — List all pricing configurations
3. `PUT /api/pricing/:id` — Update a pricing entry
4. `DELETE /api/pricing/:id` — Remove a pricing entry
5. `GET /api/reports/costs` — Calculate costs from usage logs + pricing. Filters: dateFrom, dateTo, model, userId. Returns: totalCost, breakdown by model, breakdown by user
6. Cost calculation uses the pricing that was active at the time of each usage log entry (date-based pricing)
7. If a model has no pricing configured, its usage appears in reports with cost = 0 and a flag indicating "no pricing"
8. Multiple pricing entries per model are allowed (with different effectiveDates) to model price changes over time

### Non-Functional Requirements
1. Cost calculations use decimal arithmetic (not floating point) to avoid rounding errors
2. All monetary values are returned with 6 decimal places (token-level pricing is sub-cent)
3. Reports query should handle 10,000+ usage log entries without timeout

## Detailed Specifications

### Prisma Model: ModelPricing

| Field | Type | Constraints |
|-------|------|------------|
| id | String | @id @default(uuid()) |
| modelName | String | |
| costPerPromptToken | Decimal | |
| costPerCompletionToken | Decimal | |
| currency | String | @default("USD") |
| effectiveDate | DateTime | |
| createdAt | DateTime | @default(now()) |

**Index:** `[modelName, effectiveDate]` for efficient pricing lookup.

**Uniqueness:** Composite unique on `[modelName, effectiveDate]` — one pricing per model per effective date.

### Pricing Lookup Logic

For a given usage log entry (model M, timestamp T):
1. Find all ModelPricing entries where `modelName = M` and `effectiveDate <= T`
2. Select the one with the latest (most recent) `effectiveDate`
3. This is the "active pricing at time of request"

If no pricing entry exists for that model (or all entries have effectiveDate > T), cost = 0.

### Cost Calculation

For a single usage log entry:
```
promptCost = promptTokens * activePricing.costPerPromptToken
completionCost = completionTokens * activePricing.costPerCompletionToken
totalCost = promptCost + completionCost
```

### Endpoints

**POST /api/pricing**
```json
// Request
{ "modelName": "llama3", "costPerPromptToken": 0.000001, "costPerCompletionToken": 0.000002, "currency": "USD", "effectiveDate": "2026-01-01T00:00:00Z" }
// Response 201
{ "id": "...", "modelName": "llama3", "costPerPromptToken": "0.000001", "costPerCompletionToken": "0.000002", "currency": "USD", "effectiveDate": "2026-01-01T00:00:00Z", "createdAt": "..." }
```

**GET /api/reports/costs?dateFrom=2026-03-01&dateTo=2026-03-28&model=llama3&userId=user-1**
```json
// Response 200
{
  "totalCost": "0.045230",
  "currency": "USD",
  "period": { "from": "2026-03-01T00:00:00Z", "to": "2026-03-28T00:00:00Z" },
  "byModel": [
    { "model": "llama3", "totalCost": "0.045230", "promptCost": "0.015120", "completionCost": "0.030110", "requestCount": 42, "totalTokens": 18500 }
  ],
  "byUser": [
    { "userId": "user-1", "userName": "Alice", "totalCost": "0.045230", "requestCount": 42 }
  ],
  "unpriced": []
}
```

**When a model has no pricing:**
```json
{
  "unpriced": [
    { "model": "codellama", "requestCount": 15, "totalTokens": 6200, "reason": "no pricing configured" }
  ]
}
```

**Validation Rules:**

| Field | Rule |
|-------|------|
| modelName | Required, non-empty string |
| costPerPromptToken | Required, >= 0, decimal |
| costPerCompletionToken | Required, >= 0, decimal |
| currency | Optional, defaults to "USD", max 3 chars |
| effectiveDate | Required, valid ISO 8601 date |
| dateFrom/dateTo (report) | Optional, valid ISO dates; dateTo defaults to now, dateFrom defaults to 30 days ago |

**Error Scenarios:**

| Condition | Status | Code |
|-----------|--------|------|
| Missing required fields | 400 | VALIDATION_ERROR |
| Negative cost values | 400 | VALIDATION_ERROR |
| Duplicate model+effectiveDate | 409 | CONFLICT |
| Pricing entry not found (PUT/DELETE) | 404 | NOT_FOUND |
| Invalid date format | 400 | VALIDATION_ERROR |

## Edge Cases & Failure Modes

| Scenario | Decision | Rationale |
|----------|----------|-----------|
| Pricing changes mid-period in report | Each log entry uses pricing active at its timestamp | Accurate historical cost; the design question resolved per project plan |
| Usage log exists before any pricing effectiveDate | Cost = 0; appears in "unpriced" | No retroactive pricing assumption |
| Model has pricing but 0 usage in period | Does not appear in byModel breakdown | Only report what has data |
| All filters result in 0 usage logs | Return totalCost: "0.000000", empty arrays | Valid empty result |
| costPerPromptToken = 0 (free prompt pricing) | Valid; only completion tokens have cost | Some pricing models charge only for output |
| Very large number of usage logs (10,000+) | Query-time aggregation; no pre-computation | Acceptable for SQLite with proper indexes; workshop scope |
| effectiveDate in the future | Allowed; pricing becomes active when that date arrives | Supports advance pricing configuration |
| Delete a pricing entry that was used for historical calculations | Historical reports change (recalculated on query) | No snapshot/ledger; query-time calculation is simpler |

## Decisions Log

| # | Decision | Alternatives Considered | Chosen Because |
|---|----------|------------------------|----------------|
| 1 | Pricing active at time of request (not current pricing) | Always use current pricing | More realistic business logic; better TDD scenarios; resolved from project plan open question |
| 2 | Decimal type for costs (not float) | Float, integer cents | Avoids floating-point rounding; Prisma Decimal maps to string in JS |
| 3 | Query-time aggregation (not pre-computed) | Pre-aggregate on write, materialized view | Simpler; always accurate; workshop-scale data fits in memory |
| 4 | 6 decimal places for costs | 2 (cents), 4, 8 | Token pricing is sub-cent; 6 decimals balances precision with readability |
| 5 | Return "unpriced" models separately | Omit them, assume 0 cost silently | Transparency; user knows which models lack pricing config |
| 6 | Default date range: last 30 days | Require explicit dates, all-time default | Sensible default; prevents accidentally querying all history |

## Scope Boundaries

### In Scope
- ModelPricing Prisma model and migration
- IPricingRepo interface and PrismaPricingRepository
- CostService with pricing lookup and cost calculation logic
- All 5 endpoints (pricing CRUD + cost report)
- Unit tests for CostService (mocked repos — pricing lookup logic, aggregation, edge cases)
- Integration tests for PrismaPricingRepository
- API tests for all endpoints

### Out of Scope
- Cost budgets or spending limits (reason: that's the alerts feature's domain)
- Cost export (CSV, PDF)
- Cost comparison between models
- Cost forecasting / projection

## Dependencies

### Depends On
- F1 — IUsageRepo, Express app, error classes, test infrastructure
- F2 — Auth middleware
- F4 — UsageLog data must exist in the table (seed data covers this for development)

### Depended On By
- None (leaf feature)

## Architecture Notes

The CostService depends on two repository interfaces: IPricingRepo (for pricing CRUD) and IUsageRepo (for reading usage logs). The cost calculation joins data from both sources in the service layer (not via SQL join) — this keeps repositories focused and testable.

Pricing lookup (find active pricing for a model at a given timestamp) is a key piece of logic that deserves thorough unit testing with various date scenarios.

---
_This plan is the input for the Feature Planning skill._
_Review this document, then run: "Generate task from plan: specs/plans/PLAN-F6-cost-tracking.md"_
