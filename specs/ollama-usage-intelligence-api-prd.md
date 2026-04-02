# Ollama Usage Intelligence API — Product Requirements Document

**Version:** 1.0
**Author:** Foyzul Karim
**Date:** March 2026
**Purpose:** Workshop demo application for Agentic Software Engineering — Cohort 1

---

## 1. Product Overview

**What it is:** A middleware API that sits between client applications and a local Ollama instance. It proxies chat requests transparently, logs every interaction, and provides intelligence on top of that usage data — cost tracking, alerting, prompt management, and conversation history.

**The problem it solves:** Running Ollama locally is free, but invisible. You don't know which models you're using most, how many tokens you're burning, what it would cost if you were paying for API access, or whether certain users are consuming disproportionate resources. This API makes local LLM usage visible, measurable, and manageable.

**Why this app for the workshop:** The domain is immediately relevant to AI-curious developers. The architecture has clean module boundaries ideal for independent development. Real design trade-offs exist at every layer (sync vs async, pre-aggregate vs query-time, coupling vs abstraction). And there's a meta-appeal: using an AI coding tool to build a tool that wraps another AI tool.

**Tech stack:**

- Runtime: Node.js + Express.js + TypeScript
- Database: SQLite via Prisma ORM
- Testing: Jest (unit tests with mocked dependencies), Supertest (API integration tests), Testcontainers (repository integration tests against a real database)
- AI Tool: Claude Code (development methodology)
- Architecture: Dependency inversion — Ollama behind an interface, every service depending on abstractions not implementations

