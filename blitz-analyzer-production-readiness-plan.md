# Blitz Analyzer — Production Readiness Plan
### Architecture · Scalability · Security (Phase 1, before new features)

Goal: এই app টাকে "portfolio project" থেকে **production-grade, scalable, secure SaaS** এ নিয়ে যাওয়া। নতুন feature Phase 2 এ — এই doc শুধু foundation।

Use করার নিয়ম: প্রতিটা Phase আলাদা branch এ করো, একটা করে Claude Code কে দাও, merge করার আগে নিজে review করো (তোমার usual architect-led workflow অনুযায়ী)। প্রতিটা Phase এর নিচে একটা "Claude Code Prompt" আছে — সেটা সরাসরি copy-paste করে দিতে পারবে, কিন্তু আগে নিজে issue গুলো পড়ে নাও যাতে review করতে পারো Claude কী করলো।

---

## Part A — Confirmed issues (found in audit)

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | `deductCredits()` implemented but never called anywhere | `analyzer.controller.ts` / `wallet.service.ts` | 🔴 Critical — revenue leak |
| 2 | No ownership check on analysis read/delete/report-generate | `analyzer.controller.ts`, `analyzer.services.ts` | 🔴 Critical — IDOR |
| 3 | helmet, hpp, rate-limiter, http logger all commented out | `middleware/index.ts` | 🔴 Critical — security |
| 4 | Two parallel auth systems (better-auth session + custom JWT refresh in Next.js `proxy.ts`) | backend `auth-middlewares.ts` + frontend `proxy.ts` | 🟠 High — architecture debt |
| 5 | `useSecureCookies: false` while cookies set `sameSite: "none"` | `lib/auth.ts` | 🟠 High — cookies can silently fail or be insecure depending on env |
| 6 | No CSRF protection despite `sameSite: none` cross-origin cookies | backend-wide | 🟠 High |
| 7 | File upload only checks mimetype, not magic bytes; no malware/PDF-bomb protection | `analyzer.route.ts` (multer config) | 🟡 Medium |
| 8 | `console.log` of `req.body`, resume text, AI output, payment payloads in production code | multiple controllers/services | 🟡 Medium — PII leakage into logs |
| 9 | CORS origins hardcoded instead of env-driven | `config/cors.ts` | 🟡 Medium |
| 10 | AI calls run synchronously inside the request/response cycle (no queue) | `analyzer.services.ts` | 🟡 Medium — scalability bottleneck |
| 11 | No dependency vulnerability scanning in CI | repo-wide | 🟡 Medium |
| 12 | Stray unauthenticated `/add-user` route calling an external n8n webhook | `app.ts` | 🟡 Medium — leftover test code |
| 13 | No request-level input size/JSON body limits set explicitly | `middleware/index.ts` | 🟢 Low |

Good news found: env vars are Zod-validated, no secrets committed, Stripe webhook signature verification + idempotency check on payment success is already correctly implemented, Prisma ORM avoids SQL injection by default.

---

## Part B — Target architecture (scalability)

