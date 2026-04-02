# TASK: Dev Tooling — TypeScript Config Fix, ESLint, Prettier, Husky

> **Date:** 2026-03-29
> **Feature:** F1 — Scaffolding & Core Interfaces
> **Effort:** s
> **Priority:** high
> **Depends on:** F1-T1-project-scaffolding.md
> **Plan source:** Direct brief (completes unfinished F1 scaffolding work)

## Description

Fix the TS2591 error caused by `jest.config.ts` and `prisma/seed.ts` being excluded from the TypeScript project, then set up ESLint (recommended TypeScript rules), Prettier, and Husky + lint-staged pre-commit hooks. After this task, all IDE type errors are resolved, `npm run lint` and `npm run format:check` pass, and every commit is automatically linted and formatted.

## Test Plan

### Test File(s)

- No dedicated test files — verification is via toolchain commands.

### Verification Scenarios

#### TypeScript Config Split

- **typecheck passes for all files** — GIVEN the new `tsconfig.json` covers all `.ts` files WHEN `npx tsc --noEmit` runs THEN it exits with 0 errors (including `jest.config.ts` and `prisma/seed.ts`)
- **build compiles only src/** — GIVEN `tsconfig.build.json` restricts to `src/**/*` WHEN `npm run build` runs THEN output appears in `dist/` and does NOT contain `jest.config.js` or `prisma/seed.js`
- **IDE resolves Node globals outside src/** — GIVEN `jest.config.ts` and `prisma/seed.ts` are now in the TS project WHEN opened in the IDE THEN no red squiggles on `module`, `require`, `process`, or jest types

#### ESLint

- **lint runs cleanly** — GIVEN ESLint is configured with TypeScript recommended rules WHEN `npm run lint` runs THEN it exits with 0 errors on all source files
- **lint catches real issues** — GIVEN an intentional unused variable is introduced WHEN `npm run lint` runs THEN it reports `@typescript-eslint/no-unused-vars`

#### Prettier

- **format check passes** — GIVEN Prettier config matches existing code style (double quotes, semis, 2-space indent) WHEN `npm run format:check` runs THEN it exits cleanly (or after a one-time `npm run format` to normalize long lines)
- **format rewrites long lines** — GIVEN `errorHandler.ts` has lines over 100 chars WHEN `npm run format` runs THEN those lines are wrapped AND `npm test` still passes

#### Existing Tests

- **no regressions** — GIVEN all config changes are applied WHEN `npm test` runs THEN all existing tests pass

#### Pre-commit Hook

- **blocks dirty commits** — GIVEN a staged `.ts` file with a lint error WHEN `git commit` runs THEN lint-staged blocks the commit with an error message
- **passes clean commits** — GIVEN all staged files pass lint and format WHEN `git commit` runs THEN the commit succeeds

## Implementation Notes

- **Layer(s):** Project root configuration files
- **Pattern reference:** Existing `tsconfig.json`, `jest.config.ts`, `package.json`
- **Key decisions:**
  - Split `tsconfig.json` into IDE config (all files) + `tsconfig.build.json` (src-only compilation) — `"rootDir"`, `"outDir"`, `"declaration"`, `"declarationMap"` move to build config only
  - ESLint flat config format (`eslint.config.mjs`) using `typescript-eslint` recommended + `eslint-config-prettier`
  - Prettier config matches existing code style: `"semi": true`, `"singleQuote": false`, `"tabWidth": 2`, `"printWidth": 100`, `"trailingComma": "all"`
  - `prisma/seed.ts:99` `require.main === module` gets an inline `// eslint-disable-next-line` for `@typescript-eslint/no-require-imports` — standard Node.js entry-point idiom
  - Build script changes to `tsc -p tsconfig.build.json`; typecheck keeps `tsc --noEmit` (uses root tsconfig)
- **Libraries to install:** `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `prettier`, `husky`, `lint-staged`

## Scope Boundaries

- Do NOT add any linting rules beyond the TypeScript ESLint recommended set
- Do NOT refactor existing code to satisfy lint rules — only auto-fixable issues (formatting, import order) should be corrected
- Do NOT add CI/CD pipeline integration (that's a separate concern)
- Do NOT change any runtime behavior — this is purely tooling/config
- Only touch source files if Prettier reformats them (expected: long lines in `errorHandler.ts`)

## Files Expected

**New files:**

- `tsconfig.build.json` — build-only TypeScript config extending root
- `eslint.config.mjs` — ESLint flat config with TS recommended + Prettier
- `.prettierrc` — Prettier options matching existing code style
- `.prettierignore` — excludes `dist/` and `node_modules/`
- `.husky/pre-commit` — runs `npx lint-staged`

**Modified files:**

- `tsconfig.json` — remove `rootDir`, `outDir`, `declaration`, `declarationMap`, broaden include to all `.ts` files
- `package.json` — add `lint`, `lint:fix`, `format`, `format:check`, `prepare` scripts; add `lint-staged` config; add devDependencies; update `build` script to use `tsconfig.build.json`
- `prisma/seed.ts` — add `// eslint-disable-next-line @typescript-eslint/no-require-imports` on line 99
- `src/middleware/errorHandler.ts` — Prettier will reformat long lines (lines 17-18, 22-23, 27-28)

**Must NOT modify:**

- `specs/` directory
- Any runtime logic (error classes, app.ts, server.ts, clients, interfaces, repositories)
- Test files (beyond auto-formatting if needed)

## TDD Sequence

Not applicable — this is a configuration task with no unit tests. Execute steps in this order:

1. Split `tsconfig.json` → `tsconfig.json` (IDE) + `tsconfig.build.json` (compilation)
2. Update `package.json` build/typecheck scripts → verify `npm run build` and `npx tsc --noEmit` still work
3. Install ESLint + Prettier packages
4. Create `eslint.config.mjs` + `.prettierrc` + `.prettierignore`
5. Add lint/format scripts to `package.json` → verify `npm run lint` and `npm run format:check`
6. Run `npm run format` to normalize existing code
7. Add eslint-disable comment to `prisma/seed.ts`
8. Install and initialize Husky + lint-staged → verify pre-commit hook
9. Run `npm test` to confirm no regressions

---

_Generated from: Direct brief (TS errors + missing linting infrastructure)_
_Agreed with developer before writing._
_Next step: "Implement task: specs/tasks/F1-scaffolding-core-interfaces/F1-T6-dev-tooling-linting.md" using the TDD skill._