**API surface:** The proxy only supports `/api/chat` (Ollama's chat completion endpoint). This is a deliberate scope constraint — one endpoint keeps the base simple while the features built on top provide the real depth.

### Testing Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                      Testing Pyramid                        │
│                                                             │
│                        ╱╲                                   │
│                       ╱  ╲                                  │
│                      ╱ E2E╲   Supertest                     │
│                     ╱      ╲  Full HTTP request → response  │
│                    ╱────────╲ Real Express app, test DB      │
│                   ╱          ╲                               │
│                  ╱ Integration╲  Testcontainers              │
│                 ╱              ╲ Repository ↔ real database  │
│                ╱────────────────╲ Prisma + SQLite container  │
│               ╱                  ╲                           │
│              ╱       Unit         ╲  Jest + mocks            │
│             ╱                      ╲ Service logic, pure fns │
│            ╱________________________╲ Interfaces mocked      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Unit tests:** Service logic tested in isolation. All dependencies (repositories, clients) are mocked via interfaces. Fast, no I/O.
- **Integration tests (Testcontainers):** Repository layer tested against a real database instance spun up in a container. Verifies Prisma queries, migrations, and data integrity without mocks.
- **API tests (Supertest):** Full HTTP requests against the running Express app. Verifies routing, middleware, auth, request/response shapes, and end-to-end flows with a test database.

---

## 2. System Architecture

### 2.1 High-Level Data Flow

```
                         ┌──────────────────────────────────────┐
                         │            Client App                 │
                         └──────────────┬───────────────────────┘
                                        │
                                   POST /api/chat
                                  + API Key header
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     Ollama Usage Intelligence API                     │
│                                                                       │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────┐  │
│  │    Auth      │───▶│    Proxy     │───▶│     IOllamaClient       │  │
│  │  Middleware  │    │   Handler    │    │  (mock or real Ollama)  │  │
│  │             │    │              │    └─────────────────────────┘  │
│  │IAuthProvider│    │              │                                  │
│  └─────────────┘    │              │──── fire & forget ──────┐       │
│                      └──────┬───────┘                         │       │
│                             │                                 ▼       │
│                        Response to                     ┌──────────┐  │
│                          client                        │  IUsage  │  │
│                                                        │  Logger  │  │
│                                                        └────┬─────┘  │
│                                                             │        │
│                                                             ▼        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                        SQLite (Prisma)                        │    │
│  │                                                                │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │    │
│  │  │ ApiKey   │  │ UsageLog │  │  ...more  │  │  ...more     │ │    │
│  │  │          │  │          │  │  tables   │  │  tables      │ │    │
│  │  └──────────┘  └──────────┘  │(students) │  │ (students)   │ │    │
│  │                               └──────────┘  └──────────────┘ │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│            Student features read from UsageLog ──────┐               │
│                                                       ▼               │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Student Feature Endpoints                    │  │
│  │                                                                  │  │
│  │  /api/templates    /api/pricing     /api/alerts   /api/convo   │  │
│  │  /api/reports      /api/quotas      /api/alerts   /api/convo   │  │
│  │                                     /status       /search      │  │
│  └────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.2 Dependency Direction

```
Routes ──▶ Services ──▶ Repositories ──▶ Prisma Client ──▶ SQLite
              │
              │ depends on abstractions (interfaces)
              │ NOT on concrete implementations
              ▼
       ┌──────────────┐
       │  Interfaces   │
       │               │
       │ IOllamaClient │◀─── MockOllamaClient (test)
       │               │◀─── RealOllamaClient (prod)
       │               │
       │ IUsageLogger  │◀─── UsageLoggerService
       │               │
       │ IAuthProvider │◀─── ApiKeyAuthProvider
       │               │
       │ IUsageRepo    │◀─── PrismaUsageRepository
       └──────────────┘
```

Key insight for students: designing the app so Ollama is behind an interface is not a theoretical exercise — it's what lets you TDD the entire application without a running Ollama instance. This is dependency inversion in practice.

---

## 3. Foundation — Pre-Session Build (80%)

_This is what you build and screen-record before Session 1. Students receive this recording as supplementary material — they can watch it before Session 1 for context, or after the workshop to rewind and digest the full methodology at their own pace. The recording demonstrates the 5-phase methodology applied to the core architectural decisions._

### 3.1 Core Interfaces

**IOllamaClient** — Abstracts communication with Ollama. One method: accepts a chat request (model name, messages array), returns a chat response (message content, token counts). The mock implementation returns realistic fake responses with configurable token counts and simulated latency. The real implementation calls Ollama's HTTP API. This interface is what makes the entire application testable without a running Ollama instance.

**IAuthProvider** — Abstracts API key validation. Accepts a key string, returns user information (user ID, name) if valid, null if not. A second method creates new API keys for a given user. The middleware calls this on every request and attaches user context for downstream use.

### 3.2 Prisma Models

**ApiKey** — Stores API keys with associated user ID, user name, created timestamp, active status.

**UsageLog** — Stores every proxied request: user ID, model name, prompt token count, completion token count, latency in milliseconds, timestamp. This is the central data table that multiple student features will read from.

### 3.3 What the Foundation Delivers

A running Express server with:

- `POST /api/chat` — The proxy endpoint. Authenticates via API key in the request header, forwards the request to IOllamaClient (mock or real), returns the response to the client. After sending the response, fires a usage log write asynchronously (this part is deferred to the live session — see Section 4).
- Auth middleware that validates API keys via IAuthProvider and attaches user context.
- Mock Ollama client that returns realistic responses for testing.
- Prisma schema with migrations, seed data (a few test API keys, some seeded usage logs for student features to query against).
- Full test infrastructure: Jest configured for TypeScript, Testcontainers configured for repository tests, Supertest configured for API tests, test database setup/teardown utilities.
- A working vertical slice demonstrating the route → service → repository pattern with tests at each layer.

**What the foundation deliberately does NOT include:** Any feature that makes the usage data useful. The proxy logs data into a table, but nothing reads from it in a meaningful way. That gap is what the student features fill.

---

## 4. Live Class Feature — Session 1 (20%)

_This is the slice you build collaboratively with the audience during Session 1. It's chosen because it has a genuine design question the audience can debate, and the implementation is TDD-friendly._

### 4.1 Feature: Async Usage Logging

**What it does:** After the proxy forwards a request to Ollama and returns the response to the client, it logs the usage metadata (model, tokens, latency, user, timestamp) to the database. The logging happens asynchronously — the client gets their response immediately; the log write happens in the background.

**The design question for the audience:** "Should logging block the response? If the log write fails, should the client know? What are the trade-offs between sync and async logging?" This is a real architectural decision with defensible positions on both sides. The audience discusses, you guide them toward async with fire-and-forget, and then you implement it together.

```
Sync logging (rejected):

  Client ──▶ Proxy ──▶ Ollama ──▶ Proxy ──▶ Write log ──▶ Client
                                                  ↑
                                          Client waits here
                                          Log failure = client error

Async logging (chosen):

  Client ──▶ Proxy ──▶ Ollama ──▶ Proxy ──▶ Client     (fast!)
                                      │
                                      └──▶ Write log   (background)
                                            │
                                            └── failure? log it,
                                                don't crash the proxy
```

**Why it's TDD gold:** The logging service has clear inputs (a structured usage record) and a clear side effect (a row in the database). Tests can verify: a log is written with correct fields, async behavior doesn't block the response, failed log writes don't crash the proxy, concurrent requests each produce their own log entries.

**Acceptance criteria:**

- After a successful proxy request, a UsageLog record appears in the database with correct model, token counts, latency, user ID, and timestamp.
- The proxy response time is not measurably affected by the logging (async, non-blocking).
- A failed log write does not affect the proxy response — the client still gets their Ollama response.
- Each proxied request produces exactly one log entry.

---

## 5. Student Features — Session 2

_Four features, each a complete vertical slice (route → service → repository → Prisma model → tests). Students pick one. Each feature reads from or extends the foundation. Each has a genuine design question to debate during their Phase 1-2 work, and real service-layer logic that makes TDD meaningful — not just CRUD pass-through._

_Students work individually or in small groups (their choice). The methodology is the lesson, not the completion of the feature._

### Student Feature Architecture Pattern

Every student feature follows the same vertical slice:

```
┌─────────────────────────────────────────────────┐
│              Student Feature (e.g. Cost)         │
│                                                   │
│  costRoutes.ts                                    │
│       │                                           │
│       ▼                                           │
│  CostService.ts                                   │
│       │         │                                 │
│       ▼         ▼                                 │
│  IPricingRepo  IUsageRepo ◀── (from foundation)  │
│       │                                           │
│       ▼                                           │
│  PrismaPricingRepository.ts                       │
│       │                                           │
│       ▼                                           │
│  schema.prisma (new model: ModelPricing)          │
│                                                   │
│  CostService.test.ts            (unit)            │
│  PricingRepo.test.ts            (integration)     │
│  costs.test.ts                  (API)             │
└─────────────────────────────────────────────────┘
```

---

### 5.1 Feature: Prompt Templates with Variable Substitution

**What it does:** Users save reusable prompt templates with `{{variable}}` placeholders. They can browse, search, and manage their templates. The key capability: executing a template by providing variable values, which renders the final prompt and sends it through the proxy to Ollama.

**Endpoints:**

- `POST /api/templates` — Create a new template (name, content with `{{variables}}`, description, model hint)
- `GET /api/templates` — List templates with search by name or content keyword
- `GET /api/templates/:id` — Get template detail including extracted variable names
- `PUT /api/templates/:id` — Update a template
- `DELETE /api/templates/:id` — Remove a template
- `POST /api/templates/:id/execute` — Render the template with provided variables and send to Ollama via the proxy

**The design question:** The execute endpoint needs IOllamaClient — the same interface the proxy uses. Should the template service call the proxy endpoint internally (HTTP call to self), or should it depend directly on IOllamaClient? Both are architecturally defensible; the choice reveals how students think about coupling and reuse.

**What makes it TDD-friendly:** The `render` method is a pure function — parse template string, extract variable names, validate all required variables are provided, substitute values, handle edge cases (missing variables, extra variables, empty values, nested braces). This is unit test heaven: clear inputs, clear outputs, lots of edge cases to cover.

**Prisma model:** PromptTemplate — name, content, description, modelHint (optional), userId, createdAt, updatedAt.

---

### 5.2 Feature: Cost Tracking & Reporting

**What it does:** Administrators configure per-model token pricing (what it would cost if you were using a paid API). The system then calculates actual costs from the usage logs — letting teams understand the true economic value of their local Ollama usage.

**Endpoints:**

- `POST /api/pricing` — Set pricing for a model (cost per prompt token, cost per completion token, currency, effective date)
- `GET /api/pricing` — List all pricing configurations
- `PUT /api/pricing/:id` — Update pricing
- `DELETE /api/pricing/:id` — Remove pricing
- `GET /api/reports/costs` — Calculate costs from usage logs joined with pricing config. Filters: date range, model, user. Returns: total cost, cost breakdown by model, cost breakdown by user.

**The design question:** A model's pricing can change over time (effective date). When calculating historical costs, do you use the pricing that was active at the time of each request, or the current pricing? This is a real business logic decision that affects the query complexity and the test scenarios.

**What makes it TDD-friendly:** The cost calculation service has genuine business logic — joining two data sources (usage logs + pricing config), applying date-based pricing rules, aggregating across multiple dimensions. Test scenarios: model with pricing vs model without pricing (what do you return?), date range filtering, pricing change mid-period, zero usage, multiple models with different pricing.

**Prisma model:** ModelPricing — modelName, costPerPromptToken (Decimal), costPerCompletionToken (Decimal), currency, effectiveDate, createdAt.

---

### 5.3 Feature: Usage Alerts & Thresholds

**What it does:** Users configure alert rules — token limits per day or per month, for themselves or for specific models. The system evaluates these rules against actual usage and reports which thresholds have been breached.

**Endpoints:**

- `POST /api/alerts` — Create an alert rule (scope: user or model, metric: daily or monthly tokens, threshold value, alert percentage trigger)
- `GET /api/alerts` — List all alert rules
- `PUT /api/alerts/:id` — Update a rule
- `DELETE /api/alerts/:id` — Remove a rule
- `GET /api/alerts/status` — Evaluate all active rules against current usage and return status for each (current usage, threshold, percentage consumed, breached or not)

**The design question:** The status endpoint is read-heavy and potentially expensive — it queries usage logs for every active rule. Should results be cached? Should evaluation happen on-demand (every GET) or on a schedule with results stored? For the workshop scope, on-demand is fine — but the discussion reveals how students think about performance trade-offs.

**What makes it TDD-friendly:** The `evaluateAlerts` method has branching logic — check current period (daily resets at midnight, monthly resets on the 1st), sum token usage within that period, compare against threshold, calculate percentage, flag if breached. Test scenarios: under limit, exactly at threshold, over limit, no usage data for the period, multiple rules for the same user, inactive rules skipped.

**Prisma model:** AlertRule — scope (user/model), scopeValue (user ID or model name), metric (daily/monthly), tokenThreshold, alertPercentage (Decimal), isActive, createdAt, updatedAt.

---

### 5.4 Feature: Conversation History with Search

**What it does:** The system stores full conversation exchanges (prompt and response) from proxied chat requests, allowing users to browse, search, and review their past interactions with Ollama.

**Endpoints:**

- `POST /api/conversations` — Save a conversation (messages array, model used, user ID, total tokens)
- `GET /api/conversations` — List conversations with filters: keyword search across message content, model filter, date range, user filter. Paginated.
- `GET /api/conversations/:id` — Full conversation detail with all messages
- `DELETE /api/conversations/:id` — Remove a conversation

**The design question:** Should saving conversations be automatic (the proxy saves every exchange) or explicit (a separate API call)? Automatic is convenient but raises privacy concerns — users might not want every interaction stored. Explicit is opt-in but requires client changes. The group has to make an architectural decision during their Phase 2 and defend it during the regroup.

**What makes it TDD-friendly:** The search/filter service has query-building logic — combining optional filters (keyword, model, date range, user), keyword matching across message content, ordering by recency, pagination with offset/limit. Tests cover: search with no results, keyword match in prompt vs response, model filter, combined filters, pagination edge cases (first page, last page, empty page).

**Prisma models:**

- Conversation — model, userId, totalTokens, createdAt
- Message — conversationId, role (user/assistant), content, tokenCount, ordering index

---

## 6. Seed Data Requirements

The base repo includes seed data so student features have something to query against from the start:

- 3-4 API keys for test users
- 50-100 usage log entries spread across multiple models, users, and dates (at least 2 weeks of simulated history)
- At least 2 different model names in the logs (e.g., "llama3", "mistral")
- Varied token counts and latencies to make analytics interesting

---

## 7. What "Done" Looks Like

**For the foundation:** A student can clone the repo, run `npm install`, run `npx prisma migrate dev`, run `npm test` and see all tests pass, and run `npm run dev` and hit the proxy endpoint with a test API key.

**For each student feature:** The interface is defined. At least 3-4 meaningful tests are written and passing. The endpoints return correct responses for the happy path. The service layer has real logic, not just pass-through. The student can explain the design decision they made and why.

**For the workshop overall:** Students walk away having experienced the full 5-phase methodology on a real feature, seen how dependency inversion enables testing, and felt the difference between disciplined agentic development and vague prompting.

---

## 8. Workshop Delivery Structure

### Pre-Session Materials (supplementary — not mandatory homework)

- Anti-demo video (under 10 minutes): vague prompt chaos, dissecting what went wrong
- Base build recording: building the 80% foundation using the 5-phase methodology with Claude Code, framework explained as it's applied

_Students can watch before Session 1 for context, or after the workshop to rewind and digest at their own pace._

### Session 1 — Friday April 3, 8:00 PM Bangladesh Time (2 hours)

```
8:00 ─ 8:10  Welcome + orient in the codebase
8:10 ─ 8:20  Walk through base architecture (folder structure, interfaces, patterns)
8:20 ─ 9:10  Live 20%: async usage logging built collaboratively
             ├── Design question: sync vs async logging (audience debate)
             ├── Phase 3: task decomposition with acceptance criteria (audience input)
             └── Phase 4: TDD with Claude Code (audience suggests prompts)
9:10 ─ 9:15  Break
9:15 ─ 9:45  Introduce 4 student features (scope, design question, what to build)
9:45 ─ 9:55  Q&A
9:55 ─ 10:00 Group formation (optional), assign repo, Claude Code reminder, close
```

### Between Sessions (one night gap)

- Students pick a feature and optionally begin working (individual or small group)
- Keen students can run Phases 1-3 ahead of time

### Session 2 — Saturday April 4, 8:00 PM Bangladesh Time (2 hours)

```
8:00 ─ 8:10  Recap, confirm feature picks, any overnight questions
8:10 ─ 8:30  Phases 1-3 for their feature (requirements, architecture, task breakdown)
8:30 ─ 8:35  Break
8:35 ─ 9:15  Implementation sprint: Phase 4 (TDD with Claude Code) — 40 min
9:15 ─ 9:25  Phase 5: PR review, ts-check, self-review
9:25 ─ 9:50  Regroup: present interface, show best test, share design decision
9:50 ─ 10:00 Closing: takeaways, feedback form, Cohort 2 seeds
```

---

_End of PRD_
