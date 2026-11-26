-- pgTAP access-rule tests for Strimer.
-- Run with `supabase test db` (CI: db-tests job) after `supabase db start` + `db reset`.
-- Three roles are exercised, per the spec:
--   anonymous  — read-only public data
--   authenticated member — can post/comment/vote, cannot review or moderate
--   authenticated verified student — can review only their verified college
-- Fixtures are created inside the transaction and rolled back; independent of seed data.
--
-- NOTE: every assertion is a top-level `select is(...)`. pgTAP does not emit
-- TAP lines for assertions called via PERFORM inside helper functions — helpers
-- below RETURN values (e.g. the observed SQLSTATE) and the caller asserts.

set search_path = public, extensions;

begin;
select plan(35);

-- ── Fixture ids (hex-only) ──────────────────────────────────────────────────
-- users a1..a6 = aaa00000-0000-4000-8000-0000000000a1 .. 00a6
-- colleges cc1..cc2 = ccc00000-0000-4000-8000-00000000cc01 .. cc02
-- posts d1..d2 = ddd00000-0000-4000-8000-0000000000d1 .. 00d2
-- comment e1 = eee00000-0000-4000-8000-0000000000e1
-- notification b1 = bbb00000-0000-4000-8000-0000000000b1

-- ── helpers: run SQL as another role, mirroring PostgREST JWT claims ────────

-- Runs `action` as role `who` ('anon' or an auth user id). Returns the
-- SQLSTATE of the error it raised, or NULL if it succeeded.
create or replace function pg_temp.try_action(action text, who text)
returns text language plpgsql as $$
begin
  if who = 'anon' then
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  else
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || who || '"}', true);
  end if;
  execute action;
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  return null;
exception when others then
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  return sqlstate;
end $$;

-- Runs `action` as an authenticated user; raises on error (fixture setup).
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

-- Runs a `select ...` as an authenticated user and returns the first column.
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

-- reset helper role state back to service before fixture work
select set_config('role', 'postgres', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- ── fixtures (service role; rolled back at the end) ────────────────────────
insert into public.colleges (id, slug, name, city, state, type, email_domains) values
  ('ccc00000-0000-4000-8000-00000000cc01', 'taptest-college-one', 'TapTest College One', 'Tapville', 'Teststate', 'government', '{taptest1.example}'),
  ('ccc00000-0000-4000-8000-00000000cc02', 'taptest-college-two', 'TapTest College Two', 'Tapville', 'Teststate', 'private', '{taptest2.example}');

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaa00000-0000-4000-8000-0000000000a1', 'tu1@taptest.example', '{}'), -- member, never verified
  ('aaa00000-0000-4000-8000-0000000000a2', 'tu2@taptest.example', '{}'), -- verified for cc1
  ('aaa00000-0000-4000-8000-0000000000a3', 'tu3@taptest.example', '{}'), -- verified for cc1
  ('aaa00000-0000-4000-8000-0000000000a4', 'tu4@taptest.example', '{}'), -- verified for cc1
  ('aaa00000-0000-4000-8000-0000000000a5', 'tu5@taptest.example', '{}'), -- verified for cc1
  ('aaa00000-0000-4000-8000-0000000000a6', 'tu6@taptest.example', '{}'); -- verified for cc1

insert into public.verifications (user_id, college_id, kind, method, branch, batch_year, email_hash, status, verified_at) values
  ('aaa00000-0000-4000-8000-0000000000a2', 'ccc00000-0000-4000-8000-00000000cc01', 'student', 'email', 'CSE', 2025, md5('tap:2') || md5('salt:2'), 'approved', now()),
  ('aaa00000-0000-4000-8000-0000000000a3', 'ccc00000-0000-4000-8000-00000000cc01', 'student', 'email', 'CSE', 2025, md5('tap:3') || md5('salt:3'), 'approved', now()),
  ('aaa00000-0000-4000-8000-0000000000a4', 'ccc00000-0000-4000-8000-00000000cc01', 'student', 'email', 'CSE', 2025, md5('tap:4') || md5('salt:4'), 'approved', now()),
  ('aaa00000-0000-4000-8000-0000000000a5', 'ccc00000-0000-4000-8000-00000000cc01', 'student', 'email', 'CSE', 2025, md5('tap:5') || md5('salt:5'), 'approved', now()),
  ('aaa00000-0000-4000-8000-0000000000a6', 'ccc00000-0000-4000-8000-00000000cc01', 'student', 'email', 'CSE', 2025, md5('tap:6') || md5('salt:6'), 'approved', now());

-- ── structure ───────────────────────────────────────────────────────────────
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity),
  12, 'row-level security is enabled on every public table');

