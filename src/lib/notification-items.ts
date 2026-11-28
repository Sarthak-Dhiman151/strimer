// Pure rendering of notification rows into link/copy items (unit-tested).
// No server imports — notifications.ts (server reads) re-exports these.
export type NotificationRow = {
  id: string;
  user_id: string;
  type:
    | "reply"
    | "answer"
    | "helpful_vote"
    | "verification_approved"
    | "moderation";
  target_type: "post" | "comment" | "review" | "verification" | "user";
  target_id: string;
  read_at: string | null;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  type: NotificationRow["type"];
  href: string;
  headline: string;
  excerpt: string | null;
  read: boolean;
  created_at: string;
};

export type ResolvedTarget =
  | {
      found: true;
      kind: "comment";
      post_id: string;
      parent_id: string | null;
      body: string;
      status: string;
    }
  | { found: true; kind: "post"; title: string; status: string }
  | {
      found: true;
      kind: "review";
      title: string;
      college_slug: string | null;
      status: string;
    }
  | {
      found: true;
      kind: "verification";
      college_slug: string | null;
      college_name: string | null;
    }
  | { found: false };

const slice = (s: string, n = 110) =>
  s.replace(/\s+/g, " ").trim().slice(0, n) + (s.length > n ? "…" : "");

/**
 * Pure renderer for one notification. `resolved` carries whatever the batch
 * lookups found for the target row (nothing when it is gone/unreadable).
 */
export function buildNotificationItem(
  row: NotificationRow,
  resolved: ResolvedTarget,
): NotificationItem {
  const base: NotificationItem = {
    id: row.id,
    type: row.type,
    href: "/",
    headline: "Notification",
    excerpt: null,
    read: row.read_at !== null,
    created_at: row.created_at,
  };

  if (!resolved.found) return base;

  switch (row.type) {
    case "reply": {
      if (resolved.kind === "comment") {
        return {
          ...base,
          href: `/post/${resolved.post_id}#comment-${row.target_id}`,
          headline: resolved.parent_id
            ? "New reply in a thread you commented on"
            : "New reply on your post",
          excerpt: slice(resolved.body),
        };
      }
      return base;
    }
    case "answer": {
      if (resolved.kind === "post") {
        return {
          ...base,
          href: `/post/${row.target_id}`,
          headline: "New answer on your question",
          excerpt: slice(resolved.title),
        };
      }
      if (resolved.kind === "comment") {
        return {
          ...base,
          href: `/post/${resolved.post_id}#comment-${row.target_id}`,
          headline: "Your reply was marked as the best answer",
          excerpt: slice(resolved.body),
        };
      }
      return base;
    }
    case "helpful_vote": {
      if (resolved.kind === "post") {
        return {
          ...base,
          href: `/post/${row.target_id}`,
          headline: "Someone found your post helpful",
          excerpt: slice(resolved.title),
        };
      }
      if (resolved.kind === "comment") {
        return {
          ...base,
          href: `/post/${resolved.post_id}#comment-${row.target_id}`,
          headline: "Someone found your reply helpful",
          excerpt: slice(resolved.body),
        };
      }
      if (resolved.kind === "review") {
        return {
          ...base,
          href: resolved.college_slug
            ? `/c/${resolved.college_slug}/reviews`
            : "/",
          headline: "Someone found your review helpful",
          excerpt: resolved.title ? slice(resolved.title) : null,
        };
      }
      return base;
    }
    case "verification_approved": {
      if (resolved.kind === "verification") {
        return {
          ...base,
          href: resolved.college_slug
            ? `/c/${resolved.college_slug}`
            : "/verify",
          headline: "You're verified — your badge is live",
          excerpt: resolved.college_name
            ? `Verified student or alumni of ${resolved.college_name}`
            : null,
        };
      }
      return base;
    }
    case "moderation": {
      const verb =
        "status" in resolved && resolved.status === "removed"
          ? "removed"
          : "hidden";
      const noun =
        resolved.kind === "post"
          ? "post"
          : resolved.kind === "comment"
            ? "reply"
            : resolved.kind === "review"
              ? "review"
              : "content";
      const href =
        resolved.kind === "post"
          ? `/post/${row.target_id}`
          : resolved.kind === "review" && resolved.college_slug
            ? `/c/${resolved.college_slug}/reviews`
            : "/";
      return {
        ...base,
        href,
        headline: `Your ${noun} was ${verb} by moderators`,
        excerpt:
          resolved.kind === "post"
            ? slice(resolved.title)
            : resolved.kind === "review" && resolved.title
              ? slice(resolved.title)
              : resolved.kind === "comment"
                ? slice(resolved.body)
                : null,
      };
    }
    default:
      return base;
  }
}