Right now it's a single Express monolith + single Postgres + single Redis — that's *fine* to keep as a monolith (don't over-engineer into microservices at this stage), but it needs to become **stateless, queue-backed, and horizontally scalable**:

```
                     ┌─────────────┐
   Client (Next.js) ─┤  API GW/LB  │
                     └──────┬──────┘
                            │
                ┌───────────┴────────────┐
                │   Express API (N pods) │  ← stateless, scale horizontally
                └───────────┬────────────┘
                 ┌──────────┼──────────┐
                 │          │          │
            Postgres     Redis      BullMQ
           (sessions,   (cache,    (AI jobs, email,
            analysis,   temp        report generation
            payments)   parse       — async workers)
                         data)
```

Key architectural moves:

1. **Move AI analysis + report generation off the request thread and into BullMQ workers.** You already use BullMQ for email — extend the same pattern. Client uploads → job queued → client polls/gets a webhook/SSE update → this alone fixes serverless timeout risk, lets you rate-limit Groq usage centrally, and lets the API scale independently of AI throughput.
2. **Stateless API tier.** Sessions already live in Postgres via better-auth (good) — confirm nothing else uses in-memory state (e.g., no in-process caches) so any pod can serve any request. This is what lets you run 2+ instances behind a load balancer.
3. **Single source of truth for auth.** Drop the custom JWT refresh-token system in the Next.js middleware; standardize on better-auth sessions everywhere, refreshed via better-auth's own session refresh instead of a hand-rolled token pair. Less state to keep in sync, fewer edge-case bugs.
4. **Redis as the shared cache/session store**, not per-pod memory — already the case for analysis caching, just needs to be true everywhere once you scale to multiple pods.
5. **DB connection pooling** — with Prisma + serverless/multi-pod, use a pooler (PgBouncer or Prisma Accelerate/Neon's built-in pooler if you're on Neon) so you don't exhaust Postgres connections as pods scale.
6. **Structured logging + observability** — re-enable `pino-http`, add Sentry (or similar) for error tracking, and add basic metrics (request latency, Groq call latency/cost, queue depth) so you can actually see what's happening once real users show up.
7. **CI/CD with basic gates** — lint, type-check, `npm audit`/Snyk, and a smoke test on every PR before merge to `main`.

---

## Part C — Security hardening checklist

- [ ] Re-enable `helmet()` with an explicit CSP (don't just use defaults — you have inline scripts/EJS templates, so the CSP needs to actually reflect what you serve)
- [ ] Re-enable `hpp()` and the rate limiter; add a **separate, stricter limiter** for AI-consuming routes (`/parse-resume`, `/analysis/:id`, `/job-matcher`, `/resume/ats-optimize`) keyed by `userId`, not just IP
- [ ] Fix cookie config: `secure` must be `true` in production, consistently, everywhere `sameSite: "none"` is used (browsers reject non-secure cookies with `SameSite=None`)
- [ ] Add CSRF protection (double-submit cookie token or use better-auth's built-in CSRF handling if available) since you're doing cross-origin cookie auth
- [ ] Validate uploaded files by magic bytes (not just declared mimetype) and cap parsed text size before sending to the LLM (cost + prompt-injection surface control)
- [ ] Strip all `console.log` of request bodies / resume text / payment payloads; replace with structured, redacted logging
- [ ] Move CORS origins into `envConfig` instead of hardcoding
- [ ] Add ownership checks (`where: { id, userId }`) to every analysis read/update/delete
- [ ] Wire `deductCredits()` into every AI-consuming endpoint, with a proper 402/insufficient-credit response
- [ ] Remove the stray `/add-user` → n8n webhook route or lock it down (API key / internal-only)
- [ ] Add `npm audit --production` (or Snyk) as a CI step
- [ ] Rotate/segregate JWT & better-auth secrets between environments (dev/staging/prod)

---

## Part D — Execution phases with Claude Code prompts

Follow your usual workflow: paste the prompt, let Claude Code produce a plan/diff first, review it, then approve implementation. Do these in order — each phase assumes the previous one is merged.

### Phase 1 — Critical fixes (credits, IDOR, security middleware)

```
You are working in the Blitz Analyzer backend (Express 5 + Prisma 7 + Redis + BullMQ).

Goals for this phase, in order:

1. Wire credit deduction into every AI-consuming endpoint:
   - POST /analyzer/parse-resume
   - POST /analyzer/analysis/:id (completeAnalysesResumeResult)
   - POST /analyzer/job-matcher
   - POST /analyzer/resume/ats-optimize
   - POST /analyzer/resume/improve
   Each should check the user's CreditWallet balance BEFORE calling the LLM,
   deduct the appropriate credit cost AFTER a successful AI response, and
   return a 402-style error via the existing sendError() helper if the
   balance is insufficient. Record each deduction as a CreditTransaction
   with type USAGE and a clear `reason`. Make the credit cost per action
   configurable (e.g. a constants file), not hardcoded inline.

2. Fix IDOR on analysis records:
   - deleteAnalysis, generateReportHandler, and the DB-lookup branch of
     completeAnalysesResumeResult must all verify the analysis belongs to
     res.locals.user.id before acting. Return 404 (not 403) if it doesn't
     belong to them, to avoid leaking existence of other users' records.

3. Re-enable and properly configure security middleware in middleware/index.ts:
   - helmet() with an explicit contentSecurityPolicy reflecting what this
     app actually serves (EJS templates, no unnecessary inline scripts)
   - hpp()
   - the existing rate limiter for general routes, PLUS a new stricter
     rate limiter (keyed by authenticated userId, not just IP) applied
     only to the AI-consuming routes listed above
   - re-enable httpLogger but ensure it does not log request bodies
     containing resume text or payment data

4. Remove all console.log statements that print req.body, resume text,
   AI completions, or payment payloads across the analyzer and payment
   modules. Replace with structured logger calls (using the existing
   pino logger) at appropriate log levels, with sensitive fields redacted.

5. Remove the unauthenticated /add-user route in app.ts (the n8n webhook
   test route), or if it's still needed, gate it behind an internal API
   key check.

Do NOT touch the frontend in this phase. Do NOT change the database
schema unless strictly required for the credit transaction logging.
First show me a plan of exact files/functions you'll change and the
credit cost you'd assign per action, before writing code.
```

### Phase 2 — Auth consolidation

```
You are working across the Blitz Analyzer backend (Express + better-auth
+ Prisma) and frontend (Next.js 16, src/proxy.ts, src/lib/serverApi.ts,
src/services/auth.services.ts).

Goal: consolidate to a SINGLE auth mechanism — better-auth sessions —
and remove the parallel custom JWT access/refresh token system currently
implemented in the Next.js middleware (proxy.ts) and its supporting
services (decodeToken, getTokens, isTokenExpiringSoon, refreshTokens).

Requirements:
- The Next.js middleware should rely on the better-auth session cookie
  only, calling the backend (or better-auth's own session-check helper)
  to validate/refresh sessions instead of manually decoding a custom JWT.
- Preserve existing role-based redirects (admin/moderator/user dashboards)
  and the ACTIVE/BANNED/DELETED status checks currently done in
  auth-middlewares.ts.
- Ensure cookie config is consistent: secure=true in production wherever
  sameSite is "none", and confirm useSecureCookies in lib/auth.ts is not
  contradicting that.
- Do this as a careful, incremental refactor — first show me a plan of
  what gets removed vs kept, and flag any behavior that might change for
  existing logged-in users (e.g. do existing sessions survive the switch,
  or do all users need to re-login).
```

### Phase 3 — Async AI processing via BullMQ

```
You are working in the Blitz Analyzer backend, which already uses BullMQ
for the email queue (src/queue/emailQueue.ts, src/workers/emailWorker.ts).

Goal: move the AI analysis calls (resumeATSScan, jobMatcher, makeAtsFriendly,
applyImprovement in analyzer.services.ts) off the synchronous request path
and into a new BullMQ queue + worker, following the same pattern as the
existing email queue.

Requirements:
- New queue: analysisQueue, new worker: analysisWorker.ts
- POST /analyzer/analysis/:id should enqueue the job and return
  immediately with a job/analysis id and a "processing" status, instead
  of blocking on the Groq call
- Add a GET endpoint (or reuse the existing one) that the frontend can
  poll to check job status/result, backed by the existing Redis result
  cache pattern already in place
- Ensure credit deduction (from Phase 1) happens correctly around the
  queued job — deduct on enqueue with a refund path if the job fails, OR
  deduct on successful completion — tell me the tradeoffs of each and
  recommend one before implementing
- Handle job failures/retries gracefully (BullMQ's built-in retry with
  backoff), and surface a clear error to the user if the AI call fails
  permanently after retries

Show me the queue/job flow diagram in plain text first, then implement.
```

### Phase 4 — Observability & CI

```
You are working in the Blitz Analyzer backend and its repo-level CI config.

Goals:
1. Add Sentry (or an equivalent open-source alternative if you have a
   reason to prefer one — tell me why) for error tracking on both the
   Express backend and Next.js frontend.
2. Ensure pino-http request logging is active with redaction for
   Authorization headers, cookies, and any resume/payment body fields.
3. Add a GitHub Actions workflow (or equivalent for wherever this repo
   is hosted) that runs on every PR: typecheck, lint, `npm audit --production`
   (fail on high/critical), and a basic smoke test hitting /health.
4. Add basic app-level metrics: Groq call latency and count, BullMQ queue
   depth, request latency — expose via a simple /metrics endpoint or
   log-based dashboard, whichever fits this stack with least new
   infrastructure.

Propose the plan first, including which of these needs new paid services
vs what can be done with what's already free-tier available, since this
is a bootstrapped SaaS.
```

---



## After this: Phase 2 (new features) picks up separately

Once Parts A–D above are merged and stable, we move to the feature roadmap (cover letter generator, recruiter/B2B mode, interview prep, referral loop, etc.) discussed earlier — that's a separate plan so it doesn't get mixed into this hardening work.
