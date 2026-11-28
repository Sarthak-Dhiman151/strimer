-- Step 3 — in-app notifications.
-- The notifications table is trigger-shaped: no user-facing INSERT policy
-- exists, so end users can never forge a notification. These SECURITY DEFINER
-- trigger functions are the sanctioned write path (same pattern as the seed /
-- service-role admin path). Recipients read and mark-read via the existing
-- notifications_select_own / notifications_update_own_read_state policies.

set search_path = public;

-- Shared insert helper with an optional dedupe window (minutes): repeat
-- actions inside the window (e.g. upvote toggle spam) stay one notification.
create or replace function public.notify_insert(
  p_user_id uuid,
  p_type public.notification_type,
  p_target_type public.notification_target_type,
  p_target_id uuid,
  p_dedupe_minutes integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;
  if p_dedupe_minutes is not null and exists (
    select 1 from public.notifications
    where user_id = p_user_id
      and type = p_type
      and target_type = p_target_type
      and target_id = p_target_id
      and created_at > now() - make_interval(mins => p_dedupe_minutes)
  ) then
    return;
  end if;
  insert into public.notifications (user_id, type, target_type, target_id)
    values (p_user_id, p_type, p_target_type, p_target_id);
end;
$$;

-- ── 1) replies and answers ───────────────────────────────────────────────────
-- Top-level comment on a QUESTION post → 'answer' for the asker (target post).
-- Any other comment → 'reply' for the author of the content being replied to:
-- the post author for top-level comments, the parent-comment author for nested
-- ones. Never self-notify.
create or replace function public.on_comment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post record;
  v_parent_author uuid;
begin
  select user_id, flair into v_post from public.posts where id = new.post_id;
  if new.parent_id is null then
    if v_post.user_id is distinct from new.user_id then
      if v_post.flair = 'question' then
        perform public.notify_insert(v_post.user_id, 'answer', 'post', new.post_id);
      else
        perform public.notify_insert(v_post.user_id, 'reply', 'comment', new.id);
      end if;
    end if;
  else
    select user_id into v_parent_author from public.comments where id = new.parent_id;
    if v_parent_author is distinct from new.user_id then
      perform public.notify_insert(v_parent_author, 'reply', 'comment', new.id);
    end if;
  end if;
  return null;
end;
$$;

create trigger comment_created_notify
  after insert on public.comments
  for each row execute function public.on_comment_created();

-- ── 2) best answer chosen ────────────────────────────────────────────────────
create or replace function public.on_post_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment_author uuid;
begin
  if new.accepted_comment_id is not null
     and new.accepted_comment_id is distinct from old.accepted_comment_id then
    select user_id into v_comment_author from public.comments where id = new.accepted_comment_id;
    if v_comment_author is distinct from new.user_id then
      perform public.notify_insert(v_comment_author, 'answer', 'comment', new.accepted_comment_id);
    end if;
  end if;
  return null;
end;
$$;

create trigger post_accepted_notify
  after update of accepted_comment_id on public.posts
  for each row execute function public.on_post_accepted();

-- ── 3) helpful votes ─────────────────────────────────────────────────────────
-- Upvotes on your post/comment/review. Deduped per target within 60 minutes so
-- toggling stays quiet. vote_target_type → notification_target_type needs a
-- text hop (distinct enum types with overlapping labels).
create or replace function public.on_vote_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if new.target_type = 'post' then
    select user_id into v_owner from public.posts where id = new.target_id;
  elsif new.target_type = 'comment' then
    select user_id into v_owner from public.comments where id = new.target_id;
  elsif new.target_type = 'review' then
    select user_id into v_owner from public.reviews where id = new.target_id;
  end if;
  if v_owner is distinct from new.user_id then
    perform public.notify_insert(
      v_owner, 'helpful_vote', new.target_type::text::public.notification_target_type, new.target_id, 60
    );
  end if;
  return null;
end;
$$;

create trigger vote_created_notify
  after insert on public.votes
  for each row execute function public.on_vote_created();

-- ── 4) verification approved ─────────────────────────────────────────────────
-- Fires for the email-OTP self-approval insert AND for moderator updates.
create or replace function public.on_verification_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (
    tg_op = 'INSERT' or old.status is distinct from new.status
  ) then
    perform public.notify_insert(new.user_id, 'verification_approved', 'verification', new.id);
  end if;
  return null;
end;
$$;

create trigger verification_approved_notify
  after insert or update of status on public.verifications
  for each row execute function public.on_verification_approved();

-- ── 5) moderation ────────────────────────────────────────────────────────────
-- When your content is hidden or removed you get a notification so it is never
-- a silent vanish. Table names (posts/comments/reviews) match the enum labels.
create or replace function public.on_content_moderated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status in ('hidden', 'removed') then
    perform public.notify_insert(
      new.user_id, 'moderation',
      case tg_table_name
        when 'posts' then 'post'::public.notification_target_type
        when 'comments' then 'comment'::public.notification_target_type
        when 'reviews' then 'review'::public.notification_target_type
      end,
      new.id
    );
  end if;
  return null;
end;
$$;

create trigger posts_moderation_notify
  after update of status on public.posts
  for each row execute function public.on_content_moderated();

create trigger comments_moderation_notify
  after update of status on public.comments
  for each row execute function public.on_content_moderated();

create trigger reviews_moderation_notify
  after update of status on public.reviews
  for each row execute function public.on_content_moderated();
