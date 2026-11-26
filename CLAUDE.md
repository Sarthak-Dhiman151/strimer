# CLAUDE.md

Working brief for AI coding agents and humans. Read this before any change. Keep it updated when a decision changes.

## Product (five lines)

A verified-student college review and community platform for Indian college aspirants.
Every college gets a product-style review page (six aspect ratings, pros/cons, verdict) written only by verified students and alumni, plus a Reddit-style community (posts, threaded comments, upvotes, Question flair with best answer).
Trust is the product: no fake reviews, no paid placement, colleges cannot edit or remove reviews.
Aspirants get structured facts and real conversations in one place; the wedge is verified students, structured ratings, and a searchable per-college question archive.
Mobile-first: design for 360 px width first. Pages are server-rendered for SEO.

## Non-negotiable rules

1. Only users with an approved verification for a college can insert a review for it. Enforced by row-level security, not app code.
2. One active review per user per college (unique partial index on active reviews).
3. Content is never hard-deleted. Content tables carry a `status` field: `visible` | `hidden` | `removed`.
4. Public identity is a pseudonymous handle. College emails are stored only as hashes and never displayed.
5. A college's average rating is hidden until it has at least 5 verified reviews.
6. Row-level security is enabled on every table and is never disabled. Never loosen a policy to make code work — stop and ask instead.
7. Secrets live only in environment variables. The Supabase service key is server-only and never ships to the client or git history.
8. All database changes go through Supabase CLI migration files. Never edit a database by hand.

## Stack

- Next.js 16 (App Router, server-rendered pages), TypeScript in strict mode
- Tailwind CSS v4, shadcn/ui (components live as source in `src/components/ui`)
- Supabase: Postgres, email OTP auth, row-level security, Storage
- Vercel hosting; Resend for email; Cloudflare Turnstile for bot protection
- Vitest for unit tests, Playwright for e2e, GitHub Actions CI
- npm is the package manager. No new dependency without asking first.

## Folder structure

```
src/app/            App Router pages (server components by default)
src/components/     App components; shadcn/ui components in src/components/ui
src/lib/            Shared helpers and Supabase clients (browser and server separated)
supabase/migrations/  Versioned SQL migrations (Supabase CLI only)
supabase/tests/     Database access-rule tests (pgTAP, three test accounts)
e2e/                Playwright tests
docs/               Project docs (the MVP spec is intentionally NOT committed; see the team doc)
```

## Commands

```bash
npm run dev          # dev server (http://localhost:3000)
npm run build        # production build
npm run lint         # ESLint (flat config)
npm run typecheck    # tsc --noEmit
npm run format       # Prettier write (Tailwind class sorting enabled)
npm run format:check # Prettier check, used in review/CI
npm run test         # Vitest unit tests (CI runs this)
npm run gen:types    # regenerate src/lib/database.types.ts from the local DB (needs Docker; run after any migration)
```

Planned (added when the step lands): `npm test` (Vitest), `npm run test:e2e` (Playwright).

Supabase: CLI runs via `npx supabase@3.4.0 <command>`; config is `supabase/config.jsonc`; migrations in `supabase/migrations/*.sql` are the only way to change the database. The sandbox has no Docker, so `supabase start` / `db reset` / `supabase test db` run in CI (ubuntu-latest), not locally.

```bash
npx supabase@3.4.0 db start   # local Postgres only (CI and dev machines with Docker)
npx supabase@3.4.0 db reset   # migrations + seed.sql
npx supabase@3.4.0 test db    # pgTAP access-rule tests (supabase/tests/*.test.sql)
```

## Working rules

1. Plan before coding: files to change, risks, tests. Wait for approval before writing code.
2. Make the smallest change that meets the task. No unrequested refactors.
3. Write tests for new logic. Database access rules are tested with three accounts: anonymous, unverified member, verified student.
4. Small commits with clear messages; pull requests under ~300 changed lines.
5. If a requirement is unclear, ask one precise question rather than guessing.
6. Before suggesting a library, check it exists and is maintained; follow the versions in package.json.

