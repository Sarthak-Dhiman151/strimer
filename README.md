# Strimer — verified student reviews and communities for Indian colleges

College review + community platform: product-style reviews from verified students and alumni, Reddit-style communities per college. Trust is the product: no fake reviews, no paid placement.

**Working agreement for AI agents and contributors: see [CLAUDE.md](./CLAUDE.md).**

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase, Resend and Turnstile values
npm run dev                  # http://localhost:3000
```

Requires Node.js 22+.

## Commands

| Command                       | What it does                               |
| ----------------------------- | ------------------------------------------ |
| `npm run dev`                 | Dev server at http://localhost:3000        |
| `npm run build`               | Production build                           |
| `npm run lint`                | ESLint (flat config)                       |
| `npm run typecheck`           | TypeScript, strict mode, no emit           |
| `npm run format`              | Prettier write (Tailwind sorting)          |
| `npm run format:check`        | Prettier check                             |
| `npm run test`                | Vitest unit tests                          |
| `npx supabase@3.4.0 db reset` | Local DB: migrations + seed (needs Docker) |
| `npx supabase@3.4.0 test db`  | pgTAP access-rule tests (needs Docker)     |

Unit tests (Vitest) and e2e (Playwright) are added as their steps land — see CLAUDE.md. Database access-rule tests run in CI on every PR.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres, email OTP, row-level security, Storage) · Vercel · Resend · Cloudflare Turnstile · Vitest · Playwright · GitHub Actions.
