# Feature Tracker

Status: `DONE` | `IN PROGRESS` | `NOT STARTED`

## Foundation (Pre-Session Build)

### F1: Scaffolding & Core Interfaces — DONE

- Express server with route → service → repository pattern
- Core interfaces: IOllamaClient, IAuthProvider, IUsageLogger
- Prisma schema: ApiKey, UsageLog models
- Mock Ollama client, auth middleware
- Test infrastructure: Jest, Testcontainers, Supertest
- Seed data: test API keys, usage logs
- PRD reference: Section 3

## Live Class Feature (Session 1)

### F2: Async Usage Logging — NOT STARTED

- Fire-and-forget usage log writes after proxy response
- Non-blocking: failed log writes don't affect client response
- PRD reference: Section 4

## Student Features (Session 2)

### F3: Prompt Templates with Variable Substitution — NOT STARTED

- CRUD for reusable prompt templates with `{{variable}}` placeholders
- Template rendering + execution through proxy
- Design question: call proxy endpoint vs depend on IOllamaClient directly
- PRD reference: Section 5.1

### F4: Cost Tracking & Reporting — NOT STARTED

- Per-model token pricing config + cost calculation from usage logs
- Cost reports with breakdowns by model, user, date range
- Design question: historical pricing (active-at-time vs current)
- PRD reference: Section 5.2

### F5: Usage Alerts & Thresholds — NOT STARTED

- Alert rules: daily/monthly token limits per user or model
- Status endpoint evaluates rules against current usage
- Design question: on-demand evaluation vs cached/scheduled
- PRD reference: Section 5.3

### F6: Conversation History with Search — NOT STARTED

- Store full conversation exchanges, browse/search/filter
- Keyword search, model filter, date range, pagination
- Design question: automatic vs explicit save
- PRD reference: Section 5.4
