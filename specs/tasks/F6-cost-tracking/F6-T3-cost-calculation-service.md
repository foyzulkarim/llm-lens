# TASK: Cost Calculation Service

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F6 — Cost Tracking & Reporting
> **Effort:** l
> **Priority:** medium
> **Depends on:** P3-E2-T1-model-pricing-schema-repository.md, P1-E1-T5-usage-repo-test-infra.md
> **Plan source:** specs/plans/PLAN-F6-cost-tracking.md

## Description

Implement CostService, the core business logic for cost tracking. The service depends on IPricingRepo and IUsageRepo. Given a date range and optional filters (model, userId), it fetches usage logs, looks up the active pricing for each log entry based on its timestamp, calculates per-entry costs using decimal arithmetic, and aggregates results into a structured report with breakdowns by model and by user. Models with usage but no active pricing are reported separately in an "unpriced" array. All monetary values use 6 decimal places.

## Test Plan

### Test File(s)
- `src/__tests__/unit/pricing/costService.test.ts`

### Test Scenarios

#### CostService — calculateCosts()
- **calculates cost for a single usage entry with active pricing** — GIVEN 1 usage log for "llama3" (100 prompt tokens, 50 completion tokens) and pricing (costPerPromptToken=0.000001, costPerCompletionToken=0.000002) WHEN calculateCosts() is called THEN totalCost = "0.000200", byModel has 1 entry with correct promptCost and completionCost
- **applies date-based pricing (uses pricing active at time of request)** — GIVEN pricing for "llama3" at 0.000001 effective 2026-01-01 and 0.000005 effective 2026-03-01, and a usage log timestamped 2026-03-15 WHEN calculateCosts() is called THEN the 0.000005 pricing is used for calculation
- **handles pricing change mid-period** — GIVEN pricing for "llama3" changing on 2026-03-01 and two usage logs (one on 2026-02-15, one on 2026-03-15) WHEN calculateCosts() for 2026-02-01 to 2026-03-31 THEN each log uses the pricing active at its own timestamp
- **reports models with no pricing in unpriced array** — GIVEN usage logs for "codellama" but no pricing entries for "codellama" WHEN calculateCosts() is called THEN totalCost = "0.000000" and unpriced contains { model: "codellama", requestCount, totalTokens, reason: "no pricing configured" }
- **returns zero-cost report when no usage logs match filters** — GIVEN no usage logs in the date range WHEN calculateCosts() is called THEN totalCost = "0.000000", byModel = [], byUser = [], unpriced = []
- **aggregates costs by model across multiple entries** — GIVEN 3 usage logs for "llama3" and 2 for "mistral" with pricing for both WHEN calculateCosts() is called THEN byModel has 2 entries with correct aggregated totals, requestCount, and totalTokens
- **aggregates costs by user** — GIVEN usage logs from "user-1" (2 entries) and "user-2" (1 entry) WHEN calculateCosts() is called THEN byUser has 2 entries with correct per-user totalCost and requestCount
- **handles zero-cost pricing (costPerPromptToken = 0)** — GIVEN pricing with costPerPromptToken = 0 and costPerCompletionToken = 0.000002 WHEN calculateCosts() is called THEN promptCost = "0.000000" and only completion tokens contribute to totalCost

## Implementation Notes

- **Layer(s):** Service (`src/pricing/costService.ts`)
- **Pattern reference:** Service depends on repository interfaces; unit tests mock both IPricingRepo and IUsageRepo
- **Key decisions:**
  - Joins happen in the service layer, not via SQL join — the service fetches usage logs, then for each unique (model, timestamp) pair calls findActivePricing on IPricingRepo
  - Use a JS library for decimal arithmetic (e.g., `decimal.js` or Prisma's built-in Decimal) to avoid floating-point errors
  - All monetary values formatted to 6 decimal places as strings in the output
  - Default date range: dateFrom = 30 days ago, dateTo = now (when not provided)
  - The service groups usage logs by model and by user for the breakdown arrays
  - Optimisation: batch pricing lookups per unique model rather than per log entry (collect distinct models, fetch pricing for each once per relevant date)
- **Libraries:** decimal.js (or Prisma Decimal), existing interfaces

## Scope Boundaries

- Do NOT implement the HTTP endpoint (that is T4)
- Do NOT modify IPricingRepo or IUsageRepo interfaces
- Do NOT persist calculated costs — all computation is query-time
- Do NOT implement budgets, alerts, or export functionality

## Files Expected

**New files:**
- `src/pricing/costService.ts` — CostService class with calculateCosts() method
- `src/pricing/types.ts` — TypeScript types for CostReport, ModelCostBreakdown, UserCostBreakdown, UnpricedModel
- `src/__tests__/unit/pricing/costService.test.ts`

**Modified files:** None

**Must NOT modify:**
- `src/interfaces/IPricingRepo.ts`
- `src/interfaces/IUsageRepo.ts`
- `src/pricing/pricingRepository.ts`

## TDD Sequence

1. Define CostReport, ModelCostBreakdown, UserCostBreakdown, UnpricedModel types
2. Write test for single-entry cost calculation — implement basic calculateCosts()
3. Write test for date-based pricing lookup — implement pricing selection logic
4. Write test for mid-period pricing change — verify per-entry pricing resolution
5. Write test for unpriced models — implement the unpriced detection path
6. Write test for empty results — handle the zero-usage case
7. Write tests for aggregation (by model, by user) — implement grouping logic
8. Write test for zero-cost pricing — verify edge case arithmetic

---
_Generated from: specs/plans/PLAN-F6-cost-tracking.md_
_Next step: "Implement task: specs/tasks/P3-E2-T3-cost-calculation-service.md" using the TDD skill._
