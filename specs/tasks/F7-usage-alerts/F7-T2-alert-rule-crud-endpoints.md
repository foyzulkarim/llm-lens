# TASK: Alert Rule CRUD Endpoints

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F7 — Usage Alerts & Thresholds
> **Effort:** m
> **Priority:** medium
> **Depends on:** P3-E3-T1-alert-rule-model-repository.md
> **Plan source:** specs/plans/PLAN-F7-usage-alerts.md

## Description

Implement the four CRUD endpoints for alert rules: POST /api/alerts (create), GET /api/alerts (list), PUT /api/alerts/:id (update), DELETE /api/alerts/:id (remove). Each endpoint is scoped to the authenticated user. Includes input validation for scope, metric, tokenThreshold, alertPercentage, and scopeValue.

## Test Plan

### Test File(s)
- `src/routes/__tests__/alerts.crud.test.ts`

### Test Scenarios

#### POST /api/alerts — create rule
- **creates a valid alert rule** — GIVEN a valid payload with scope="user", metric="daily", tokenThreshold=10000, alertPercentage=80 WHEN POST /api/alerts is called THEN 201 is returned with the created rule including id, isActive=true, and createdAt
- **rejects missing required fields** — GIVEN a payload missing scopeValue WHEN POST /api/alerts is called THEN 400 is returned with code VALIDATION_ERROR
- **rejects invalid scope value** — GIVEN a payload with scope="invalid" WHEN POST /api/alerts is called THEN 400 is returned with code VALIDATION_ERROR
- **rejects tokenThreshold <= 0** — GIVEN a payload with tokenThreshold=-5 WHEN POST /api/alerts is called THEN 400 is returned with code VALIDATION_ERROR
- **rejects alertPercentage outside 1-100** — GIVEN a payload with alertPercentage=150 WHEN POST /api/alerts is called THEN 400 is returned with code VALIDATION_ERROR

#### GET /api/alerts — list rules
- **returns all rules for the authenticated user** — GIVEN two rules created by the authenticated user WHEN GET /api/alerts is called THEN 200 is returned with an array of two rules
- **returns empty array when user has no rules** — GIVEN no rules for the authenticated user WHEN GET /api/alerts is called THEN 200 is returned with an empty array

#### PUT /api/alerts/:id — update rule
- **updates an existing rule** — GIVEN an existing rule owned by the user WHEN PUT /api/alerts/:id is called with { tokenThreshold: 5000 } THEN 200 is returned with the updated rule
- **returns 404 for non-existent rule** — GIVEN no rule with the provided id WHEN PUT /api/alerts/:id is called THEN 404 is returned with code NOT_FOUND
- **returns 404 for rule owned by a different user** — GIVEN a rule owned by user-2 WHEN user-1 calls PUT /api/alerts/:id THEN 404 is returned with code NOT_FOUND

#### DELETE /api/alerts/:id — delete rule
- **deletes an existing rule** — GIVEN an existing rule owned by the user WHEN DELETE /api/alerts/:id is called THEN 204 is returned and the rule no longer exists
- **returns 404 for non-existent rule** — GIVEN no rule with the provided id WHEN DELETE /api/alerts/:id is called THEN 404 is returned with code NOT_FOUND

## Implementation Notes

- **Layer(s):** Controller/route, validation
- **Pattern reference:** Follow existing route patterns from F1/F2 — router + controller functions, auth middleware applied to all routes
- **Key decisions:**
  - Validation happens in the controller layer before calling the repository
  - PUT allows partial updates — only provided fields are changed
  - DELETE returns 204 No Content on success
  - Ownership check: fetch rule by id, verify userId matches req.user.id; return 404 (not 403) if mismatch to avoid leaking rule existence
  - Auth middleware from F2 provides req.user.id
- **Libraries:** express (existing)

## Scope Boundaries

- Do NOT add the /api/alerts/status endpoint (that belongs in T4)
- Do NOT add alert evaluation or period calculation logic (that belongs in T3)
- Validation is inline or in a helper — no external validation library required

## Files Expected

**New files:**
- `src/routes/alerts.ts`
- `src/routes/__tests__/alerts.crud.test.ts`

**Modified files:**
- `src/app.ts` — register alerts router at /api/alerts

## TDD Sequence

1. Write test for POST success case; RED
2. Implement route, controller, and basic create logic; GREEN
3. Write validation rejection tests (missing fields, invalid scope, bad threshold, bad percentage); RED then GREEN
4. Write GET list tests (with rules + empty); RED then GREEN
5. Write PUT tests (success, not found, wrong user); RED then GREEN
6. Write DELETE tests (success, not found); RED then GREEN
7. REFACTOR — extract validation helper if controller is getting large