select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'mod_actions'),
  0, 'mod_actions has no policies (deny by default to end users)');

-- ── rule 1: the verification gate ───────────────────────────────────────────
select is(pg_temp.try_action($ta$
  insert into public.reviews (user_id, college_id, academics, faculty, placements, campus_hostel, campus_life, value_for_money, title, pros, cons, would_choose_again)
  values ('aaa00000-0000-4000-8000-0000000000a1', 'ccc00000-0000-4000-8000-00000000cc01', 4, 4, 4, 4, 4, 4, 'Unverified attempt',
    'Great labs and faculty access. Hostel wifi is decent. Campus life is active with many clubs and fests through the year.',
    'Placement season is stressful. Administration can be slow with paperwork and hostel allotment takes a while.',
    true)
$ta$, 'aaa00000-0000-4000-8000-0000000000a1'), '42501',
  'unverified member cannot insert a review');

select is(pg_temp.try_action($ta$
  insert into public.placement_reports (user_id, college_id, branch, year, median_lpa, offers_count)
  values ('aaa00000-0000-4000-8000-0000000000a1', 'ccc00000-0000-4000-8000-00000000cc01', 'CSE', 2025, 18.5, 120)
$ta$, 'aaa00000-0000-4000-8000-0000000000a1'), '42501',
  'unverified member cannot insert a placement report');

select is(pg_temp.try_action($ta$
  insert into public.reviews (user_id, college_id, academics, faculty, placements, campus_hostel, campus_life, value_for_money, title, pros, cons, would_choose_again)
  values ('aaa00000-0000-4000-8000-0000000000a2', 'ccc00000-0000-4000-8000-00000000cc02', 4, 4, 4, 4, 4, 4, 'Wrong college attempt',
    'Great labs and faculty access. Hostel wifi is decent. Campus life is active with many clubs and fests through the year.',
    'Placement season is stressful. Administration can be slow with paperwork and hostel allotment takes a while.',
    true)
$ta$, 'aaa00000-0000-4000-8000-0000000000a2'), '42501',
  'verified student cannot review a college they are not verified for');

-- ── verified review flow ────────────────────────────────────────────────────
select pg_temp.as_user($ta$
  insert into public.reviews (user_id, college_id, academics, faculty, placements, campus_hostel, campus_life, value_for_money, title, pros, cons, would_choose_again)
  values ('aaa00000-0000-4000-8000-0000000000a2', 'ccc00000-0000-4000-8000-00000000cc01', 4, 4, 4, 4, 4, 4, 'First verified review',
    'Great labs and faculty access. Hostel wifi is decent. Campus life is active with many clubs and fests through the year.',
    'Placement season is stressful. Administration can be slow with paperwork and hostel allotment takes a while.',
    true)
$ta$, 'aaa00000-0000-4000-8000-0000000000a2');

select is(
  (select count(*)::int from public.reviews where user_id = 'aaa00000-0000-4000-8000-0000000000a2'),
  1, 'verified student can review their verified college');

select is(
  (select is_verified from public.reviews where user_id = 'aaa00000-0000-4000-8000-0000000000a2'),
  true, 'is_verified is snapshotted from the approved verification by trigger');

select is(pg_temp.try_action($ta$
  insert into public.reviews (user_id, college_id, academics, faculty, placements, campus_hostel, campus_life, value_for_money, title, pros, cons, would_choose_again)
  values ('aaa00000-0000-4000-8000-0000000000a2', 'ccc00000-0000-4000-8000-00000000cc01', 4, 4, 4, 4, 4, 4, 'Duplicate attempt',
    'Great labs and faculty access. Hostel wifi is decent. Campus life is active with many clubs and fests through the year.',
    'Placement season is stressful. Administration can be slow with paperwork and hostel allotment takes a while.',
    true)
$ta$, 'aaa00000-0000-4000-8000-0000000000a2'), '23505',
  'a second active review for the same college is rejected');

