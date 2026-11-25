-- Strimer initial schema: 12 tables, enums, indexes, RLS policies, triggers.
--
-- Non-negotiable rules enforced here (see CLAUDE.md):
--   1. Only users with an APPROVED verification for a college can insert a review
--      or placement report for it (RLS + has_approved_verification + BEFORE trigger).
--   2. One active (visible) review per user per college (partial unique index).
--   3. Content is never hard-deleted; content_status: visible | hidden | removed.
--   4. Pseudonymous identity: public.users has NO email column. Login email lives
--      only in auth.users (Supabase-managed); college emails only as email_hash.
--   5. A college's average rating is NULL until it has >= 5 visible verified reviews
--      (refresh_college_rating trigger).
--   6. RLS is enabled on every table and never disabled. Moderation writes bypass
--      RLS via the server-only service key, never via policy holes.

-- ─────────────────────────────── Enums ───────────────────────────────

create type public.user_role as enum ('member', 'moderator', 'admin'); -- visitor = not logged in, verified = has approved verification, not a role
create type public.content_status as enum ('visible', 'hidden', 'removed');
create type public.college_type as enum ('government', 'private');
create type public.verification_kind as enum ('student', 'alumni');
create type public.verification_method as enum ('email', 'id');
create type public.verification_status as enum ('pending', 'approved', 'rejected', 'revoked');
create type public.post_flair as enum ('question', 'discussion', 'advice', 'event');
create type public.vote_target_type as enum ('post', 'comment', 'review');
create type public.report_target_type as enum ('post', 'comment', 'review', 'placement_report', 'user');
create type public.report_status as enum ('open', 'resolved', 'dismissed');
create type public.notification_type as enum ('reply', 'answer', 'helpful_vote', 'verification_approved', 'moderation');
create type public.notification_target_type as enum ('post', 'comment', 'review', 'verification', 'user');
create type public.mod_action_type as enum (
  'hide', 'unhide', 'remove', 'restore', 'ban', 'unban',
  'approve_verification', 'reject_verification', 'edit_college', 'dismiss_report'
);

-- ─────────────────────────────── Tables ───────────────────────────────

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique constraint users_handle_format check (handle ~ '^[a-z0-9_]{3,24}$'),
  role public.user_role not null default 'member',
  status public.content_status not null default 'visible', -- ban state; set only via service key
  karma integer not null default 0, -- maintained by refresh_vote_targets trigger
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.colleges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique constraint colleges_slug_format check (slug ~ '^[a-z0-9-]{2,80}$'),
  name text not null,
  city text,
  state text,
  type public.college_type,
  nirf_rank integer,
  fee_min integer, -- rupees per year
  fee_max integer,
  website text,
  email_domains text[] not null default '{}', -- allowed college-email domains for verification
  rating_cache numeric(3, 2), -- avg of six aspects over visible verified reviews; NULL until >= 5
  review_count integer not null default 0, -- visible verified reviews
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint colleges_fee_range check (fee_min is null or fee_max is null or fee_max >= fee_min)
);

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete cascade,
  kind public.verification_kind not null,
  method public.verification_method not null,
  branch text,
  batch_year integer constraint verifications_batch_year_range check (batch_year is null or batch_year between 1990 and 2100),
  email_hash text constraint verifications_email_hash_format check (email_hash ~ '^[0-9a-f]{64}$'), -- sha-256 hex; never plaintext
  id_document_path text, -- storage path for the capped ID fallback; deleted after manual review
  status public.verification_status not null default 'pending',
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  constraint verifications_proof_present check (email_hash is not null or id_document_path is not null)
);

