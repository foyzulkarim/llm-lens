# Plan: Auth Middleware (F2)

> **Date:** 2026-03-28
> **Project source:** specs/plans/PROJECT-ollama-usage-intelligence-api.md
> **Estimated tasks:** 4
> **Planning session:** detailed

## Summary

Implement API key-based authentication middleware using the IAuthProvider interface. The middleware extracts an API key from the request header, validates it against the database, and attaches user context to the request for downstream handlers. Also implement ApiKeyAuthProvider (the concrete IAuthProvider) backed by the ApiKey Prisma model.

## Requirements

### Functional Requirements

1. Auth middleware reads the API key from the `X-API-Key` request header
2. If no API key is provided, respond with 401 and `{ error: { message: "API key is required", code: "MISSING_API_KEY", status: 401 } }`
3. If the API key is invalid (not found or inactive), respond with 401 and `{ error: { message: "Invalid API key", code: "INVALID_API_KEY", status: 401 } }`
4. If the API key is valid, attach `UserContext` (`userId`, `userName`) to the Express request object and call `next()`
5. ApiKeyAuthProvider.validateKey looks up the key in the ApiKey table; returns UserContext if found and active, null otherwise
6. ApiKeyAuthProvider.createKey generates a new UUID-based API key, stores it, and returns the key string
7. Auth middleware is applied to all `/api/*` routes

### Non-Functional Requirements

1. Key lookup should be a single database query (no N+1)
2. Middleware must not leak information about why auth failed beyond "missing" vs "invalid"
3. Request type is extended via TypeScript declaration merging to include `user?: UserContext`

## Detailed Specifications

### Auth Middleware

**Header:** `X-API-Key`

**Flow:**

```
Request arrives
  → Extract X-API-Key header
  → If missing → 401 MISSING_API_KEY
  → Call IAuthProvider.validateKey(key)
  → If null → 401 INVALID_API_KEY
  → Attach { userId, userName } to req.user
  → next()
```

**TypeScript extension:**

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}
```

### ApiKeyAuthProvider

**validateKey(key: string): Promise<UserContext | null>**

- Queries `prisma.apiKey.findUnique({ where: { key } })`
- Returns null if not found OR if `isActive === false`
- Returns `{ userId, userName }` if found and active

**createKey(userId: string, userName: string): Promise<string>**

- Generates key using `crypto.randomUUID()` prefixed with `oui-` (Ollama Usage Intelligence)
- Format: `oui-${uuid}` (e.g., `oui-a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
- Stores in database with `isActive: true`
- Returns the generated key string

### IApiKeyRepo Interface

```typescript
interface IApiKeyRepo {
  findByKey(key: string): Promise<ApiKey | null>;
  create(userId: string, userName: string, key: string): Promise<ApiKey>;
}
```

**Validation Rules:**

- key: non-empty string, trimmed of whitespace
- userId: non-empty string
- userName: non-empty string

**Error Scenarios:**

| Condition                        | Expected Behavior                               |
| -------------------------------- | ----------------------------------------------- |
| No X-API-Key header              | 401, code: MISSING_API_KEY                      |
| Empty string as API key          | 401, code: MISSING_API_KEY (treated as missing) |
| Key not found in database        | 401, code: INVALID_API_KEY                      |
| Key found but isActive=false     | 401, code: INVALID_API_KEY                      |
| Key found and active             | 200 (passes through), req.user set              |
| Database error during validation | 500, error logged, generic message to client    |

## Edge Cases & Failure Modes

| Scenario                                     | Decision                                                                                         | Rationale                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| API key has leading/trailing whitespace      | Trim before lookup                                                                               | Common copy-paste error                       |
| X-Api-Key (different casing)                 | Express lowercases all headers; access via `req.headers['x-api-key']`                            | HTTP headers are case-insensitive             |
| Multiple X-API-Key headers                   | Use the first value                                                                              | Standard HTTP behavior                        |
| Database connection fails during validateKey | Let error propagate to error handler middleware → 500                                            | Don't silently allow unauthenticated requests |
| createKey generates a duplicate key          | Astronomically unlikely with UUID; if Prisma unique constraint fails, throw and let caller retry | UUID collision probability is negligible      |
| Deactivated key used in subsequent request   | Returns null from validateKey; middleware returns 401                                            | Keys can be deactivated without deletion      |

## Decisions Log

| #   | Decision                                | Alternatives Considered            | Chosen Because                                         |
| --- | --------------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| 1   | X-API-Key header (not Bearer token)     | Authorization: Bearer, query param | Simpler for workshop; no token parsing; curl-friendly  |
| 2   | Key prefix `oui-`                       | No prefix, `sk-` prefix            | Namespaced to this project; easy to identify in logs   |
| 3   | Separate IApiKeyRepo from IAuthProvider | Auth provider queries DB directly  | Repository pattern consistency; testable in isolation  |
| 4   | No key caching                          | In-memory cache with TTL           | Workshop scope; DB is local SQLite so lookups are fast |

## Scope Boundaries

### In Scope

- Auth middleware function
- ApiKeyAuthProvider implementing IAuthProvider
- IApiKeyRepo interface and PrismaApiKeyRepository implementation
- TypeScript declaration merging for `req.user`
- Unit tests for middleware (mocked IAuthProvider)
- Unit tests for ApiKeyAuthProvider (mocked IApiKeyRepo)
- Integration tests for PrismaApiKeyRepository (Testcontainers)
- API tests for auth rejection/acceptance (Supertest)

### Out of Scope

- Key rotation or expiration (reason: workshop scope)
- Role-based access control (reason: all authenticated users have equal access)
- Rate limiting per key (reason: deferred to alerts feature for reporting only)
- Admin endpoints for key management (reason: keys managed via seed data and createKey)

## Dependencies

### Depends On

- F1 — IAuthProvider interface, ApiKey Prisma model, Express app, error handler middleware, test infrastructure

### Depended On By

- F3 (Chat Proxy) — needs auth middleware to protect the proxy endpoint
- F5-F8 (all student features) — all endpoints are authenticated

## Architecture Notes

The middleware depends on IAuthProvider (not on the concrete ApiKeyAuthProvider). In tests, a mock IAuthProvider can be injected to bypass database access. The composition root in `app.ts` wires ApiKeyAuthProvider → auth middleware.

The IApiKeyRepo is a new repository interface introduced by this feature, following the same pattern as IUsageRepo from F1.

---

_This plan is the input for the Feature Planning skill._
_Review this document, then run: "Generate task from plan: specs/plans/PLAN-F2-auth-middleware.md"_
