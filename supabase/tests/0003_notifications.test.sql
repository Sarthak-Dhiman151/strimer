-- pgTAP tests for the in-app notification triggers (migration 20261128120000).
-- Proves: replies, best answers, helpful votes, verification approvals and
-- moderation events create notifications for the right recipient (never the
-- actor themself), vote notifications dedupe within the window, and the RLS
-- layer keeps every notification private + read-state owner-only. There is no
-- INSERT policy on notifications, so direct user inserts must fail.

set search_path = public, extensions;

begin;
select plan(18);

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

-- ── fixtures (service role) ──────────────────────────────────────────────────
insert into public.colleges (id, slug, name, city, state, type, email_domains) values
  ('ccc00000-0000-4000-8000-00000000cc04', 'taptest-college-four', 'TapTest College Four', 'Tapville', 'Teststate', 'government', '{taptest4.example}');

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaa00000-0000-4000-8000-0000000000b1', 'tu11@taptest.example', '{}'), -- post author
  ('aaa00000-0000-4000-8000-0000000000b2', 'tu12@taptest.example', '{}'), -- commenter
  ('aaa00000-0000-4000-8000-0000000000b3', 'tu13@taptest.example', '{}'); -- deep replier

select pg_temp.as_user($ta$
  insert into public.posts (id, college_id, user_id, title, body, flair)
  values ('60000000-0000-4000-8000-000000000b01', 'ccc00000-0000-4000-8000-00000000cc04',
    'aaa00000-0000-4000-8000-0000000000b1', 'Notification test question', 'Body of the test question.', 'question')
$ta$, 'aaa00000-0000-4000-8000-0000000000b1');

-- 1: a top-level comment on a QUESTION post notifies the asker (type answer)
select pg_temp.as_user($ta$
  insert into public.comments (id, post_id, parent_id, user_id, body, depth)
  values ('70000000-0000-4000-8000-000000000c01', '60000000-0000-4000-8000-000000000b01', null,
    'aaa00000-0000-4000-8000-0000000000b2', 'First reply from another member.', 0)
$ta$, 'aaa00000-0000-4000-8000-0000000000b2');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b1' and type = 'answer'
     and target_type = 'post' and target_id = '60000000-0000-4000-8000-000000000b01'),
  1, 'top-level answer on a question notifies the asker (answer/post)');

-- 1b: a top-level comment on a DISCUSSION post is a plain reply for the author
select pg_temp.as_user($ta$
  insert into public.posts (id, college_id, user_id, title, body, flair)
  values ('60000000-0000-4000-8000-000000000b02', 'ccc00000-0000-4000-8000-00000000cc04',
    'aaa00000-0000-4000-8000-0000000000b3', 'General discussion thread', 'Not a question.', 'discussion')
$ta$, 'aaa00000-0000-4000-8000-0000000000b3');

select pg_temp.as_user($ta$
  insert into public.comments (id, post_id, parent_id, user_id, body, depth)
  values ('70000000-0000-4000-8000-000000000c05', '60000000-0000-4000-8000-000000000b02', null,
    'aaa00000-0000-4000-8000-0000000000b2', 'Comment on the discussion post.', 0)
$ta$, 'aaa00000-0000-4000-8000-0000000000b2');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b3' and type = 'reply'
     and target_type = 'comment' and target_id = '70000000-0000-4000-8000-000000000c05'),
  1, 'top-level comment on a discussion post notifies the author (reply/comment)');

-- 2: replying to your own post does not notify yourself
select pg_temp.as_user($ta$
  insert into public.comments (id, post_id, parent_id, user_id, body, depth)
  values ('70000000-0000-4000-8000-000000000c02', '60000000-0000-4000-8000-000000000b01', null,
    'aaa00000-0000-4000-8000-0000000000b1', 'Author adding context to own post.', 0)
$ta$, 'aaa00000-0000-4000-8000-0000000000b1');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b1' and type = 'answer'),
  1, 'self-answer to own question does not notify the asker');

-- 3: replying to your own comment does not notify yourself
select pg_temp.as_user($ta$
  insert into public.comments (id, post_id, parent_id, user_id, body, depth)
  values ('70000000-0000-4000-8000-000000000c03', '60000000-0000-4000-8000-000000000b01',
    '70000000-0000-4000-8000-000000000c01', 'aaa00000-0000-4000-8000-0000000000b2',
    'Commenter extending own reply.', 1)
$ta$, 'aaa00000-0000-4000-8000-0000000000b2');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b2' and type = 'reply'),
  0, 'self-nested reply does not notify the commenter');

