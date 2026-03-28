# Plan: Usage Alerts & Thresholds (F7)

> **Date:** 2026-03-28
> **Project source:** specs/plans/PROJECT-ollama-usage-intelligence-api.md
> **Estimated tasks:** 5
> **Planning session:** detailed

## Summary

Users configure alert rules with token limits (daily or monthly) scoped to a user or a specific model. The status endpoint evaluates all active rules against actual usage data and reports which thresholds have been breached, the current consumption percentage, and the remaining allowance.

## Requirements

### Functional Requirements
1. `POST /api/alerts` — Create an alert rule (scope, scopeValue, metric, tokenThreshold, alertPercentage)
2. `GET /api/alerts` — List all alert rules for the authenticated user
3. `PUT /api/alerts/:id` — Update a rule
4. `DELETE /api/alerts/:id` — Remove a rule
5. `GET /api/alerts/status` — Evaluate all active rules against current usage; return status for each
6. Alert rules support two scopes: "user" (track a specific user's usage) and "model" (track a specific model's usage)
7. Alert rules support two metrics: "daily" (resets at midnight UTC) and "monthly" (resets on the 1st of each month UTC)
8. The status endpoint returns: current token usage, threshold, percentage consumed, whether the alert percentage has been reached, and whether the threshold has been breached
9. Inactive rules are skipped during status evaluation

### Non-Functional Requirements
1. Status evaluation is on-demand (computed on every GET, not cached)
2. Each rule evaluation should require at most one database query for usage summation
3. Alert rules are scoped to the user who created them

## Detailed Specifications

### Prisma Model: AlertRule

| Field | Type | Constraints |
|-------|------|------------|
| id | String | @id @default(uuid()) |
| userId | String | creator/owner of the rule |
| scope | String | "user" or "model" |
| scopeValue | String | userId being tracked, or model name |
| metric | String | "daily" or "monthly" |
| tokenThreshold | Int | total token limit |
| alertPercentage | Decimal | percentage trigger (e.g., 80.0 = alert at 80%) |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

### Period Calculation

**Daily metric:**
- Period start: today at 00:00:00 UTC
- Period end: today at 23:59:59.999 UTC

**Monthly metric:**
- Period start: 1st of current month at 00:00:00 UTC
- Period end: last day of current month at 23:59:59.999 UTC

### Alert Evaluation Logic

For each active rule:
1. Determine the current period (daily or monthly) based on UTC time
2. Query UsageLog for total tokens within that period, filtered by scope:
   - scope "user": `WHERE userId = scopeValue AND createdAt BETWEEN periodStart AND periodEnd`
   - scope "model": `WHERE model = scopeValue AND createdAt BETWEEN periodStart AND periodEnd`
3. Calculate: `percentageConsumed = (currentUsage / tokenThreshold) * 100`
4. Determine status:
   - `alertTriggered = percentageConsumed >= alertPercentage`
   - `thresholdBreached = currentUsage >= tokenThreshold`

### Endpoints

**POST /api/alerts**
```json
// Request
{ "scope": "user", "scopeValue": "user-1", "metric": "daily", "tokenThreshold": 10000, "alertPercentage": 80 }
// Response 201
{ "id": "...", "scope": "user", "scopeValue": "user-1", "metric": "daily", "tokenThreshold": 10000, "alertPercentage": "80.0", "isActive": true, "createdAt": "..." }
```

**GET /api/alerts/status**
```json
// Response 200
{
  "evaluatedAt": "2026-03-28T14:30:00Z",
  "rules": [
    {
      "id": "...",
      "scope": "user",
      "scopeValue": "user-1",
      "metric": "daily",
      "tokenThreshold": 10000,
      "currentUsage": 8500,
      "remaining": 1500,
      "percentageConsumed": 85.0,
      "alertTriggered": true,
      "thresholdBreached": false
    },
    {
      "id": "...",
      "scope": "model",
      "scopeValue": "llama3",
      "metric": "monthly",
      "tokenThreshold": 500000,
      "currentUsage": 520000,
      "remaining": 0,
      "percentageConsumed": 104.0,
      "alertTriggered": true,
      "thresholdBreached": true
    }
  ]
}
```

**Validation Rules:**