-- one approved verification per user per college
create unique index verifications_one_approved_per_college
  on public.verifications (user_id, college_id) where status = 'approved';

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete cascade,
  branch text,
  batch_year integer constraint reviews_batch_year_range check (batch_year is null or batch_year between 1990 and 2100),
  -- six aspect ratings, 1..5
  academics smallint not null constraint reviews_academics_range check (academics between 1 and 5),
  faculty smallint not null constraint reviews_faculty_range check (faculty between 1 and 5),
  placements smallint not null constraint reviews_placements_range check (placements between 1 and 5),
  campus_hostel smallint not null constraint reviews_campus_hostel_range check (campus_hostel between 1 and 5),
  campus_life smallint not null constraint reviews_campus_life_range check (campus_life between 1 and 5),
  value_for_money smallint not null constraint reviews_value_for_money_range check (value_for_money between 1 and 5),
  title text not null,
  pros text not null,
  cons text not null,
  constraint reviews_written_min_length check (char_length(pros) + char_length(cons) >= 150), -- spec: 150 chars minimum in total
  would_choose_again boolean not null,
  best_for text,
  not_for text,
  helpful_count integer not null default 0, -- maintained by refresh_vote_targets trigger
  is_verified boolean not null default false, -- snapshotted from verifications at insert by trigger
  status public.content_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- rule 2: one ACTIVE review per user per college (edits keep the same row;
-- hidden/removed rows free the slot only if the mod removed them permanently)
create unique index reviews_one_active_per_user_college
  on public.reviews (user_id, college_id) where status = 'visible';

create table public.placement_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete cascade,
  branch text not null,
  year integer not null constraint placement_reports_year_range check (year between 1990 and 2100),
  median_lpa numeric(6, 2) not null,
  offers_count integer,
  status public.content_status not null default 'visible',
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  body text not null default '', -- user markdown; sanitise at render
  flair public.post_flair not null default 'discussion',
  score integer not null default 0, -- maintained by refresh_vote_targets trigger
  comment_count integer not null default 0, -- maintained by refresh_post_comment_count trigger
  accepted_comment_id uuid, -- best answer; FK added below (comments does not exist yet)
  status public.content_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_accepted_requires_question_flair check (accepted_comment_id is null or flair = 'question')
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete restrict, -- threaded replies
  user_id uuid not null references public.users (id) on delete cascade,
  body text not null constraint comments_body_length check (char_length(body) between 1 and 8000),
  depth smallint not null default 0 constraint comments_depth_cap check (depth between 0 and 4), -- spec: depth capped at 4
  score integer not null default 0, -- maintained by refresh_vote_targets trigger
  status public.content_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts
  add constraint posts_accepted_comment_fkey
  foreign key (accepted_comment_id) references public.comments (id);

-- polymorphic; target rows are never hard-deleted, so no FK is possible
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  target_type public.vote_target_type not null,
  target_id uuid not null,
  value smallint not null default 1 constraint votes_upvote_only check (value = 1), -- MVP: upvote only
  created_at timestamptz not null default now(),
  constraint votes_one_per_target unique (user_id, target_type, target_id)
);

