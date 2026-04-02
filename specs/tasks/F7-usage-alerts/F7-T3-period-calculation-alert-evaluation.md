# TASK: Period Calculation & Alert Evaluation Service

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F7 — Usage Alerts & Thresholds
> **Effort:** m
> **Priority:** medium
> **Depends on:** F7-T1-alert-rule-model-repository.md
> **Plan source:** specs/plans/PLAN-F7-usage-alerts.md

## Description

Implement the AlertService containing: (1) a pure `calculatePeriod` function that computes UTC date ranges for daily and monthly metrics, and (2) an `evaluateRule` method that takes an alert rule, queries usage data via IUsageRepo, and returns the evaluation result (currentUsage, remaining, percentageConsumed, alertTriggered, thresholdBreached). This is the core business logic of the alerts feature.

## Test Plan

### Test File(s)

- `src/services/__tests__/alertService.test.ts`

### Test Scenarios

#### calculatePeriod — daily metric

- **returns start and end of current UTC day** — GIVEN metric="daily" and a reference date of 2026-03-28T14:30:00Z WHEN calculatePeriod is called THEN start is 2026-03-28T00:00:00.000Z and end is 2026-03-28T23:59:59.999Z

#### calculatePeriod — monthly metric

- **returns start and end of current UTC month** — GIVEN metric="monthly" and a reference date of 2026-03-15T10:00:00Z WHEN calculatePeriod is called THEN start is 2026-03-01T00:00:00.000Z and end is 2026-03-31T23:59:59.999Z
- **handles February in a non-leap year** — GIVEN metric="monthly" and a reference date of 2027-02-10T00:00:00Z WHEN calculatePeriod is called THEN end is 2027-02-28T23:59:59.999Z

#### evaluateRule — under threshold

- **reports no alerts when usage is below alert percentage** — GIVEN a rule with tokenThreshold=10000 and alertPercentage=80 WHEN current usage is 5000 tokens THEN percentageConsumed=50.0, alertTriggered=false, thresholdBreached=false, remaining=5000

#### evaluateRule — at alert percentage

- **triggers alert at exact alert percentage** — GIVEN a rule with tokenThreshold=10000 and alertPercentage=80 WHEN current usage is 8000 tokens THEN percentageConsumed=80.0, alertTriggered=true, thresholdBreached=false, remaining=2000

#### evaluateRule — at exact threshold

- **breaches threshold at exact limit** — GIVEN a rule with tokenThreshold=10000 and alertPercentage=80 WHEN current usage is 10000 tokens THEN percentageConsumed=100.0, alertTriggered=true, thresholdBreached=true, remaining=0

#### evaluateRule — over threshold

- **shows percentage over 100 and clamps remaining to 0** — GIVEN a rule with tokenThreshold=10000 and alertPercentage=80 WHEN current usage is 12000 tokens THEN percentageConsumed=120.0, alertTriggered=true, thresholdBreached=true, remaining=0

#### evaluateRule — no usage data

- **returns zero usage when no logs exist for the period** — GIVEN a rule with tokenThreshold=10000 and alertPercentage=80 WHEN usage repo returns 0 for the period THEN percentageConsumed=0.0, alertTriggered=false, thresholdBreached=false, remaining=10000

#### evaluateRule — model scope

- **queries by model name for model-scoped rules** — GIVEN a rule with scope="model" and scopeValue="llama3" WHEN evaluateRule is called THEN IUsageRepo is queried with model="llama3" and the correct period range

## Implementation Notes

- **Layer(s):** Service
- **Pattern reference:** AlertService depends on IAlertRepo and IUsageRepo (injected via constructor)
- **Key decisions:**
  - `calculatePeriod(metric: string, referenceDate?: Date)` is a pure function (exported separately for direct unit testing). If no referenceDate is provided, defaults to `new Date()`.
  - `evaluateRule` calls `calculatePeriod` internally, then queries IUsageRepo for token sum within the period
  - IUsageRepo needs a method like `sumTokensByUserAndPeriod(userId, start, end)` and `sumTokensByModelAndPeriod(model, start, end)` — if these don't exist yet, add them to IUsageRepo and implement in PrismaUsageRepository
  - `remaining` is clamped: `Math.max(0, tokenThreshold - currentUsage)`
  - `percentageConsumed` is NOT capped at 100 — can exceed if over threshold
  - All tests for `evaluateRule` use mocked IUsageRepo (unit tests, not integration)
- **Libraries:** None new — pure TypeScript logic

## Scope Boundaries

- Do NOT add any HTTP routes or controllers (that belongs in T2/T4)
- Do NOT add the bulk evaluation method for the status endpoint (that is in T4)
- Focus on the pure period calculation and single-rule evaluation logic
- If IUsageRepo needs new methods, add them to the interface and provide the Prisma implementation

## Files Expected

**New files:**

- `src/services/AlertService.ts`
- `src/services/__tests__/alertService.test.ts`

**Modified files (if needed):**

- `src/interfaces/IUsageRepo.ts` — add `sumTokensByUserAndPeriod` and `sumTokensByModelAndPeriod` if not present
- `src/repositories/PrismaUsageRepository.ts` — implement the new methods if added

## TDD Sequence

1. Write test for `calculatePeriod` daily; RED
2. Implement `calculatePeriod` for daily metric; GREEN
3. Write tests for `calculatePeriod` monthly (standard + February); RED then GREEN
4. Write test for `evaluateRule` under threshold (mock IUsageRepo); RED
5. Implement `evaluateRule` with usage repo query and calculation; GREEN
6. Write test for at-alert-percentage case; GREEN (should pass with existing logic)
7. Write test for at-threshold case (remaining=0); RED or GREEN
8. Write test for over-threshold case (remaining clamped, percentage > 100); RED then GREEN
9. Write test for no-usage-data case; GREEN
10. Write test for model scope querying; RED then GREEN
11. REFACTOR — clean up, extract types for evaluation result
