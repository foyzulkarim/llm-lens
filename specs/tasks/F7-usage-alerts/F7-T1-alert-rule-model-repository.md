# TASK: Prisma AlertRule Model & AlertRepository

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F7 — Usage Alerts & Thresholds
> **Effort:** s
> **Priority:** medium
> **Depends on:** F1-T2-prisma-schema-seed.md, F1-T3-interfaces-errors-middleware.md
> **Plan source:** specs/plans/PLAN-F7-usage-alerts.md

## Description

Add the `AlertRule` Prisma model and implement the `IAlertRepo` interface with a `PrismaAlertRepository`. The model stores user-defined alert rules with scope (user/model), metric (daily/monthly), token threshold, alert percentage, and active status. The repository provides CRUD operations plus a method to fetch all active rules for a given user.

## Test Plan

### Test File(s)

- `src/repositories/__tests__/alertRepository.integration.test.ts`

### Test Scenarios

#### PrismaAlertRepository — create

- **creates an alert rule** — GIVEN valid alert rule data WHEN `create()` is called THEN a new AlertRule is persisted with all fields and defaults (isActive=true, timestamps populated)

#### PrismaAlertRepository — findById

- **returns rule by id** — GIVEN an existing alert rule WHEN `findById(id)` is called THEN the full AlertRule object is returned
- **returns null for non-existent id** — GIVEN no rule with the given id WHEN `findById(id)` is called THEN null is returned

#### PrismaAlertRepository — findAllByUserId

- **returns all rules for user** — GIVEN three rules belonging to user-1 and one to user-2 WHEN `findAllByUserId("user-1")` is called THEN exactly three rules are returned
- **returns empty array for user with no rules** — GIVEN no rules for user-3 WHEN `findAllByUserId("user-3")` is called THEN an empty array is returned

#### PrismaAlertRepository — findActiveByUserId

- **returns only active rules** — GIVEN two active and one inactive rule for user-1 WHEN `findActiveByUserId("user-1")` is called THEN exactly two rules are returned and all have isActive=true

#### PrismaAlertRepository — update

- **updates specified fields** — GIVEN an existing rule WHEN `update(id, { tokenThreshold: 5000, isActive: false })` is called THEN the returned rule reflects updated values and updatedAt has changed

#### PrismaAlertRepository — delete

- **deletes the rule** — GIVEN an existing rule WHEN `delete(id)` is called THEN `findById(id)` returns null

## Implementation Notes

- **Layer(s):** Prisma schema, repository
- **Pattern reference:** Follow the same IRepo + PrismaRepo pattern established by IUsageRepo in F1
- **Key decisions:**
  - `alertPercentage` stored as `Decimal` in Prisma (maps to `@db.Decimal(5,2)`)
  - `scope` and `metric` are plain strings (not Prisma enums) for simplicity — validation happens at the service/controller layer
  - `findActiveByUserId` filters with `{ userId, isActive: true }` — this is the method used by the status endpoint
- **Libraries:** @prisma/client (existing)

## Scope Boundaries

- Do NOT add validation logic (that belongs in T2/T3)
- Do NOT add alert evaluation or period calculation (that belongs in T3)
- Do NOT add any route or controller code (that belongs in T2/T4)
- Do add the Prisma migration for the AlertRule model

## Files Expected

**New files:**

- `prisma/migrations/<timestamp>_add_alert_rule/migration.sql` (generated)
- `src/interfaces/IAlertRepo.ts`
- `src/repositories/PrismaAlertRepository.ts`
- `src/repositories/__tests__/alertRepository.integration.test.ts`

**Modified files:**

- `prisma/schema.prisma` — add AlertRule model

## TDD Sequence

1. Write `IAlertRepo` interface with method signatures
2. Write integration test for `create()`; RED
3. Add AlertRule to Prisma schema, run migration, implement `create()`; GREEN
4. Write tests for `findById` (found + not found); RED then GREEN
5. Write tests for `findAllByUserId` (with results + empty); RED then GREEN
6. Write test for `findActiveByUserId`; RED then GREEN
7. Write test for `update`; RED then GREEN
8. Write test for `delete`; RED then GREEN
