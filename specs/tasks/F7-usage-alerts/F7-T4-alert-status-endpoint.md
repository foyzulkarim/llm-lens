# TASK: Alert Status Endpoint (GET /api/alerts/status)

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F7 — Usage Alerts & Thresholds
> **Effort:** s
> **Priority:** medium
> **Depends on:** F7-T2-alert-rule-crud-endpoints.md, F7-T3-period-calculation-alert-evaluation.md
> **Plan source:** specs/plans/PLAN-F7-usage-alerts.md

## Description

Implement the GET /api/alerts/status endpoint. This endpoint fetches all active alert rules for the authenticated user, evaluates each one using the AlertService, and returns a response containing the evaluation timestamp and an array of rule status objects. Inactive rules are excluded from the response.

## Test Plan

### Test File(s)
- `src/routes/__tests__/alerts.status.test.ts`

### Test Scenarios

#### GET /api/alerts/status — evaluation
- **returns evaluated status for all active rules** — GIVEN two active rules (one daily/user-scope, one monthly/model-scope) with known usage data WHEN GET /api/alerts/status is called THEN 200 is returned with evaluatedAt timestamp and a rules array of length 2, each containing currentUsage, remaining, percentageConsumed, alertTriggered, and thresholdBreached
- **skips inactive rules** — GIVEN one active rule and one inactive rule WHEN GET /api/alerts/status is called THEN the response contains only 1 rule in the array
- **returns empty rules array when user has no active rules** — GIVEN no rules for the authenticated user WHEN GET /api/alerts/status is called THEN 200 is returned with an empty rules array and evaluatedAt is present
- **includes correct fields in each rule status** — GIVEN one active rule with tokenThreshold=10000 and current usage=8500 WHEN GET /api/alerts/status is called THEN the rule object contains id, scope, scopeValue, metric, tokenThreshold=10000, currentUsage=8500, remaining=1500, percentageConsumed=85.0, alertTriggered (based on alertPercentage), and thresholdBreached=false
- **clamps remaining to 0 when over threshold** — GIVEN an active rule with tokenThreshold=5000 and current usage=7000 WHEN GET /api/alerts/status is called THEN remaining=0 and percentageConsumed=140.0 and thresholdBreached=true
- **evaluatedAt is a valid ISO timestamp** — GIVEN any set of rules WHEN GET /api/alerts/status is called THEN evaluatedAt is a valid ISO 8601 string close to the current time

## Implementation Notes

- **Layer(s):** Controller/route, service orchestration
- **Pattern reference:** Extends the alerts router from T2; adds the /status route BEFORE the /:id route to prevent Express treating "status" as an id parameter
- **Key decisions:**
  - The controller calls `AlertService.evaluateAllForUser(userId)` which internally fetches active rules via `IAlertRepo.findActiveByUserId()` and evaluates each one
  - `evaluateAllForUser` is a new method on AlertService that loops over active rules and calls `evaluateRule` for each
  - Response shape: `{ evaluatedAt: string, rules: RuleStatus[] }`
  - `evaluatedAt` is set to `new Date().toISOString()` at the start of evaluation
  - Tests use mocked repos to control usage data — this is an API-level test using Supertest with injected mocks
- **Libraries:** supertest (existing)

## Scope Boundaries

- Do NOT add caching or background evaluation — this is on-demand per the plan
- Do NOT add push notifications or webhook triggers
- Do NOT add pagination — at workshop scale, all rules are returned in one response

## Files Expected

**New files:**
- `src/routes/__tests__/alerts.status.test.ts`

**Modified files:**
- `src/services/AlertService.ts` — add `evaluateAllForUser(userId: string)` method
- `src/routes/alerts.ts` — add GET /status route handler

## TDD Sequence

1. Write test for empty rules array (no rules for user); RED
2. Add `evaluateAllForUser` to AlertService (returns empty array when no active rules); wire up GET /status route; GREEN
3. Write test for evaluated status with active rules and known usage; RED
4. Implement full evaluation loop in `evaluateAllForUser`; GREEN
5. Write test for inactive rules being skipped; GREEN (should pass with findActiveByUserId)
6. Write test for over-threshold clamping; GREEN (covered by evaluateRule logic)
7. Write test for evaluatedAt being valid ISO timestamp; GREEN
8. REFACTOR — ensure response shape matches plan spec exactly