-- 4: a nested reply notifies the parent comment author
select pg_temp.as_user($ta$
  insert into public.comments (id, post_id, parent_id, user_id, body, depth)
  values ('70000000-0000-4000-8000-000000000c04', '60000000-0000-4000-8000-000000000b01',
    '70000000-0000-4000-8000-000000000c01', 'aaa00000-0000-4000-8000-0000000000b3',
    'Deep reply to the first comment.', 2)
$ta$, 'aaa00000-0000-4000-8000-0000000000b3');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b2' and type = 'reply'
     and target_id = '70000000-0000-4000-8000-000000000c04'),
  1, 'nested reply notifies the parent comment author');

-- 5: the asker is NOT re-notified for nested replies (those are 'reply' rows
-- for the parent-comment author; the asker only holds the answer/post row)
select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b1' and type = 'reply'),
  0, 'asker gets no reply rows for nested answers to their question');

-- 6: RLS — one member cannot read another member's notifications
select is(
  pg_temp.count_as($ta$
    select count(*)::int from public.notifications
    where user_id = 'aaa00000-0000-4000-8000-0000000000b1'
  $ta$, 'aaa00000-0000-4000-8000-0000000000b2'),
  0, 'member cannot read another member''s notifications');

-- 7: there is no INSERT policy — a direct user insert must be rejected
select is(pg_temp.try_action($ta$
  insert into public.notifications (user_id, type, target_type, target_id)
  values ('aaa00000-0000-4000-8000-0000000000b1', 'reply', 'comment',
    '70000000-0000-4000-8000-000000000c01')
$ta$, 'aaa00000-0000-4000-8000-0000000000b2'), '42501',
  'users cannot forge notifications directly (no insert policy)');

-- 8: accepting a best answer notifies the answer's author
select pg_temp.as_user($ta$
  update public.posts set accepted_comment_id = '70000000-0000-4000-8000-000000000c04'
  where id = '60000000-0000-4000-8000-000000000b01'
$ta$, 'aaa00000-0000-4000-8000-0000000000b1');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b3' and type = 'answer'
     and target_id = '70000000-0000-4000-8000-000000000c04'),
  1, 'best answer choice notifies the answer author');

-- 9: an upvote on your post notifies you
select pg_temp.as_user($ta$
  insert into public.votes (user_id, target_type, target_id)
  values ('aaa00000-0000-4000-8000-0000000000b2', 'post', '60000000-0000-4000-8000-000000000b01')
$ta$, 'aaa00000-0000-4000-8000-0000000000b2');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b1' and type = 'helpful_vote'
     and target_type = 'post' and target_id = '60000000-0000-4000-8000-000000000b01'),
  1, 'upvote on a post notifies the post author');

-- 10: re-upvoting within the dedupe window does not duplicate
select pg_temp.as_user($ta$
  delete from public.votes where user_id = 'aaa00000-0000-4000-8000-0000000000b2'
    and target_type = 'post' and target_id = '60000000-0000-4000-8000-000000000b01'
$ta$, 'aaa00000-0000-4000-8000-0000000000b2');
select pg_temp.as_user($ta$
  insert into public.votes (user_id, target_type, target_id)
  values ('aaa00000-0000-4000-8000-0000000000b2', 'post', '60000000-0000-4000-8000-000000000b01')
$ta$, 'aaa00000-0000-4000-8000-0000000000b2');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b1' and type = 'helpful_vote'
     and target_type = 'post' and target_id = '60000000-0000-4000-8000-000000000b01'),
  1, 're-upvote inside the window stays one notification (dedupe)');

-- 11: no self-notification for voting on your own content
select pg_temp.as_user($ta$
  insert into public.votes (user_id, target_type, target_id)
  values ('aaa00000-0000-4000-8000-0000000000b1', 'post', '60000000-0000-4000-8000-000000000b01')
$ta$, 'aaa00000-0000-4000-8000-0000000000b1');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b1' and type = 'helpful_vote'),
  1, 'self-upvote does not notify');