create table public.follows (
  user_id uuid not null references public.users (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_pkey primary key (user_id, college_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  resolved_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type public.notification_type not null,
  target_type public.notification_target_type not null,
  target_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- audit log of every moderator decision; insert-only via service key
create table public.mod_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.users (id),
  action public.mod_action_type not null,
  target_type public.report_target_type not null,
  target_id uuid not null,
  note text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────── Indexes ───────────────────────────────

create index reviews_user_idx on public.reviews (user_id);
create index reviews_college_visible_idx on public.reviews (college_id) where status = 'visible';
create index verifications_user_idx on public.verifications (user_id);
create index verifications_college_idx on public.verifications (college_id);
create index placement_reports_college_idx on public.placement_reports (college_id, branch, year);
create index posts_college_created_idx on public.posts (college_id, created_at desc); -- New
create index posts_college_score_idx on public.posts (college_id, score desc); -- Top
create index comments_post_idx on public.comments (post_id);
create index comments_parent_idx on public.comments (parent_id);
create index votes_target_idx on public.votes (target_type, target_id);
create index reports_target_idx on public.reports (target_type, target_id);
create index reports_open_idx on public.reports (status) where status = 'open';
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index follows_college_idx on public.follows (college_id);

-- ─────────────────────── Helper functions (SECURITY DEFINER) ───────────────────────
-- Definer avoids RLS recursion and keeps the hot checks cheap. Owner: postgres.

create or replace function public.has_approved_verification(p_college_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.verifications v
    where v.user_id = auth.uid()
      and v.college_id = p_college_id
      and v.status = 'approved'
  );
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role in ('moderator', 'admin')
  );
$$;

-- ─────────────────────────────── Triggers ───────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch_updated_at before update on public.users
  for each row execute function public.touch_updated_at();
create trigger colleges_touch_updated_at before update on public.colleges
  for each row execute function public.touch_updated_at();
create trigger reviews_touch_updated_at before update on public.reviews
  for each row execute function public.touch_updated_at();
create trigger posts_touch_updated_at before update on public.posts
  for each row execute function public.touch_updated_at();
create trigger comments_touch_updated_at before update on public.comments
  for each row execute function public.touch_updated_at();

-- Create a public profile with a unique handle for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  cand text;
  attempts int := 0;
begin
  base := lower(coalesce(new.raw_user_meta_data ->> 'handle', split_part(coalesce(new.email, 'user'), '@', 1)));
  base := regexp_replace(base, '[^a-z0-9_]', '', 'g');
  base := substr(nullif(base, ''), 1, 16);
  if base is null or char_length(base) < 3 then
    base := 'user';
  end if;
  cand := base;
  while exists (select 1 from public.users where handle = cand) and attempts < 20 loop
    cand := base || '_' || substr(md5(random()::text), 1, 4); -- <= 21 chars, fits handle format
    attempts := attempts + 1;
  end loop;
  insert into public.users (id, handle) values (new.id, cand);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- reviews.is_verified is server truth, derived from approved verifications.
create or replace function public.set_review_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- the server-only service key (admin/seed paths) bypasses the guard and may set
  -- is_verified explicitly; every other caller gets verification-derived truth
  if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role' then
    return new;
  end if;
  new.is_verified := public.has_approved_verification(new.college_id);
  if not new.is_verified then
    raise exception 'insert requires an approved verification for this college'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger reviews_set_verification before insert on public.reviews
  for each row execute function public.set_review_verification();

-- rule 5: cache each college's aggregate rating; NULL average until >= 5 visible verified reviews.
create or replace function public.refresh_college_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c_id uuid := coalesce(new.college_id, old.college_id);
  n integer;
  avg_rating numeric;
begin
  select count(*), avg((academics + faculty + placements + campus_hostel + campus_life + value_for_money)::numeric / 6)
    into n, avg_rating
  from public.reviews
  where college_id = c_id and status = 'visible' and is_verified;

  update public.colleges
    set review_count = n,
        rating_cache = case when n >= 5 then round(avg_rating, 2) end
    where id = c_id;
  return null; -- AFTER trigger; return value is ignored
end;
$$;

create trigger reviews_refresh_college_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_college_rating();

create or replace function public.refresh_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p_id uuid := coalesce(new.post_id, old.post_id);
begin
  update public.posts
    set comment_count = (select count(*) from public.comments where post_id = p_id and status = 'visible')
    where id = p_id;
  return null; -- AFTER trigger; return value is ignored
end;
$$;

create trigger comments_refresh_post_comment_count
  after insert or update or delete on public.comments
  for each row execute function public.refresh_post_comment_count();

-- Keep vote aggregates in one place: scores on posts/comments, helpful_count on
-- reviews, and the author's karma (sum of upvotes received across content).
create or replace function public.refresh_vote_targets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.votes%rowtype;
  owner uuid;
begin
  if tg_op = 'DELETE' then
    t := old;
  else
    t := new;
  end if;

  if t.target_type = 'post' then
    update public.posts
      set score = (select count(*) from public.votes v where v.target_type = 'post' and v.target_id = t.target_id)
      where id = t.target_id
      returning user_id into owner;
  elsif t.target_type = 'comment' then
    update public.comments
      set score = (select count(*) from public.votes v where v.target_type = 'comment' and v.target_id = t.target_id)
      where id = t.target_id
      returning user_id into owner;
  elsif t.target_type = 'review' then
    update public.reviews
      set helpful_count = (select count(*) from public.votes v where v.target_type = 'review' and v.target_id = t.target_id)
      where id = t.target_id
      returning user_id into owner;
  end if;

  if owner is not null then
    update public.users
      set karma = (select coalesce(sum(score), 0) from public.posts where user_id = owner)
               + (select coalesce(sum(score), 0) from public.comments where user_id = owner)
               + (select coalesce(sum(helpful_count), 0) from public.reviews where user_id = owner)
      where id = owner;
  end if;
  return null; -- AFTER trigger; return value is ignored
end;
$$;

create trigger votes_refresh_targets
  after insert or delete on public.votes
  for each row execute function public.refresh_vote_targets();

-- ─────────────── Row-level security: enable on EVERY table ───────────────

alter table public.users enable row level security;
alter table public.colleges enable row level security;
alter table public.verifications enable row level security;
alter table public.reviews enable row level security;
alter table public.placement_reports enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;
alter table public.follows enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.mod_actions enable row level security;

-- ─────────────────────────────── Policies ───────────────────────────────
-- Moderators/admins see and fix everything through the server-only service key
-- (bypasses RLS by design). End users never get UPDATE/DELETE on moderation state.

-- users: public pseudonymous profiles; hidden/removed profiles only visible to self or mods
create policy users_select_visible_or_self_or_mod on public.users
  for select using (status = 'visible' or id = auth.uid() or public.is_moderator());
-- no insert/update/delete policies: rows come from the auth trigger; edits via service key

-- colleges: readable by everyone; writes via service key only
create policy colleges_public_select on public.colleges
  for select using (true);

-- verifications
create policy verifications_select_own_or_mod on public.verifications
  for select using (user_id = auth.uid() or public.is_moderator());
create policy verifications_insert_own_pending on public.verifications
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending');

-- reviews: rule 1 lives here
create policy reviews_select_visible_own_or_mod on public.reviews
  for select using (status = 'visible' or user_id = auth.uid() or public.is_moderator());
create policy reviews_insert_verified_own_visible on public.reviews
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'visible'
    and public.has_approved_verification(college_id)
  );
-- authors may edit their visible review but can never change its status or move it
-- to another college they are not verified for; status changes are moderation
create policy reviews_update_own_visible on public.reviews
  for update to authenticated
  using (user_id = auth.uid() and status = 'visible')
  with check (
    user_id = auth.uid()
    and status = 'visible'
    and public.has_approved_verification(college_id)
  );

-- placement reports: same verification gate as reviews; immutable once written
create policy placement_reports_select_visible_own_or_mod on public.placement_reports
  for select using (status = 'visible' or user_id = auth.uid() or public.is_moderator());
create policy placement_reports_insert_verified_own_visible on public.placement_reports
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'visible'
    and public.has_approved_verification(college_id)
  );