select is(pg_temp.try_action($ta$
  update public.reviews set status = 'hidden'
  where user_id = 'aaa00000-0000-4000-8000-0000000000a2'
$ta$, 'aaa00000-0000-4000-8000-0000000000a2'), '42501',
  'author cannot change their own review status (moderation-only)');

select pg_temp.as_user($ta$
  update public.reviews set title = 'Edited verified review'
  where user_id = 'aaa00000-0000-4000-8000-0000000000a2'
$ta$, 'aaa00000-0000-4000-8000-0000000000a2');

select is(
  (select title from public.reviews where user_id = 'aaa00000-0000-4000-8000-0000000000a2'),
  'Edited verified review', 'author can edit their own visible review');

select pg_temp.as_user($ta$
  update public.reviews set title = 'hijack attempt'
  where user_id = 'aaa00000-0000-4000-8000-0000000000a2'
$ta$, 'aaa00000-0000-4000-8000-0000000000a3');

select is(
  (select title from public.reviews where user_id = 'aaa00000-0000-4000-8000-0000000000a2'),
  'Edited verified review', 'users cannot edit other members reviews');

-- ── rule 5: average hidden until 5 verified reviews ─────────────────────────
select is(
  (select rating_cache is null from public.colleges where id = 'ccc00000-0000-4000-8000-00000000cc01'),
  true, 'average rating is hidden below 5 verified reviews');

select is(
  (select review_count from public.colleges where id = 'ccc00000-0000-4000-8000-00000000cc01'),
  1, 'review_count tracks visible verified reviews');

select pg_temp.as_user($ta$
  insert into public.reviews (user_id, college_id, academics, faculty, placements, campus_hostel, campus_life, value_for_money, title, pros, cons, would_choose_again)
  values ('aaa00000-0000-4000-8000-0000000000a3', 'ccc00000-0000-4000-8000-00000000cc01', 4, 4, 4, 4, 4, 4, 'Second review',
    'Great labs and faculty access. Hostel wifi is decent. Campus life is active with many clubs and fests through the year.',
    'Placement season is stressful. Administration can be slow with paperwork and hostel allotment takes a while.',
    true)
$ta$, 'aaa00000-0000-4000-8000-0000000000a3');

select pg_temp.as_user($ta$
  insert into public.reviews (user_id, college_id, academics, faculty, placements, campus_hostel, campus_life, value_for_money, title, pros, cons, would_choose_again)
  values ('aaa00000-0000-4000-8000-0000000000a4', 'ccc00000-0000-4000-8000-00000000cc01', 4, 4, 4, 4, 4, 4, 'Third review',
    'Great labs and faculty access. Hostel wifi is decent. Campus life is active with many clubs and fests through the year.',
    'Placement season is stressful. Administration can be slow with paperwork and hostel allotment takes a while.',
    true)
$ta$, 'aaa00000-0000-4000-8000-0000000000a4');

select pg_temp.as_user($ta$
  insert into public.reviews (user_id, college_id, academics, faculty, placements, campus_hostel, campus_life, value_for_money, title, pros, cons, would_choose_again)
  values ('aaa00000-0000-4000-8000-0000000000a5', 'ccc00000-0000-4000-8000-00000000cc01', 4, 4, 4, 4, 4, 4, 'Fourth review',
    'Great labs and faculty access. Hostel wifi is decent. Campus life is active with many clubs and fests through the year.',
    'Placement season is stressful. Administration can be slow with paperwork and hostel allotment takes a while.',
    true)
$ta$, 'aaa00000-0000-4000-8000-0000000000a5');

select pg_temp.as_user($ta$
  insert into public.reviews (user_id, college_id, academics, faculty, placements, campus_hostel, campus_life, value_for_money, title, pros, cons, would_choose_again)
  values ('aaa00000-0000-4000-8000-0000000000a6', 'ccc00000-0000-4000-8000-00000000cc01', 4, 4, 4, 4, 4, 4, 'Fifth review',
    'Great labs and faculty access. Hostel wifi is decent. Campus life is active with many clubs and fests through the year.',
    'Placement season is stressful. Administration can be slow with paperwork and hostel allotment takes a while.',
    true)
$ta$, 'aaa00000-0000-4000-8000-0000000000a6');

select is(
  (select review_count from public.colleges where id = 'ccc00000-0000-4000-8000-00000000cc01'),
  5, 'review_count reaches 5');

