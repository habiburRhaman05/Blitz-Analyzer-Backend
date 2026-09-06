# CLAUDE.md — Blitz Analyzer

## What this is
AI-powered resume/ATS analyzer SaaS. Two repos: `Blitz-Analyzer` (frontend) and
`Blitz-Analyzer-Backend` (backend). Currently converting from working prototype
to production-grade SaaS — see `PRODUCTION_PLAN.md` for the full hardening plan.

## Stack
- **Frontend:** Next.js 16, React 19, Tailwind, shadcn/ui, TanStack Query/Form,
  Zod, better-auth client
- **Backend:** Express 5, Prisma 7 (Postgres), Redis, BullMQ, better-auth,
  Groq SDK (`llama-3.3-70b-versatile`), Stripe, Cloudinary
- **Package managers:** bun (frontend dev), npm (backend)

## Conventions
- Backend modules follow `module/module.controller.ts` → `.service.ts` →
  `.route.ts` → `.validation.ts` pattern under `src/modules/`
- All responses go through `sendSuccess`/`sendError` (`utils/apiResponse.ts`)
- Async route handlers wrapped in `asyncHandler`
- Env vars are Zod-validated in `config/env.ts` — never bypass this
- Auth: better-auth session cookie is the source of truth (frontend custom
  JWT refresh system is being deprecated — see PRODUCTION_PLAN.md Phase 2)
- Credits: `CreditWallet` / `CreditTransaction` models exist; deduction logic
  is being wired in per PRODUCTION_PLAN.md Phase 1 — don't assume it's already
  enforced on AI endpoints unless that phase is marked done below

## Current status
- [ ] Phase 1 — Critical fixes (credit deduction, IDOR, security middleware)
- [ ] Phase 2 — Auth consolidation (drop custom JWT, better-auth only)
- [ ] Phase 3 — Async AI processing via BullMQ
- [ ] Phase 4 — Observability & CI
- [ ] Phase 5 — New features (post-hardening, separate plan)

*(Update the checkboxes above as phases complete — this is the fastest way
for a new session to know where things stand without re-reading everything.)*

## Working rules for this project
- This is a real production SaaS handling payments and user PII (resumes) —
  not a prototype. Treat security/data-handling issues as non-negotiable,
  not "nice to have."
- Always propose a plan before writing code for anything touching auth,
  payments, or credit logic. Wait for explicit go-ahead.
- Don't touch files outside the current phase's stated scope.
- Full architecture/security rationale lives in `PRODUCTION_PLAN.md` —
  read the relevant phase section from it when starting that phase, not
  the whole file every time.
