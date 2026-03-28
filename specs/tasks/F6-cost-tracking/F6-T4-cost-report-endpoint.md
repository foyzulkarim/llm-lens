# TASK: Cost Report Endpoint

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F6 — Cost Tracking & Reporting
> **Effort:** m
> **Priority:** medium
> **Depends on:** P3-E2-T3-cost-calculation-service.md, P3-E2-T2-pricing-crud-endpoints.md
> **Plan source:** specs/plans/PLAN-F6-cost-tracking.md

## Description

Implement the GET /api/reports/costs endpoint that exposes the CostService's calculateCosts() method over HTTP. The endpoint accepts optional query parameters (dateFrom, dateTo, model, userId) and returns a structured JSON cost report with totalCost, currency, period, breakdowns by model and user, and an unpriced models list. Query parameter validation enforces valid ISO 8601 dates and applies sensible defaults (dateFrom = 30 days ago, dateTo = now).

## Test Plan

### Test File(s)
- `src/__tests__/api/reports/costReport.test.ts`

### Test Scenarios

#### GET /api/reports/costs
- **returns a full cost report with all breakdowns** — GIVEN usage logs and pricing data exist WHEN GET /api/reports/costs?dateFrom=2026-03-01&dateTo=2026-03-28 THEN responds 200 with totalCost, currency, period, byModel array, byUser array, and unpriced array
- **filters by model** — GIVEN usage logs for "llama3" and "mistral" WHEN GET /api/reports/costs?model=llama3 THEN the report only includes costs for "llama3"
- **filters by userId** — GIVEN usage logs from "user-1" and "user-2" WHEN GET /api/reports/costs?userId=user-1 THEN the report only includes costs for "user-1"
- **applies default date range when no dates provided** — GIVEN usage logs spanning several months WHEN GET /api/reports/costs (no dateFrom/dateTo) THEN the response period.from is approximately 30 days ago and period.to is approximately now
- **returns empty report for no matching data** — GIVEN no usage logs in the specified range WHEN GET /api/reports/costs?dateFrom=2020-01-01&dateTo=2020-01-31 THEN responds 200 with totalCost "0.000000", empty byModel, byUser, and unpriced arrays
- **returns 400 for invalid date format** — GIVEN dateFrom="not-a-date" WHEN GET /api/reports/costs?dateFrom=not-a-date THEN responds 400 with code VALIDATION_ERROR
- **includes unpriced models in report** — GIVEN usage logs for "codellama" with no pricing configured WHEN GET /api/reports/costs THEN the unpriced array contains an entry for "codellama" with reason "no pricing configured"

## Implementation Notes

- **Layer(s):** Routes (`src/reports/reportRoutes.ts`), Validation (`src/reports/reportValidation.ts`)
- **Pattern reference:** Follow the same Express router + validation middleware pattern used in pricing CRUD endpoints (T2)
- **Key decisions:**
  - Query parameters are strings; validation parses and coerces dateFrom/dateTo to Date objects
  - dateFrom defaults to 30 days ago; dateTo defaults to current timestamp
  - model and userId are optional pass-through filters to CostService
  - The endpoint delegates entirely to CostService.calculateCosts() — no business logic in the route handler
  - Response shape matches the plan specification: { totalCost, currency, period: { from, to }, byModel, byUser, unpriced }
  - All monetary values in response are strings with 6 decimal places
- **Libraries:** express, existing error middleware, CostService

## Scope Boundaries

- Do NOT add pagination to the report (out of scope per plan)
- Do NOT add CSV or PDF export
- Do NOT add cost comparison or forecasting features
- The route handler is thin — it validates input, calls CostService, and returns the result

## Files Expected

**New files:**
- `src/reports/reportRoutes.ts` — Express router with GET /api/reports/costs
- `src/reports/reportValidation.ts` — query parameter validation for date filters
- `src/__tests__/api/reports/costReport.test.ts`

**Modified files:**
- `src/app.ts` — register report routes on /api/reports

**Must NOT modify:**
- `src/pricing/costService.ts` (already done in T3)
- `src/pricing/pricingRoutes.ts` (already done in T2)

## TDD Sequence

1. Write API test for full cost report (happy path) — implement route, wire CostService
2. Write API test for model filter — pass query param through to service
3. Write API test for userId filter — pass query param through to service
4. Write API test for default date range — implement date defaulting logic
5. Write API test for empty results — verify 200 with zero-cost structure
6. Write API test for invalid date format — implement validation middleware
7. Write API test for unpriced models — verify end-to-end with missing pricing

---
_Generated from: specs/plans/PLAN-F6-cost-tracking.md_
_Next step: "Implement task: specs/tasks/P3-E2-T4-cost-report-endpoint.md" using the TDD skill._
