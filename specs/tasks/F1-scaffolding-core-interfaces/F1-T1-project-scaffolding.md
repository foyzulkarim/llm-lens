# TASK: Project Scaffolding & Configuration

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F1 — Scaffolding & Core Interfaces
> **Effort:** xs
> **Priority:** critical
> **Depends on:** None
> **Plan source:** specs/plans/PLAN-F1-scaffolding-core-interfaces.md

## Description

Initialize the greenfield Node.js + TypeScript + Express project. Set up all configuration files (package.json, tsconfig, Jest, ESLint), environment variable handling, .gitignore, and the minimal Express app + server entry point. After this task, `npm install`, `npm run build`, `npm run dev`, and `npm test` all work (test suite runs with 0 tests).

## Test Plan

### Test File(s)
- No dedicated test file — this is verified by running `npm run build` and `npm test` successfully.

### Verification Scenarios

- `npm install` completes without errors
- `npx tsc --noEmit` compiles with zero errors
- `npm run build` produces output in `dist/`
- `npm test` runs Jest and reports 0 tests (no failures)
- `npm run dev` starts Express on port 3000 (or PORT env var)
- `.env.example` contains PORT, DATABASE_URL, OLLAMA_BASE_URL with defaults

## Implementation Notes

- **Layer(s):** Project root, configuration
- **Pattern reference:** None (greenfield)
- **Key decisions:**
  - TypeScript strict mode enabled
  - Express app (`app.ts`) separated from server (`server.ts`) for Supertest compatibility
  - Manual DI in `app.ts` (composition root) — no DI container
  - Environment variables via dotenv
- **Libraries:** express, typescript, ts-node, ts-jest, jest, @types/express, @types/jest, @types/node, dotenv, supertest, @types/supertest

## Scope Boundaries

- Do NOT add Prisma (that's T2)
- Do NOT add any interfaces or implementations (that's T3+)
- Do NOT add any routes or middleware beyond a basic health check placeholder
- Only set up the skeleton — package.json, tsconfig, jest.config, .env.example, .gitignore, app.ts, server.ts

## Files Expected

**New files:**
- `package.json`
- `tsconfig.json`
- `jest.config.ts`
- `.env.example`
- `.gitignore`
- `src/app.ts` — Express app creation, JSON body parser, placeholder for middleware/routes
- `src/server.ts` — imports app, listens on PORT
- `nodemon.json` or equivalent dev script config

**Modified files:** None

**Must NOT modify:**
- `specs/` directory

---
_Generated from: specs/plans/PLAN-F1-scaffolding-core-interfaces.md_
_Next step: "Implement task: specs/tasks/P1-E1-T1-project-scaffolding.md" using the TDD skill._