-- 12: an upvote on a comment notifies the comment author
select pg_temp.as_user($ta$
  insert into public.votes (user_id, target_type, target_id)
  values ('aaa00000-0000-4000-8000-0000000000b1', 'comment', '70000000-0000-4000-8000-000000000c04')
$ta$, 'aaa00000-0000-4000-8000-0000000000b1');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b3' and type = 'helpful_vote'
     and target_type = 'comment' and target_id = '70000000-0000-4000-8000-000000000c04'),
  1, 'upvote on a comment notifies the comment author');

-- 13: an upvote on a review notifies the review author (review needs a badge)
select pg_temp.try_action($ta$
  insert into public.verifications (user_id, college_id, kind, method, email_hash, status)
  values ('aaa00000-0000-4000-8000-0000000000b1', 'ccc00000-0000-4000-8000-00000000cc04', 'student', 'email',
    public.own_login_email_hash(), 'approved')
$ta$, 'aaa00000-0000-4000-8000-0000000000b1');

select pg_temp.as_user($ta$
  insert into public.reviews (id, user_id, college_id, academics, faculty, placements, campus_hostel, campus_life, value_for_money, title, pros, cons, would_choose_again)
  values ('80000000-0000-4000-8000-000000000d01', 'aaa00000-0000-4000-8000-0000000000b1',
    'ccc00000-0000-4000-8000-00000000cc04', 4, 4, 4, 4, 4, 4, 'Review for vote notifications',
    'Great labs and faculty access. Hostel wifi is decent. Campus life is active with many clubs and fests through the year.',
    'Placement season is stressful. Administration can be slow with paperwork and hostel allotment takes a while.',
    true)
$ta$, 'aaa00000-0000-4000-8000-0000000000b1');

select pg_temp.as_user($ta$
  insert into public.votes (user_id, target_type, target_id)
  values ('aaa00000-0000-4000-8000-0000000000b2', 'review', '80000000-0000-4000-8000-000000000d01')
$ta$, 'aaa00000-0000-4000-8000-0000000000b2');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b1' and type = 'helpful_vote'
     and target_type = 'review' and target_id = '80000000-0000-4000-8000-000000000d01'),
  1, 'helpful vote on a review notifies the review author');

-- 14: a member can mark their own notification read
select pg_temp.as_user($ta$
  update public.notifications set read_at = now()
  where user_id = 'aaa00000-0000-4000-8000-0000000000b2'
    and target_id = '70000000-0000-4000-8000-000000000c04'
$ta$, 'aaa00000-0000-4000-8000-0000000000b2');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b2' and read_at is null),
  0, 'member can mark their own notification read');

-- 15: hiding content notifies the owner (never a silent vanish)
update public.posts set status = 'hidden' where id = '60000000-0000-4000-8000-000000000b01';

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b1' and type = 'moderation'
     and target_type = 'post' and target_id = '60000000-0000-4000-8000-000000000b01'),
  1, 'hiding a post notifies its author (moderation)');

-- 16: a member cannot change another member's read state
-- (b1 now holds 5 unread: reply, post vote, review vote, moderation, and the
-- verification-approval notification from the fixture's self-approval insert)
select pg_temp.as_user($ta$
  update public.notifications set read_at = now()
  where user_id = 'aaa00000-0000-4000-8000-0000000000b1'
$ta$, 'aaa00000-0000-4000-8000-0000000000b2');

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b1' and read_at is null),
  5, 'member cannot touch another member''s read state (update filtered by RLS)');

-- 17: an approved verification (service/admin path) notifies the owner
insert into public.verifications (id, user_id, college_id, kind, method, email_hash, status)
values ('90000000-0000-4000-8000-000000000e01', 'aaa00000-0000-4000-8000-0000000000b3',
  'ccc00000-0000-4000-8000-00000000cc04', 'student', 'id',
  encode(sha256(convert_to('x@taptest4.example', 'UTF8')), 'hex'), 'pending');

update public.verifications set status = 'approved'
where id = '90000000-0000-4000-8000-000000000e01';

select is(
  (select count(*)::int from public.notifications
   where user_id = 'aaa00000-0000-4000-8000-0000000000b3' and type = 'verification_approved'
     and target_type = 'verification' and target_id = '90000000-0000-4000-8000-000000000e01'),
  1, 'approval (admin path) notifies the verified user');

rollback;