select is(
  (select rating_cache::text from public.colleges where id = 'ccc00000-0000-4000-8000-00000000cc01'),
  '4.00', 'average rating appears at exactly 5 verified reviews');

-- moderation: hide one review (service role; end users have no such policy)
update public.reviews set status = 'hidden'
  where user_id = 'aaa00000-0000-4000-8000-0000000000a6' and college_id = 'ccc00000-0000-4000-8000-00000000cc01';

select is(
  (select review_count from public.colleges where id = 'ccc00000-0000-4000-8000-00000000cc01'),
  4, 'hidden review drops out of aggregates');

select is(
  (select rating_cache is null from public.colleges where id = 'ccc00000-0000-4000-8000-00000000cc01'),
  true, 'average hides again below 5');

select is(
  pg_temp.count_as('select count(*)::int from public.reviews where college_id = ''ccc00000-0000-4000-8000-00000000cc01''',
    'aaa00000-0000-4000-8000-0000000000a2'),
  4, 'hidden content is not readable by ordinary users');

select is(
  pg_temp.count_as('select count(*)::int from public.reviews where user_id = ''aaa00000-0000-4000-8000-0000000000a6''',
    'aaa00000-0000-4000-8000-0000000000a6'),
  1, 'hidden content stays readable to its own author');

-- ── community: posts, comments, votes, best answer ──────────────────────────
select is(pg_temp.try_action($ta$
  insert into public.posts (college_id, user_id, title, body, flair)
  values ('ccc00000-0000-4000-8000-00000000cc01', 'aaa00000-0000-4000-8000-0000000000a1', 'anon post', 'body', 'discussion')
$ta$, 'anon'), '42501', 'anonymous users cannot insert posts');

select pg_temp.as_user($ta$
  insert into public.posts (id, college_id, user_id, title, body, flair)
  values ('ddd00000-0000-4000-8000-0000000000d1', 'ccc00000-0000-4000-8000-00000000cc01', 'aaa00000-0000-4000-8000-0000000000a1', 'How is the hostel wifi really?', 'Choosing between hostels — is the wifi usable for classes?', 'question')
$ta$, 'aaa00000-0000-4000-8000-0000000000a1');

select is(
  (select count(*)::int from public.posts where user_id = 'aaa00000-0000-4000-8000-0000000000a1'),
  1, 'member can post a question');

select pg_temp.as_user($ta$
  insert into public.comments (id, post_id, user_id, body, depth)
  values ('eee00000-0000-4000-8000-0000000000e1', 'ddd00000-0000-4000-8000-0000000000d1', 'aaa00000-0000-4000-8000-0000000000a2', 'Usable in the library, flaky in the wings at night.', 0)
$ta$, 'aaa00000-0000-4000-8000-0000000000a2');

select is(
  (select comment_count from public.posts where id = 'ddd00000-0000-4000-8000-0000000000d1'),
  1, 'comment_count is maintained by trigger');

select is(pg_temp.try_action($ta$
  insert into public.comments (post_id, user_id, body, depth)
  values ('ddd00000-0000-4000-8000-0000000000d1', 'aaa00000-0000-4000-8000-0000000000a1', 'too deep', 5)
$ta$, 'aaa00000-0000-4000-8000-0000000000a1'), '23514',
  'comment depth is capped at 4');

select pg_temp.as_user($ta$
  insert into public.votes (user_id, target_type, target_id)
  values ('aaa00000-0000-4000-8000-0000000000a2', 'post', 'ddd00000-0000-4000-8000-0000000000d1')
$ta$, 'aaa00000-0000-4000-8000-0000000000a2');

select is(
  (select score from public.posts where id = 'ddd00000-0000-4000-8000-0000000000d1'),
  1, 'post score is maintained by the vote trigger');

select is(
  (select karma from public.users where id = 'aaa00000-0000-4000-8000-0000000000a1'),
  1, 'karma equals upvotes received');

select is(pg_temp.try_action($ta$
  insert into public.votes (user_id, target_type, target_id, value)
  values ('aaa00000-0000-4000-8000-0000000000a1', 'post', 'ddd00000-0000-4000-8000-0000000000d1', -1)
$ta$, 'aaa00000-0000-4000-8000-0000000000a1'), '42501',
  'downvotes are blocked (upvote-only MVP)');

