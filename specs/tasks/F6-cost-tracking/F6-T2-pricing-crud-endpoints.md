# TASK: Pricing CRUD Endpoints

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F6 — Cost Tracking & Reporting
> **Effort:** m
> **Priority:** medium
> **Depends on:** P3-E2-T1-model-pricing-schema-repository.md
> **Plan source:** specs/plans/PLAN-F6-cost-tracking.md

## Description

Implement the four pricing CRUD endpoints: POST /api/pricing, GET /api/pricing, PUT /api/pricing/:id, and DELETE /api/pricing/:id. Each endpoint validates input, delegates to IPricingRepo, and returns appropriate HTTP status codes and error responses. Validation enforces required fields, non-negative cost values, valid ISO 8601 dates, and max 3-character currency codes. Monetary values are returned as strings with 6 decimal places.

## Test Plan

### Test File(s)
- `src/__tests__/api/pricing/pricingRoutes.test.ts`

### Test Scenarios

#### POST /api/pricing
- **creates pricing and returns 201** — GIVEN a valid pricing body with modelName, costPerPromptToken, costPerCompletionToken, effectiveDate WHEN POST /api/pricing THEN responds 201 with the created entry including id and createdAt
- **returns 400 for missing required fields** — GIVEN a body missing modelName WHEN POST /api/pricing THEN responds 400 with code VALIDATION_ERROR
- **returns 400 for negative cost values** — GIVEN costPerPromptToken = -0.001 WHEN POST /api/pricing THEN responds 400 with code VALIDATION_ERROR
- **returns 409 for duplicate modelName + effectiveDate** — GIVEN pricing for "llama3" effective 2026-01-01 already exists WHEN POST /api/pricing with same combination THEN responds 409 with code CONFLICT
- **defaults currency to USD when omitted** — GIVEN a valid body without currency WHEN POST /api/pricing THEN the response has currency = "USD"

#### GET /api/pricing
- **returns all pricing entries** — GIVEN 2 pricing entries exist WHEN GET /api/pricing THEN responds 200 with an array of 2 entries
- **returns empty array when none exist** — GIVEN no pricing entries WHEN GET /api/pricing THEN responds 200 with []

#### PUT /api/pricing/:id
- **updates and returns the modified entry** — GIVEN a pricing entry with id "abc" WHEN PUT /api/pricing/abc with updated costPerPromptToken THEN responds 200 with the updated entry
- **returns 404 for unknown id** — GIVEN no pricing entry with id "unknown" WHEN PUT /api/pricing/unknown THEN responds 404 with code NOT_FOUND
- **returns 400 for invalid update data** — GIVEN a negative costPerCompletionToken WHEN PUT /api/pricing/:id THEN responds 400 with code VALIDATION_ERROR

#### DELETE /api/pricing/:id
- **deletes and returns 204** — GIVEN a pricing entry with id "abc" WHEN DELETE /api/pricing/abc THEN responds 204 with no body
- **returns 404 for unknown id** — GIVEN no pricing entry with id "unknown" WHEN DELETE /api/pricing/unknown THEN responds 404 with code NOT_FOUND

## Implementation Notes

- **Layer(s):** Routes (`src/pricing/pricingRoutes.ts`), Validation (`src/pricing/pricingValidation.ts`)
- **Pattern reference:** Follow Express router pattern from existing routes; use error middleware from T3 for error responses
- **Key decisions:**
  - Validation middleware runs before the route handler; rejects early with 400
  - Decimal fields (costPerPromptToken, costPerCompletionToken) are accepted as numbers or strings in the request body but always returned as strings with 6 decimal places (e.g., "0.000001")
  - currency field: optional, defaults to "USD", max 3 uppercase characters
  - effectiveDate must be a valid ISO 8601 string
  - ConflictError from repository maps to 409; NotFoundError maps to 404 (handled by existing error middleware)
- **Libraries:** express, existing error middleware

## Scope Boundaries

- Do NOT implement cost calculation or report endpoints (that is T3/T4)
- Do NOT add auth middleware gating (assumes auth is handled upstream per F2)
- Validation is request-level only; the repository enforces database-level constraints as a safety net

## Files Expected

**New files:**
- `src/pricing/pricingRoutes.ts` — Express router with POST, GET, PUT, DELETE
- `src/pricing/pricingValidation.ts` — validation functions for pricing input
- `src/__tests__/api/pricing/pricingRoutes.test.ts`

**Modified files:**
- `src/app.ts` — register pricing routes on /api/pricing

**Must NOT modify:**
- `prisma/schema.prisma` (already done in T1)
- `src/pricing/pricingRepository.ts` (already done in T1)

## TDD Sequence

1. Write API tests for POST /api/pricing (happy path) — implement route + validation
2. Write API tests for POST validation errors (missing fields, negative costs) — add validation rules
3. Write API tests for POST 409 conflict — wire ConflictError through error middleware
4. Write API tests for GET /api/pricing — implement list route
5. Write API tests for PUT /api/pricing/:id (happy + 404) — implement update route
6. Write API tests for DELETE /api/pricing/:id (happy + 404) — implement delete route

---
_Generated from: specs/plans/PLAN-F6-cost-tracking.md_
_Next step: "Implement task: specs/tasks/P3-E2-T2-pricing-crud-endpoints.md" using the TDD skill._
