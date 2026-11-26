-- College-email verification: allow a signed-in user to record an APPROVED
-- email-method verification for themselves, but only when the stored
-- email_hash equals the SHA-256 of their own verified login email.
--
-- Why: the /verify flow sends a Supabase email OTP to the college address.
-- After verifyOtp succeeds, the session user IS the owner of that college
-- email, so the server action inserts the approved verification. The policy
-- below makes it impossible to approve a verification for an email the caller
-- does not actually own (the hash must match their own auth email), and
-- method = 'email' keeps the manual ID-fallback flow moderator-only.
--
-- ID-fallback requests still enter as status = 'pending' and are approved by
-- moderators through the server-only service key, as before.

create or replace function public.own_login_email_hash()
returns text
language sql
stable
security definer
set search_path = public
as $$
  -- Postgres built-in sha256 (no extension dependency)
  select encode(sha256(convert_to(u.email, 'UTF8')), 'hex')
  from auth.users u
  where u.id = auth.uid()
$$;

revoke execute on function public.own_login_email_hash() from anon;
grant execute on function public.own_login_email_hash() to authenticated;

drop policy verifications_insert_own_pending on public.verifications;

create policy verifications_insert_own on public.verifications
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      status = 'pending'
      or (
        status = 'approved'
        and method = 'email'
        and email_hash = public.own_login_email_hash()
      )
    )
  );
