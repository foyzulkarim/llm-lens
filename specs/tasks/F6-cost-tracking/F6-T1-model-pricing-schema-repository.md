# TASK: Prisma ModelPricing Schema & PricingRepository

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F6 — Cost Tracking & Reporting
> **Effort:** m
> **Priority:** medium
> **Depends on:** F1-T2-prisma-schema-seed.md, F1-T3-interfaces-errors-middleware.md, F1-T5-usage-repo-test-infra.md
> **Plan source:** specs/plans/PLAN-F6-cost-tracking.md

## Description

Add the ModelPricing Prisma model, run the migration, define the IPricingRepo interface, and implement PrismaPricingRepository. The ModelPricing table stores per-model token pricing with an effectiveDate so that historical pricing can be looked up at query time. The repository provides standard CRUD operations plus a specialised `findActivePricing(modelName, asOfDate)` method that returns the pricing entry whose effectiveDate is the most recent one on or before the given timestamp.

## Test Plan

### Test File(s)

- `src/__tests__/integration/pricing/pricingRepository.test.ts`

### Test Scenarios

#### PrismaPricingRepository — create()

- **creates a pricing entry with all fields** — GIVEN valid pricing data for model "llama3" WHEN create() is called THEN a row exists in ModelPricing with correct modelName, costPerPromptToken, costPerCompletionToken, currency, and effectiveDate
- **rejects duplicate modelName + effectiveDate** — GIVEN a pricing entry for "llama3" effective 2026-01-01 already exists WHEN create() is called with the same modelName and effectiveDate THEN a ConflictError is thrown

#### PrismaPricingRepository — findAll()

- **returns all pricing entries** — GIVEN 3 pricing entries for different models WHEN findAll() is called THEN all 3 entries are returned
- **returns empty array when no pricing exists** — GIVEN an empty ModelPricing table WHEN findAll() is called THEN returns []

#### PrismaPricingRepository — update()

- **updates an existing pricing entry** — GIVEN a pricing entry with id "abc" WHEN update("abc", { costPerPromptToken: 0.000005 }) is called THEN the entry reflects the new cost
- **throws NotFoundError for unknown id** — GIVEN no pricing entry with id "unknown" WHEN update("unknown", data) is called THEN a NotFoundError is thrown

#### PrismaPricingRepository — delete()

- **deletes an existing pricing entry** — GIVEN a pricing entry with id "abc" WHEN delete("abc") is called THEN the entry no longer exists in the table
- **throws NotFoundError for unknown id** — GIVEN no pricing entry with id "unknown" WHEN delete("unknown") is called THEN a NotFoundError is thrown

#### PrismaPricingRepository — findActivePricing()

- **returns the most recent pricing on or before the given date** — GIVEN pricing for "llama3" effective 2026-01-01 and 2026-03-01 WHEN findActivePricing("llama3", 2026-03-15) THEN the 2026-03-01 entry is returned
- **returns null when no pricing exists for the model** — GIVEN no pricing for "mistral" WHEN findActivePricing("mistral", 2026-03-15) THEN null is returned
- **returns null when all pricing entries are in the future** — GIVEN pricing for "llama3" effective 2026-06-01 WHEN findActivePricing("llama3", 2026-03-15) THEN null is returned

## Implementation Notes

- **Layer(s):** Schema (`prisma/schema.prisma`), Interface (`src/interfaces/IPricingRepo.ts`), Repository (`src/pricing/pricingRepository.ts`)
- **Pattern reference:** Follows the same IRepo + PrismaRepo pattern established in T5 for IUsageRepo
- **Key decisions:**
  - `costPerPromptToken` and `costPerCompletionToken` use Prisma `Decimal` type — values are handled as strings in TypeScript to avoid floating-point errors
  - Composite unique index on `[modelName, effectiveDate]`
  - `findActivePricing` uses `WHERE modelName = M AND effectiveDate <= T ORDER BY effectiveDate DESC LIMIT 1`
  - Wrap Prisma unique constraint errors into ConflictError; not-found into NotFoundError
- **Libraries:** @prisma/client (Decimal)

## Scope Boundaries

- Do NOT implement cost calculation logic (that is T3)
- Do NOT implement API endpoints (that is T2)
- Do NOT modify UsageLog schema or IUsageRepo
- The IPricingRepo interface is the contract; CostService will depend on it in T3

## Files Expected

**New files:**

- `src/interfaces/IPricingRepo.ts` — IPricingRepo interface
- `src/pricing/pricingRepository.ts` — PrismaPricingRepository implementing IPricingRepo
- `src/__tests__/integration/pricing/pricingRepository.test.ts`

**Modified files:**

- `prisma/schema.prisma` — add ModelPricing model with composite unique index

**Must NOT modify:**

- `src/interfaces/IUsageRepo.ts`
- `src/usage/usageRepository.ts`

## TDD Sequence

1. Add ModelPricing model to Prisma schema and run migration
2. Define IPricingRepo interface
3. Write integration tests for create() — implement create()
4. Write integration tests for findAll() — implement findAll()
5. Write integration tests for update() and delete() — implement both
6. Write integration tests for findActivePricing() — implement the pricing lookup query

---

_Generated from: specs/plans/PLAN-F6-cost-tracking.md_
_Next step: "Implement task: specs/tasks/F6-cost-tracking/F6-T1-model-pricing-schema-repository.md" using the TDD skill._
