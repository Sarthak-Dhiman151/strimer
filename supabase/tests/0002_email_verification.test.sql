-- pgTAP tests for the college-email verification policy (migration 20261126120000).
-- Proves: a user can self-approve an email-method verification ONLY when the
-- stored email_hash equals the SHA-256 of their own verified login email, and
-- that the resulting badge unlocks the review gate for that college.

set search_path = public, extensions;

begin;
select plan(4);

create or replace function pg_temp.try_action(action text, who text)
returns text language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || who || '"}', true);
  execute action;
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  return null;
exception when others then
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  return sqlstate;
end $$;

create or replace function pg_temp.as_user(action text, who text)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || who || '"}', true);
  execute action;
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
exception when others then
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  raise;
end $$;

create or replace function pg_temp.count_as(action text, who text)
returns integer language plpgsql as $$
declare
  v int;
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || who || '"}', true);
  execute action into v;
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  return v;
exception when others then
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  raise;
end $$;

-- fixtures (service role)
insert into public.colleges (id, slug, name, city, state, type, email_domains) values
  ('ccc00000-0000-4000-8000-00000000cc03', 'taptest-college-three', 'TapTest College Three', 'Tapville', 'Teststate', 'government', '{taptest3.example}');

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaa00000-0000-4000-8000-0000000000a7', 'tu7@taptest.example', '{}'), -- will verify for cc03
  ('aaa00000-0000-4000-8000-0000000000a8', 'tu8@taptest.example', '{}'); -- attacker

-- 1: an approved insert with a hash that does NOT match the caller's login email is rejected
select is(pg_temp.try_action($ta$
  insert into public.verifications (user_id, college_id, kind, method, email_hash, status)
  values ('aaa00000-0000-4000-8000-0000000000a7', 'ccc00000-0000-4000-8000-00000000cc03', 'student', 'email',
    encode(sha256(convert_to('someone-else@taptest.example', 'UTF8')), 'hex'), 'approved')
$ta$, 'aaa00000-0000-4000-8000-0000000000a7'), '42501',
  'self-approval with a foreign email_hash is rejected');

-- 2: an approved insert with the hash of the CALLER'S OWN login email succeeds
select is(pg_temp.try_action($ta$
  insert into public.verifications (user_id, college_id, kind, method, email_hash, status)
  values ('aaa00000-0000-4000-8000-0000000000a7', 'ccc00000-0000-4000-8000-00000000cc03', 'student', 'email',
    public.own_login_email_hash(), 'approved')
$ta$, 'aaa00000-0000-4000-8000-0000000000a7'), null,
  'self-approval with own login-email hash succeeds');

select is(
  (select count(*)::int from public.verifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000a7' and status = 'approved'),
  1, 'approved verification row exists');

-- 3: the new badge unlocks the review gate for that college
select pg_temp.as_user($ta$
  insert into public.reviews (user_id, college_id, academics, faculty, placements, campus_hostel, campus_life, value_for_money, title, pros, cons, would_choose_again)
  values ('aaa00000-0000-4000-8000-0000000000a7', 'ccc00000-0000-4000-8000-00000000cc03', 4, 4, 4, 4, 4, 4, 'Verified via email OTP',
    'Great labs and faculty access. Hostel wifi is decent. Campus life is active with many clubs and fests through the year.',
    'Placement season is stressful. Administration can be slow with paperwork and hostel allotment takes a while.',
    true)
$ta$, 'aaa00000-0000-4000-8000-0000000000a7');

select is(
  pg_temp.count_as('select count(*)::int from public.reviews where college_id = ''ccc00000-0000-4000-8000-00000000cc03''',
    'aaa00000-0000-4000-8000-0000000000a7'),
  1, 'email-verified user can review their college');

select * from finish();
rollback;