| Field | Rule |
|-------|------|
| scope | Required, must be "user" or "model" |
| scopeValue | Required, non-empty string |
| metric | Required, must be "daily" or "monthly" |
| tokenThreshold | Required, positive integer > 0 |
| alertPercentage | Required, 1-100 (decimal) |
| isActive | Optional on update, boolean |

**Error Scenarios:**

| Condition | Status | Code |
|-----------|--------|------|
| Missing required fields | 400 | VALIDATION_ERROR |
| Invalid scope value | 400 | VALIDATION_ERROR |
| Invalid metric value | 400 | VALIDATION_ERROR |
| tokenThreshold <= 0 | 400 | VALIDATION_ERROR |
| alertPercentage outside 1-100 | 400 | VALIDATION_ERROR |
| Rule not found (PUT/DELETE) | 404 | NOT_FOUND |
| Rule belongs to different user | 404 | NOT_FOUND |

## Edge Cases & Failure Modes

| Scenario | Decision | Rationale |
|----------|----------|-----------|
| No usage data for the current period | currentUsage = 0, percentageConsumed = 0, no alerts triggered | Valid state — period just started |
| Usage exactly at threshold | thresholdBreached = true (>= comparison) | Exact match means the limit is reached |
| Usage exactly at alert percentage | alertTriggered = true (>= comparison) | Exact match triggers the alert |
| percentageConsumed > 100% | Return actual percentage (e.g., 120%) | Don't cap; show how far over the limit |
| remaining goes negative | Return 0 (clamp to non-negative) | Negative remaining is confusing |
| User creates rule tracking a non-existent user/model | Allow creation; status returns 0 usage | Don't validate scopeValue against existing data; the model/user might appear later |
| Multiple rules for the same scope+metric | All are evaluated independently | Users may want different thresholds (warning at 80%, critical at 95%) |
| Rule created mid-day for daily metric | Evaluates from start of current day | Consistent period; don't start from rule creation time |
| Timezone considerations | All periods in UTC | Consistent, simple; documented for users |
| Deactivated rule reactivated | Evaluates normally from current period | No history of when it was inactive |

## Decisions Log

| # | Decision | Alternatives Considered | Chosen Because |
|---|----------|------------------------|----------------|
| 1 | On-demand evaluation (not scheduled) | Background job on cron, event-driven | Simpler; always fresh data; workshop scope doesn't need push notifications |
| 2 | UTC for all period calculations | User's local timezone, configurable TZ | Consistent behavior; no timezone complexity |
| 3 | Alerts report only (don't block requests) | Enforce quotas by rejecting requests over threshold | PRD explicitly says alerts report but don't enforce; keeps proxy simple |
| 4 | alertPercentage as separate field | Fixed at 80%, no alert concept | Flexible; users define their own warning level |
| 5 | Clamp remaining to 0 (not negative) | Show negative remaining | Cleaner UX; "0 remaining" is clear |

## Scope Boundaries

### In Scope
- AlertRule Prisma model and migration
- IAlertRepo interface and PrismaAlertRepository
- AlertService with period calculation and evaluation logic
- All 5 endpoints (CRUD + status)
- Unit tests for AlertService (mocked repos — period calculation, evaluation logic, edge cases)
- Integration tests for PrismaAlertRepository
- API tests for all endpoints

### Out of Scope
- Push notifications / webhooks when alerts trigger
- Alert history / audit log of past evaluations
- Email/Slack integration
- Quota enforcement (blocking requests)

## Dependencies

### Depends On
- F1 — IUsageRepo (for querying usage data), Express app, error classes, test infrastructure
- F2 — Auth middleware
- F4 — UsageLog data populated by the logging feature

### Depended On By
- None (leaf feature)

## Architecture Notes

The AlertService depends on IAlertRepo (for rule CRUD) and IUsageRepo (for querying usage sums). Period calculation is a pure function that takes a metric type and returns `{ start: Date, end: Date }` — excellent unit test target.

The status endpoint evaluates ALL active rules for the user in a single request. For N rules, this means N usage queries. At workshop scale (< 10 rules per user), this is fine. A production system would batch or pre-aggregate.

---
_This plan is the input for the Feature Planning skill._
_Review this document, then run: "Generate task from plan: specs/plans/PLAN-F7-usage-alerts.md"_