## Deviations and decisions log

- 2026-11-25: shadcn/ui is set up manually (components.json, `cn` util, Tailwind v4 theme tokens, base deps: clsx, tailwind-merge, class-variance-authority, lucide-react, tw-animate-css) because the shadcn registry is unreachable from the build sandbox. Components are vendored as source per feature step.
- 2026-11-25: System font stack instead of `next/font/google` (no network access to Google Fonts at build time; lighter pages for a mobile-first audience). If Geist is wanted, self-host via the `geist` npm package — ask first, it is a new dependency.
- 2026-11-25: The attached MVP spec PDF is deliberately not committed; its rules live here and in the team's shared doc.
- Review flow: PR #1 (step 1 scaffold) was merged to `main` on 2026-11-25. Steps 2+ land as small commits on the session branch `arena/20864b5a-strimer` and go to `main` through follow-up PRs from that branch, reviewed on GitHub.
- 2026-11-25: CI (`.github/workflows/ci.yml`) is green (lint / unit tests / build + typecheck, ~30 s). Repo quirk: `pull_request` events never fired while the workflow existed only off `main`, so a temporary `push` trigger (scoped to `main` + the session branch) kept CI running on every push until PR #2 put the workflow on `main` — resolved, see the step 5 entry below.
- 2026-11-25: Sandbox has no Docker daemon, so Supabase local stack (`supabase start`, `supabase test db`) cannot run here; pgTAP access-rule tests run in CI (ubuntu runners have Docker).
- 2026-11-25 (step 3, approved by team): Postgres enums for roles/statuses/flairs (per spec) instead of text+CHECK; `public.users` has NO email column — login email lives only in `auth.users`, college emails only as `email_hash` on `verifications` (strongest reading of the pseudonymity rule; deviates from the spec's illustrative `users.email` field).
- 2026-11-25 (step 3): `reviews.is_verified` is snapshotted from approved verifications by a trigger at insert time, so a later revocation does not rewrite review history. Moderation writes (hide/remove/ban, college edits) go through the server-only service key; end users get no policies for them. The verification trigger explicitly exempts `service_role` requests (seed/admin path) so admins and seeds can set `is_verified` directly.
- 2026-11-25 (step 3): migration validated on PGlite (Postgres 17 WASM) in a throwaway harness — 32 assertions covering all non-negotiable rules with anonymous / member / verified / service-role actors, all green. The canonical access-rule tests (pgTAP) land in step 4 and run in CI.
- 2026-11-25 (step 4): seed data is 100% fake; college email domains use the reserved `.example` TLD so no real student can verify against a seeded college. Seed sets service_role JWT claims (the sanctioned admin path) and sets `is_verified` explicitly on review inserts.
- 2026-11-25 (step 4): pgTAP suite `supabase/tests/0001_access_rules.test.sql` — 35 assertions with anonymous / member / verified-student roles, using pg_temp helpers that mirror PostgREST JWT claim passing. Validated locally on PGlite with pgTAP stubs; the real run happens in the CI `db-tests` job (`db start` → `db reset` → `test db`).
- 2026-11-25 (step 4): pgTAP gotcha — assertions called via PERFORM inside helper functions never reach the TAP output stream ("tests out of sequence"). Helpers return values (SQLSTATE, counts); every assertion is a top-level `select is(...)`. CI runs pgTAP via the `supabase/pg_prove` container; raw run logs are unreachable from the Arena sandbox, so the test step base64-annotates its output on failure for API retrieval.
- 2026-11-26 (step 5): `src/lib/database.types.ts` is GENERATED (`npm run gen:types`) from the migration schema and committed; never hand-edit it — regenerate after any migration and commit together with it. Supabase clients (`src/lib/supabase/{client,server}.ts`) use the anon key only; they are typed with the generated `Database` generic. Added the spec-mandated packages `@supabase/supabase-js` + `@supabase/ssr` (approved stack; no other deps).
- 2026-11-26 (step 5): the Arena sandbox has no Docker, so types were generated against an embedded Postgres 17 (`embedded-postgres` binaries in a throwaway /tmp dir, nothing committed) via `npx supabase@3.4.0 gen types typescript --remote=postgresql://postgres:postgres@127.0.0.1:54322/postgres --schema public`. On dev machines/CI, `npm run gen:types` (local stack) is the canonical path. The temporary CI `push` trigger was removed in this step: PR #2 proved `pull_request` events fire now that the workflow lives on `main`.
- 2026-11-26 (step 6): login is email OTP with server actions (`sendOtp`/`verifyOtp`/`signOut` in `src/app/login/actions.ts`); session refresh happens in `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`; the old convention is deprecated). UI primitives in `src/components/ui` are shadcn-style with `class-variance-authority` but deliberately WITHOUT Radix until a step needs a Radix behaviour — `Link` + `buttonVariants()` replaces `asChild`. Header/profile pages degrade gracefully when Supabase env vars are missing. Local OTP codes land in the CLI's Inbucket inbox (http://127.0.0.1:54324); Resend is wired only for hosted projects (team chose local-stack-first development).
- 2026-11-26 (step 6): Vitest added (`npm test`, CI `Unit tests` job now real). `@types/node` bumped to ^22 (create-next-app pinned ^20; Vitest 5 requires ^22+ and Node 22 is our runtime). Profiles are display-only in this step — the users table intentionally has no user-facing UPDATE policy; handle changes will need a considered policy change when built.
- 2026-11-26 (step 7): rule 5 is enforced in the UI by `ratingDisplay()` (src/lib/rating.ts, unit-tested) mirroring the DB trigger — never render an average below 5 verified reviews. Browse filters are no-JS GET forms (state / type / fee-cap presets / rating-visible); fee-range and full filter sets from the spec land with the search step. Follow buttons call a server action guarded by the `follows` RLS policies (insert own / delete own, proven in pgTAP); signed-out users are redirected to /login. "Ask a question" is rendered disabled until the community screens exist. Dynamic routes await `params`/`searchParams` INSIDE `<Suspense>` boundaries (cacheComponents) — this is the established pattern.
- 2026-11-26 (verification flow — ACCESS-RULE CHANGE, reviewed in PR #5): migration 20261126120000 replaces `verifications_insert_own_pending` with `verifications_insert_own`: a user may insert `approved` ONLY when `method='email'` and `email_hash = own_login_email_hash()` (definer function = sha256 of the CALLER's own verified login email). The /verify flow sends the OTP to the college email (domain must be in `colleges.email_domains` — enforced server-side in the action and unit-tested), and after `verifyOtp` the session user IS that email's owner, so the self-approval is cryptographically sound. Self-approving with any foreign hash is rejected (pgTAP 0002, run with `supabase test db`). ID-fallback verifications still enter `pending` and stay moderator-only. College emails are stored ONLY as `email_hash`; login email lives in `auth.users`.
- 2026-11-26 (verification flow): `verifyOtp` signs the session in as the college-email user (new or existing auth account). Cross-account merging / "add college email to my personal account" is deliberately out of MVP scope — note for product later. Handle changes remain display-only.
- 2026-11-26 (e2e): Playwright runs in CI (`e2e` job) against the local Supabase stack; the CI job mints the DOCUMENTED local dev anon key from the fixed local JWT secret (valid only against that ephemeral container — never a real project's key). Config: desktop + Pixel 7 (mobile-first). `npm run test:e2e` locally needs the FULL stack (`supabase start` — `db start` boots Postgres only and leaves the app with no API at 54321) plus a build; the webServer runs `npm start`.
- 2026-11-26 (deploy): `docs/deploy.md` is the staging/production setup guide (Supabase link + db push + hosted seeding via psql, Vercel env vars, Resend SPF/DKIM, auth redirect URLs, post-deploy checklist). Hosted schema changes: `supabase db push` — never hand SQL.
- 2026-11-25: Supabase CLI v3 uses `supabase/config.jsonc` (not `config.toml`).
