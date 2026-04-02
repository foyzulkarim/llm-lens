# Plan: F1 PR Review Fixes

> **Date:** 2026-04-02
> **Project source:** Standalone (PR #1 review findings)
> **Estimated tasks:** 6 issues across 4 files (2 were no-ops, 1 removed as already adequate)
> **Planning session:** brief

## Summary

Fix 4 actionable issues identified in PR #1 code review (8 original findings; 4 already resolved/adequate). Remaining fixes: AbortSignal lifecycle bug, test DB parallelization, seed.test isolation, and seed.ts type annotation. Three items (FR2, FR7, FR8) verified as already correct — no changes needed.

---

## Requirements

### Functional Requirements

1. **FR1:** `AbortSignal.timeout()` must be created per-request in `RealOllamaClient.chat()`, not stored in constructor
2. **~~FR2:~~** ~~`timeoutMs` parameter must be optional~~ — **REMOVE**: already optional via default parameter `timeoutMs = 30000`; `new RealOllamaClient(url)` compiles without it
3. **FR3:** `testDb.ts` must not use module-level mutable state to support 4 parallel Jest workers
4. **FR4:** `seed.test.ts` must use isolated test DB instance instead of default `PrismaClient`
5. **FR5:** `seed.ts` empty array in `generateLogs()` must have explicit type annotation (cannot use `ReturnType<typeof generateLogs>` — that is circular; use explicit `GeneratedLog` interface instead)
6. **FR6:** `.gitignore` must ignore all `.env` variant files (verify — current file appears correct)
7. **~~FR7:~~** ~~`MockOllamaClient.test.ts` error assertion~~ — **REMOVE/DOWNGRADE**: `MockOllamaClient` throws plain `Error`, not `OllamaConnectionError`. Existing string-match assertion is adequate; the review finding was for `RealOllamaClient.test.ts:67` which already uses `.rejects.toThrow(OllamaConnectionError)`
8. **FR8:** `catch (err: unknown)` pattern in `RealOllamaClient` — verify correct (already appears correct); no-op

### Non-Functional Requirements

1. **NFR1:** All existing tests must continue to pass after changes
2. **NFR2:** TypeScript compilation must succeed without errors after changes

---

## Behaviors

### RealOllamaClient — AbortSignal Lifecycle

**Why rules matter:**

- `AbortSignal.timeout()` creates a timer that cannot be restarted. Storing it in constructor means the signal fires on the first request's timeout, then becomes permanently aborted for subsequent requests.
- Each chat request needs its own fresh AbortSignal tied to that specific request's lifetime.

**What's required:**

- Create `AbortSignal.timeout()` inside `chat()` method, not in constructor
- Pass the signal to `fetch()` within that specific request's try block

### testDb — Parallel Test Safety

**Why rules matter:**

- Module-level `let prisma` and `let dbPath` are shared across all test files when Jest runs in parallel (--runInBand is NOT enabled by default for 4 workers)
- Two workers could share the same `prisma` instance, causing race conditions on `resetDb()` and `teardownTestDb()`

**What's required:**

- `setupTestDb()` must return a fresh PrismaClient tied to a unique temp file per call
- No module-level state that persists across test files
- Each test file must call `setupTestDb()` and `teardownTestDb()` in its own `beforeAll`/`afterAll`

### seed.test.ts — Test Isolation

**Why rules matter:**

- Using `new PrismaClient()` without a datasource URL points to the default dev database
- Tests should never touch dev/staging data

**What's required:**

- `seed.test.ts` should use `setupTestDb()` helper like other test files do

### .gitignore — Security Regression

**Why rules matter:**

- `.env` files often contain secrets, API keys, database URLs
- If `.env` stops being ignored, accidental commits could expose credentials

**What's required:**

- Verify `.env` is present (line 5 shows it is)
- Verify `.env.local` is present (line 6 shows it is)
- Verify `.env.*.local` is present (line 7 shows it is)
- Confirm no regression occurred — the review flagged it but current file appears correct

### ~~MockOllamaClient — Error Assertion~~ — No Change Needed

`MockOllamaClient` throws plain `Error` (not `OllamaConnectionError`). The existing `.rejects.toThrow("Mock error for error-model")` string assertion is the strongest possible check. `RealOllamaClient.test.ts:67` already asserts `.rejects.toThrow(OllamaConnectionError)` for the real client. No action required.

---

## Detailed Specifications

### RealOllamaClient — Signal Management

**Current (buggy):**

```typescript
constructor(baseUrl: string, timeoutMs = 30000) {
  this.signal = AbortSignal.timeout(timeoutMs); // ← created once, permanent
}

async chat(request: ChatRequest): Promise<ChatResponse> {
  // signal is already set, timer started at construction time
  res = await fetch(url, { signal: this.signal }); // ← same signal reused
}
```

**Correct behavior:**

- `AbortSignal.timeout()` called inside `chat()` before the fetch
- Signal is fresh for each request

### testDb — Module-Level State

**Current (broken for parallel):**

```typescript
let prisma: PrismaClient; // ← shared mutable state
let dbPath: string; // ← shared mutable state

export async function setupTestDb(): Promise<PrismaClient> {
  // ...sets module-level prisma and dbPath
}
```

**Correct behavior for parallel workers:**

- All state must be local to `setupTestDb()` or returned from it
- No module-level `let` variables that persist across invocations
- Each caller gets its own returned PrismaClient

### seed.test.ts — DB Isolation

**Current (uses default client):**

```typescript
beforeAll(() => {
  prisma = new PrismaClient(); // ← default DATABASE_URL, not isolated
});
```

**Correct behavior:**

- Use `setupTestDb()` from test helpers
- Pass isolated test DB to `seed()`

### seed.ts — Type Annotation

**Current:**

```typescript
const logs = []; // ← implicit any[]
```

**Correct behavior:**

```typescript
type GeneratedLog = {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  createdAt: Date;
};
const logs: GeneratedLog[] = [];
```

Note: `ReturnType<typeof generateLogs>` is circular — cannot reference a function's return type from inside the function itself. Use explicit interface instead (Decision #5).

### ~~MockOllamaClient.test.ts — Error Check~~ — No Change Needed

`MockOllamaClient` throws plain `Error`, not `OllamaConnectionError`. Existing string-match assertion at line 72-77 is adequate. The review finding was for `RealOllamaClient.test.ts:67` which already uses `.rejects.toThrow(OllamaConnectionError)`. No action required.

---

## Key Constraints

| Constraint                                     | Why It Matters                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `AbortSignal` must be created per-request      | Reusing AbortSignal causes premature abortion after first timeout    |
| testDb must not use module-level mutable state | Parallel workers would share state, causing race conditions          |
| seed.test.ts must use isolated test DB         | Default PrismaClient points to dev DB — tests could corrupt dev data |
| `.env` variants must be ignored                | Accidental secret commits could expose credentials                   |

---

## Edge Cases & Failure Modes

| Scenario                                | Decision                                                         | Rationale                                              |
| --------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| Fetch succeeds but response is non-JSON | Throw `OllamaResponseError` with message "non-JSON response"     | Already implemented                                    |
| Ollama returns error status (4xx/5xx)   | Throw `OllamaResponseError` with status code                     | Already implemented                                    |
| Connection fails before response        | Catch fetch error, wrap in `OllamaConnectionError`               | Already using `err: unknown` pattern                   |
| Timeout fires before fetch completes    | AbortError propagates, caught and wrapped                        | Per-request signal ensures correct timeout per request |
| Parallel tests run on same machine      | Each gets unique temp db file via `Date.now()` + `Math.random()` | Already uses temp path pattern                         |
| seed() called twice in same test        | `beforeEach` clears data, upsert ensures idempotency             | Already handled via `deleteMany` + upsert              |

---

## Decisions Log

| #   | Decision                                                  | Alternatives Considered                                                                                      | Chosen Because                                                                                                                                      |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Create AbortSignal per-request                            | Keep in constructor, recreate on error                                                                       | `AbortSignal.timeout()` cannot be restarted once fired                                                                                              |
| 2   | ~~`timeoutMs` optional~~                                  | N/A                                                                                                          | Already optional via default param — no decision needed                                                                                             |
| 3   | **testDb returns `{ prisma, resetDb, teardown }` handle** | Option A: return handle object; Option B: return handle with reset; Option C: factory function with new name | Option B preserves the current helper pattern (`resetDb`, `teardownTestDb`) and keeps the same function names — minimal changes to existing callers |
| 4   | seed.test.ts uses `setupTestDb()` helper                  | Inline test DB setup                                                                                         | DRY — follows existing pattern from other test files                                                                                                |
| 5   | seed.ts uses explicit `GeneratedLog` interface            | Inline `as const` type, `ReturnType<typeof generateLogs>`                                                    | `ReturnType` is circular — cannot reference function's return type from inside the function; explicit interface is clearest                         |

---

## Scope Boundaries

### In Scope

- FR1: AbortSignal per-request fix (T1)
- FR3: testDb parallel safety refactor + caller updates (T2)
- FR4 + FR5: seed.test isolation + seed.ts type annotation (T3)
- FR6: .gitignore verification (T4)
- TypeScript compilation verification
- Running existing tests to confirm no regressions

### Out of Scope

- New test coverage for the fixes (existing tests should cover)
- Changes to production database schema
- Changes to RealOllamaClient API surface beyond optional `timeoutMs`

---

## Dependencies

### Depends On

- None — all referenced code already exists

### Depended On By

- None — these are standalone fixes

---

## Architecture Notes

- `RealOllamaClient` implements `IOllamaClient` interface — changes must preserve interface contract
- `OllamaChatResponse` interface already defined at lines 4-10 — the `any` issue may refer to the `res.json()` cast at line 42
- `testDb.ts` helper is used by integration tests — refactored API returns `{ prisma: PrismaClient, resetDb: () => Promise<void>, teardown: () => Promise<void> }`

### testDb Caller Impact Analysis

After refactoring, these files use `setupTestDb()`, `resetDb()`, and `teardownTestDb()` and must be updated:

| Caller File                                               | Current Usage                                    | Required Changes                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `src/__tests__/helpers/testDb.test.ts`                    | Tests the helpers themselves                     | `setupTestDb()` now returns a handle object; update `beforeAll` to destructure `{ prisma, resetDb, teardown }` |
| `src/__tests__/integration/usage/usageRepository.test.ts` | `setupTestDb()`, `resetDb()`, `teardownTestDb()` | Same destructuring pattern in `beforeAll`/`afterAll`                                                           |
| `src/__tests__/prisma/seed.test.ts` (T3)                  | Will use `setupTestDb()`                         | Same pattern; must wait for T2 to complete first                                                               |

---

## Open Questions

- **Q1:** The `.gitignore` appears correct (`.env`, `.env.local`, `.env.*.local` all present). Was the regression in a previous version, or is there a different concern?
  - **Suggested default:** Treat as already fixed, confirm during implementation
  - **Resolution:** Verify at implementation time; no changes expected

- ~~**Q2:**~~ `MockOllamaClient.test.ts:72` — **Resolved:** `MockOllamaClient` throws plain `Error`, not `OllamaConnectionError`. Existing string-match assertion is adequate. FR7 removed from scope.

- ~~**Q3:**~~ `catch (err: unknown)` — **Resolved:** Already correctly implemented. FR8 is a no-op.

---

# Tasks

## Task T1: RealOllamaClient — AbortSignal per-request, timeoutMs optional, catch unknown

> **Status:** not started
> **Effort:** s
> **Priority:** high
> **Depends on:** None

### Description

Fix `RealOllamaClient.ts` — `AbortSignal.timeout()` is created in the constructor and reused across all requests. Must move inside `chat()` so each request gets a fresh signal.

Note: `timeoutMs` is already optional via default parameter (`timeoutMs = 30000`) — no change needed. `catch (err: unknown)` is already correctly implemented — no change needed.

### Test Plan

#### Test File(s)

- `src/__tests__/unit/clients/RealOllamaClient.test.ts`

#### Test Scenarios

##### RealOllamaClient.chat() — per-request AbortSignal

- **`respects timeout (30s default)`** — UPDATE: currently spies on `AbortSignal.timeout()` in the constructor. After fix: spy inside `chat()` method instead. `new RealOllamaClient(url)` followed by `chat()` should create a 30000ms timeout signal per request.
- **`accepts custom timeoutMs`** — GIVEN `new RealOllamaClient(url, 5000)` WHEN `chat()` is called THEN the fetch uses an `AbortSignal` with 5000ms timeout
- **`creates fresh AbortSignal per request`** — GIVEN a `RealOllamaClient` instance WHEN `chat()` is called twice sequentially THEN each call uses a separate `AbortSignal` instance (not shared)
- **`times out correctly per request`** — GIVEN a mock that delays beyond `timeoutMs` WHEN `chat()` is called THEN the request is aborted and throws `OllamaConnectionError`

##### RealOllamaClient error handling

- **`wraps network errors with OllamaConnectionError`** — GIVEN a fetch that throws `ECONNREFUSED` WHEN `chat()` is called THEN `OllamaConnectionError` is thrown with the original error as cause
- **`throws on non-200 status`** — GIVEN Ollama returns 500 WHEN `chat()` is called THEN `OllamaResponseError` is thrown
- **`throws on non-JSON response`** — GIVEN Ollama returns 200 with malformed JSON WHEN `chat()` is called THEN `OllamaResponseError` is thrown

### Implementation Notes

- **Layer:** Client / HTTP
- **Pattern reference:** Existing `RealOllamaClient.ts` implementation
- **Key decisions:** AbortSignal created inside `chat()` not constructor (Decision #1 from plan)
- **Libraries:** None — native `AbortSignal.timeout()` and fetch

### Scope Boundaries

- Do NOT change the `IOllamaClient` interface
- Do NOT add new public methods
- Do NOT change `timeoutMs` — already optional
- Do NOT change `catch (err: unknown)` — already correct

### Files Expected

**Modified files:**

- `src/clients/RealOllamaClient.ts` — move `AbortSignal.timeout()` creation from constructor into `chat()` method
- `src/__tests__/unit/clients/RealOllamaClient.test.ts` — update `respects timeout` test to spy on `AbortSignal.timeout()` inside `chat()` instead of constructor

---

## Task T2: testDb.ts — Remove module-level mutable state

> **Status:** not started
> **Effort:** m
> **Priority:** high
> **Depends on:** None

### Description

Refactor `testDb.ts` to remove module-level `let prisma` and `let dbPath` variables. The current design stores state in module variables which causes race conditions when Jest runs 4 parallel workers.

**New API (Decision #3):** `setupTestDb()` returns a handle object `{ prisma, resetDb, teardown }` where:

- `prisma: PrismaClient` — the isolated test DB client
- `resetDb: () => Promise<void>` — clears `usageLog` and `apiKey` tables
- `teardown: () => Promise<void>` — disconnects and deletes the temp DB file

Module-level `let` state is eliminated entirely. Callers destructure from the return value.

### Test Plan

#### Test File(s)

- `src/__tests__/helpers/testDb.test.ts`

#### Test Scenarios

##### testDb helper — setup

- **`provides a working Prisma client`** — GIVEN `setupTestDb()` is called WHEN a raw SQL query is executed THEN the result is returned successfully
- **`each call gets unique database file`** — GIVEN `setupTestDb()` is called twice WHEN both returned clients query their respective databases THEN they operate on separate files (no shared state)

##### testDb helper — cleanup

- **`teardown closes connection and removes file`** — GIVEN `setupTestDb()` returned a handle WHEN `handle.teardown()` is called THEN the database file is deleted from disk and the client is disconnected
- **`resetDb clears all tables`** — GIVEN `setupTestDb()` returned a handle with data WHEN `handle.resetDb()` is called THEN all `usageLog` and `apiKey` records are deleted

##### testDb helper — parallel safety

- **`multiple instances can coexist`** — GIVEN two separate `setupTestDb()` calls WHEN both instances are used concurrently (simulated with interleaved operations) THEN they do not interfere with each other's data

### Implementation Notes

- **Layer:** Test infrastructure
- **Pattern reference:** Current `testDb.ts` — module-level `let` state must be eliminated
- **Key decisions:** All state local to `setupTestDb()` or returned; callers receive PrismaClient via return value (Decision #3 from plan)
- **Libraries:** `@prisma/client`, `child_process`, `fs`, `os`, `path`

### Scope Boundaries

- Do NOT add locking/mutex — eliminate shared state instead
- All changes are atomic — `testDb.ts` and all its callers must be updated together (old API is removed)

### Files Expected

**Modified files:**

- `src/__tests__/helpers/testDb.ts` — remove module-level `let prisma` and `let dbPath`; return handle object from `setupTestDb()`
- `src/__tests__/helpers/testDb.test.ts` — update to destructure `{ prisma, resetDb, teardown }` from `setupTestDb()`
- `src/__tests__/integration/usage/usageRepository.test.ts` — update to destructure `{ prisma, resetDb, teardown }` from `setupTestDb()`

### Caller Updates (part of T2 scope)

Both caller files must be updated to use the new destructuring pattern:

**Before:**

```typescript
beforeAll(async () => {
  prisma = await setupTestDb();
});
afterAll(async () => {
  await teardownTestDb();
});
```

**After:**

```typescript
beforeAll(async () => {
  ({ prisma, resetDb, teardown } = await setupTestDb());
});
afterAll(async () => {
  await teardown();
});
```

Run all test files after refactoring to confirm no regressions.

---

## Task T3: seed.test.ts + seed.ts — Isolated test DB and type annotation

> **Status:** not started
> **Effort:** xs
> **Priority:** medium
> **Depends on:** T2 (testDb refactor must be complete first)

### Description

Two independent but related fixes:

1. `seed.test.ts` uses `new PrismaClient()` without an isolated test DB — must use `setupTestDb()` like other test files
2. `seed.ts` `generateLogs()` returns an empty array `[]` without explicit type — must add explicit type annotation

### Test Plan

#### Test File(s)

- `src/__tests__/prisma/seed.test.ts`

#### Test Scenarios

##### Seed with isolated DB

- **`seed is idempotent`** — GIVEN isolated test DB WHEN `seed()` is called twice THEN the second call succeeds and log count is 80-100
- **`spreads logs across 14 days`** — GIVEN isolated test DB WHEN `seed()` is called THEN logs span at least 13 days
- **`spreads logs across multiple users`** — GIVEN isolated test DB WHEN `seed()` is called THEN all 4 API keys are created and logs are distributed across user-1, user-2, user-3 (not admin-1)
- **`spreads logs across multiple models`** — GIVEN isolated test DB WHEN `seed()` is called THEN logs include llama3, mistral, and codellama
- **`creates 80-100 usage log entries`** — GIVEN isolated test DB WHEN `seed()` is called THEN log count is between 80 and 100
- **`creates all test API keys`** — GIVEN isolated test DB WHEN `seed()` is called THEN all 4 API keys exist with correct properties

##### Type annotation (TypeScript only, no runtime test)

- **`seed.ts compiles without implicit any`** — GIVEN `seed.ts` WHEN TypeScript compiles THEN no error about implicit `any[]` on the empty array in `generateLogs()`

### Implementation Notes

- **Layer:** Test infrastructure + type safety
- **Pattern reference:** Other test files in `src/__tests__/` use `setupTestDb()` pattern — follow the same approach
- **Key decisions:** `seed.test.ts` uses `setupTestDb()` helper (Decision #4 from plan); explicit type on `logs` array resolves FR5
- **Libraries:** `@prisma/client`

### Scope Boundaries

- Do NOT change the seed data values (weights, model names, user IDs) — only the DB connection and type annotation
- Do NOT add new test cases — existing test assertions are sufficient
- Do NOT use `ReturnType<typeof generateLogs>` — that is circular; use explicit `GeneratedLog` interface

### Files Expected

**Modified files:**

- `src/__tests__/prisma/seed.test.ts` — replace `new PrismaClient()` with `setupTestDb()`
- `prisma/seed.ts` — add explicit `GeneratedLog` type annotation to `const logs = []`:
  ```typescript
  type GeneratedLog = {
    userId: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    createdAt: Date;
  };
  const logs: GeneratedLog[] = [];
  ```

---

## Task T4: MockOllamaClient.test.ts + .gitignore verification

> **Status:** not started
> **Effort:** xs
> **Priority:** low
> **Depends on:** None

### Description

Two verification-only items:

1. `MockOllamaClient.test.ts` — `MockOllamaClient` throws plain `Error`, not `OllamaConnectionError`. The existing `.rejects.toThrow("Mock error for error-model")` string assertion is the strongest possible check for this mock. No change needed.
2. `.gitignore` — verify that `.env`, `.env.local`, and `.env.*.local` are all properly ignored (appear to be present — confirm no regression)

### Test Plan

#### .gitignore verification (manual, no test file)

- **`.env variants are ignored`** — GIVEN the `.gitignore` file WHEN it is reviewed THEN `.env`, `.env.local`, and `.env.*.local` patterns are present and correct

#### MockOllamaClient assertion (verify only, no change needed)

- **`throws error for error-model`** — Existing `.rejects.toThrow("Mock error for error-model")` string assertion is adequate since `MockOllamaClient` throws a plain `Error`. The review finding was for `RealOllamaClient.test.ts:67` which already uses `.rejects.toThrow(OllamaConnectionError)`.

### Implementation Notes

- **Layer:** Configuration verification
- **Libraries:** None

### Scope Boundaries

- Do NOT change `MockOllamaClient.test.ts` — existing assertion is adequate
- Do NOT make any `.gitignore` changes if the file is already correct

### Files Expected

**Verify (no changes expected):**

- `.gitignore` — confirm `.env`, `.env.local`, `.env.*.local` are all present
- `src/__tests__/unit/clients/MockOllamaClient.test.ts` — no changes needed

---

_Tasks generated from specs/plans/PLAN-f1-review-fixes.md_
_For TDD implementation, run: "Execute TDD for: specs/plans/PLAN-f1-review-fixes.md — Tasks T1-T4"_
