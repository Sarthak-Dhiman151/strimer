# Deploy: staging (and production) setup

This guide turns the app from local-only into a hosted staging environment. Budget ~30 minutes; steps marked **(you)** need the Supabase/Vercel/Resend dashboards, everything else is done in the repo.

## 1. Supabase staging project

1. **(you)** Create a project at supabase.com (name it `strimer-staging`). Note the **database password** and, from Project Settings → API: the **project URL**, **anon key**, **service role key** (server-only, never into the client bundle or git).
2. Link the CLI and push the migrations:
   ```bash
   npx supabase@3.4.0 link --project-ref <ref>
   npx supabase@3.4.0 db push          # applies supabase/migrations/*.sql in order
   ```
3. Seed staging with the fake data (safe — `.example` domains, fictional users):
   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/seed.sql
   ```
   (`supabase db reset` is local-only; hosted seeding runs the same seed.sql through `psql` or the dashboard SQL editor.)
4. **(you)** Auth settings (Authentication → URL Configuration): set Site URL to the staging Vercel URL (below) and add `https://<staging-domain>/**` to redirect URLs.
5. **(you)** Email (Authentication → SMTP): enable custom SMTP with **Resend** credentials (step 3) so OTP emails come from your domain instead of Supabase's limited built-in sender.

## 2. Vercel

1. **(you)** Import the GitHub repo into Vercel; framework preset detects Next.js automatically.
2. Environment variables (Project → Settings → Environment Variables) — set for **Preview** and **Production**:

   | Name                                                      | Value                                                                  |
   | --------------------------------------------------------- | ---------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`                                | staging project URL                                                    |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`                           | staging anon key                                                       |
   | `SUPABASE_SERVICE_ROLE_KEY`                               | staging service key (server-only; used later by moderation/admin code) |
   | `RESEND_API_KEY`                                          | from step 3                                                            |
   | `EMAIL_FROM`                                              | e.g. `Strimer <no-reply@yourdomain.com>`                               |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | when Turnstile lands                                                   |

3. Every pull request gets a preview deployment; `main` deploys staging. Promotion to production is a separate Vercel project pointing at the production Supabase project — never share a database between environments.

## 3. Resend

1. **(you)** Create a Resend account, add your sending domain, and add the SPF/DKIM DNS records it shows (required for OTP deliverability — the spec calls this out for launch).
2. **(you)** Create an API key (for Vercel, step 2) and SMTP credentials (for Supabase SMTP, step 1.5).
3. App-side notification emails (replies, answers) will call Resend via the server; that code arrives with the notifications step and uses only `RESEND_API_KEY` on the server.

## 4. Verify the deployment

- Open the Vercel preview → `/colleges` shows the 5 seeded colleges; `/c/aurangpur-institute-of-technology` shows its rating (5 verified reviews in seed data), `/c/devsagar-engineering-college` shows "rating hidden" (1 review) — rule 5 working in production code paths.
- `/login` with any email: OTP arrives via Resend; sign in and the header shows your handle.
- `/verify`: pick a college, use an address on its `email_domains` list, confirm the code, land on the profile with the badge. A foreign domain must be rejected with the "not an accepted domain" error.

## 5. After first deploy (checklist)

- [ ] Turn on Supabase backups (staging) and confirm a restore works before production exists.
- [ ] Add branch protection on `main` (PR required + the CI checks — now including the `pull_request` trigger, which works once this workflow file is on `main`).
- [ ] Point Sentry and an uptime check at the home page and one college page (monitoring step).
- [ ] Never run SQL by hand against staging/production for schema changes — migrations only, staging first, backup before production migrations.

## Legal decisions to confirm with a lawyer before public beta

- **Minors are allowed on the platform** (team decision). DPDP Act 2023 applies stricter consent/notice rules for under-18 users: confirm the verifiable-parental-consent mechanics required, keep data minimisation (we collect only handles + hashed college emails — no names, birthdates or phone numbers), and reflect it in the Privacy Policy and Terms.
- Defamation/takedown/appeal process and the IT Rules 2021 grievance-officer publication (see spec's trust & legal section).
- Source-and-date labelling for pre-filled college facts.