-- posts: any authenticated member can post into a visible state
create policy posts_select_visible_own_or_mod on public.posts
  for select using (status = 'visible' or user_id = auth.uid() or public.is_moderator());
create policy posts_insert_own_visible on public.posts
  for insert to authenticated with check (user_id = auth.uid() and status = 'visible');
create policy posts_update_own_visible on public.posts
  for update to authenticated
  using (user_id = auth.uid() and status = 'visible')
  with check (user_id = auth.uid() and status = 'visible'); -- cannot self-hide; accepts best answer via accepted_comment_id

create policy comments_select_visible_own_or_mod on public.comments
  for select using (status = 'visible' or user_id = auth.uid() or public.is_moderator());
create policy comments_insert_own_visible on public.comments
  for insert to authenticated with check (user_id = auth.uid() and status = 'visible');
create policy comments_update_own_visible on public.comments
  for update to authenticated
  using (user_id = auth.uid() and status = 'visible')
  with check (user_id = auth.uid() and status = 'visible');

-- votes: scores public; cast/delete only your own upvote
create policy votes_public_select on public.votes
  for select using (true);
create policy votes_insert_own_upvote on public.votes
  for insert to authenticated with check (user_id = auth.uid() and value = 1);
create policy votes_delete_own on public.votes
  for delete to authenticated using (user_id = auth.uid());

-- follows
create policy follows_public_select on public.follows
  for select using (true);
create policy follows_insert_own on public.follows
  for insert to authenticated with check (user_id = auth.uid());
create policy follows_delete_own on public.follows
  for delete to authenticated using (user_id = auth.uid());

-- reports: anyone logged in may report; see own reports or moderate
create policy reports_select_own_or_mod on public.reports
  for select using (reporter_id = auth.uid() or public.is_moderator());
create policy reports_insert_own_open on public.reports
  for insert to authenticated with check (reporter_id = auth.uid() and status = 'open');

-- notifications: created by triggers/service key; users read and mark read
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_update_own_read_state on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- mod_actions: no policies at all — deny by default; service key writes the audit log
-- (RLS enabled above; no permissive policy is defined, so end users see nothing)

-- end users may only change a notification's read marker, not its content
revoke update on table public.notifications from anon, authenticated;
grant update (read_at) on table public.notifications to authenticated;