select pg_temp.as_user($ta$
  update public.posts set accepted_comment_id = 'eee00000-0000-4000-8000-0000000000e1'
  where id = 'ddd00000-0000-4000-8000-0000000000d1'
$ta$, 'aaa00000-0000-4000-8000-0000000000a1');

select is(
  (select accepted_comment_id = 'eee00000-0000-4000-8000-0000000000e1' from public.posts where id = 'ddd00000-0000-4000-8000-0000000000d1'),
  true, 'asker can accept a best answer on a question post');

select pg_temp.as_user($ta$
  insert into public.posts (id, college_id, user_id, title, body, flair)
  values ('ddd00000-0000-4000-8000-0000000000d2', 'ccc00000-0000-4000-8000-00000000cc01', 'aaa00000-0000-4000-8000-0000000000a1', 'Regular discussion', 'Just chatting.', 'discussion')
$ta$, 'aaa00000-0000-4000-8000-0000000000a1');

select is(pg_temp.try_action($ta$
  update public.posts set accepted_comment_id = 'eee00000-0000-4000-8000-0000000000e1'
  where id = 'ddd00000-0000-4000-8000-0000000000d2'
$ta$, 'aaa00000-0000-4000-8000-0000000000a1'), '23514',
  'best answer requires the question flair');

-- ── notifications: own rows, read-marker only ───────────────────────────────
insert into public.notifications (id, user_id, type, target_type, target_id)
  values ('bbb00000-0000-4000-8000-0000000000b1', 'aaa00000-0000-4000-8000-0000000000a1', 'answer', 'post', 'ddd00000-0000-4000-8000-0000000000d1');

select is(
  pg_temp.count_as('select count(*)::int from public.notifications',
    'aaa00000-0000-4000-8000-0000000000a1'),
  1, 'user sees their own notifications');

select pg_temp.as_user($ta$
  update public.notifications set read_at = now()
  where id = 'bbb00000-0000-4000-8000-0000000000b1'
$ta$, 'aaa00000-0000-4000-8000-0000000000a1');

select is(
  (select read_at is not null from public.notifications where id = 'bbb00000-0000-4000-8000-0000000000b1'),
  true, 'user can mark a notification read');

select is(pg_temp.try_action($ta$
  update public.notifications set type = 'moderation'
  where id = 'bbb00000-0000-4000-8000-0000000000b1'
$ta$, 'aaa00000-0000-4000-8000-0000000000a1'), '42501',
  'user cannot edit notification content');

-- ── verifications: request yes, self-approve no ─────────────────────────────
select is(pg_temp.try_action($ta$
  insert into public.verifications (user_id, college_id, kind, method, email_hash, status)
  values ('aaa00000-0000-4000-8000-0000000000a1', 'ccc00000-0000-4000-8000-00000000cc01', 'student', 'email',
    md5('self') || md5('approve'), 'approved')
$ta$, 'aaa00000-0000-4000-8000-0000000000a1'), '42501',
  'user cannot self-approve a verification');

select pg_temp.as_user($ta$
  insert into public.verifications (user_id, college_id, kind, method, email_hash)
  values ('aaa00000-0000-4000-8000-0000000000a1', 'ccc00000-0000-4000-8000-00000000cc02', 'student', 'email',
    md5('self') || md5('pending'))
$ta$, 'aaa00000-0000-4000-8000-0000000000a1');

select is(
  (select count(*)::int from public.verifications where user_id = 'aaa00000-0000-4000-8000-0000000000a1' and status = 'pending'),
  1, 'member can submit a pending verification request');

-- ── mod_actions: fully invisible to end users ───────────────────────────────
select is(
  pg_temp.count_as('select count(*)::int from public.mod_actions',
    'aaa00000-0000-4000-8000-0000000000a1'),
  0, 'mod_actions audit log is not readable by end users');

select is(pg_temp.try_action($ta$
  insert into public.mod_actions (moderator_id, action, target_type, target_id)
  values ('aaa00000-0000-4000-8000-0000000000a1', 'hide', 'post', 'ddd00000-0000-4000-8000-0000000000d1')
$ta$, 'aaa00000-0000-4000-8000-0000000000a1'), '42501',
  'end users cannot write to mod_actions');

select * from finish();
rollback;
