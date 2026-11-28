import { createClient } from "@/lib/supabase/server";

import {
  buildNotificationItem,
  type NotificationItem,
  type NotificationRow,
  type ResolvedTarget,
} from "@/lib/notification-items";

// Notification rows are written only by the SECURITY DEFINER triggers
// (migration 20261128120000); users read/mark-read via RLS policies.
// Pure item rendering lives in notification-items.ts (re-exported here).
export {
  buildNotificationItem,
  type NotificationItem,
  type NotificationRow,
  type ResolvedTarget,
};

/** Unread count for the header bell (0 when signed out / unconfigured). */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

/** The viewer's notifications, newest first (RLS scopes to own rows). */
export async function listNotifications(
  limit = 50,
): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as NotificationRow[];
}

/**
 * Batch-resolves the target rows behind a page of notifications and renders
 * them. Only rows the viewer may read come back (RLS), so missing targets
 * degrade to a generic item instead of erroring.
 */
export async function resolveNotificationItems(
  rows: NotificationRow[],
): Promise<NotificationItem[]> {
  if (rows.length === 0) return [];

  const supabase = await createClient();
  const ids = (t: NotificationRow["target_type"]) =>
    rows.filter((r) => r.target_type === t).map((r) => r.target_id);

  const [commentIds, postIds, reviewIds, verificationIds] = [
    ids("comment"),
    ids("post"),
    ids("review"),
    ids("verification"),
  ];

  const comments = new Map<
    string,
    { post_id: string; parent_id: string | null; body: string; status: string }
  >();
  const posts = new Map<string, { title: string; status: string }>();
  const reviews = new Map<
    string,
    { title: string; status: string; college_id: string | null }
  >();
  const verifications = new Map<string, { college_id: string | null }>();
  const collegeIds = new Set<string>();

  if (commentIds.length) {
    const { data, error } = await supabase
      .from("comments")
      .select("id, post_id, parent_id, body, status")
      .in("id", commentIds);
    if (error) throw error;
    for (const c of (data ?? []) as Array<{
      id: string;
      post_id: string;
      parent_id: string | null;
      body: string;
      status: string;
    }>) {
      comments.set(c.id, {
        post_id: c.post_id,
        parent_id: c.parent_id,
        body: c.body,
        status: c.status,
      });
    }
  }

  if (postIds.length) {
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, status")
      .in("id", postIds);
    if (error) throw error;
    for (const p of (data ?? []) as Array<{
      id: string;
      title: string;
      status: string;
    }>) {
      posts.set(p.id, { title: p.title, status: p.status });
    }
  }

  if (reviewIds.length) {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, title, status, college_id")
      .in("id", reviewIds);
    if (error) throw error;
    for (const r of (data ?? []) as Array<{
      id: string;
      title: string;
      status: string;
      college_id: string;
    }>) {
      reviews.set(r.id, {
        title: r.title,
        status: r.status,
        college_id: r.college_id,
      });
      collegeIds.add(r.college_id);
    }
  }

  if (verificationIds.length) {
    const { data, error } = await supabase
      .from("verifications")
      .select("id, college_id")
      .in("id", verificationIds);
    if (error) throw error;
    for (const v of (data ?? []) as Array<{ id: string; college_id: string }>) {
      verifications.set(v.id, { college_id: v.college_id });
      collegeIds.add(v.college_id);
    }
  }

  const colleges = new Map<string, { slug: string; name: string }>();
  if (collegeIds.size) {
    const { data, error } = await supabase
      .from("colleges")
      .select("id, slug, name")
      .in("id", [...collegeIds]);
    if (error) throw error;
    for (const c of (data ?? []) as Array<{
      id: string;
      slug: string;
      name: string;
    }>) {
      colleges.set(c.id, { slug: c.slug, name: c.name });
    }
  }

  return rows.map((row) => {
    let resolved: ResolvedTarget = { found: false };
    if (row.target_type === "comment" && comments.has(row.target_id)) {
      const c = comments.get(row.target_id)!;
      resolved = {
        found: true,
        kind: "comment",
        post_id: c.post_id,
        parent_id: c.parent_id,
        body: c.body,
        status: c.status,
      };
    } else if (row.target_type === "post" && posts.has(row.target_id)) {
      const p = posts.get(row.target_id)!;
      resolved = {
        found: true,
        kind: "post",
        title: p.title,
        status: p.status,
      };
    } else if (row.target_type === "review" && reviews.has(row.target_id)) {
      const r = reviews.get(row.target_id)!;
      const college = r.college_id ? colleges.get(r.college_id) : undefined;
      resolved = {
        found: true,
        kind: "review",
        title: r.title,
        college_slug: college?.slug ?? null,
        status: r.status,
      };
    } else if (
      row.target_type === "verification" &&
      verifications.has(row.target_id)
    ) {
      const v = verifications.get(row.target_id)!;
      const college = v.college_id ? colleges.get(v.college_id) : undefined;
      resolved = {
        found: true,
        kind: "verification",
        college_slug: college?.slug ?? null,
        college_name: college?.name ?? null,
      };
    }
    return buildNotificationItem(row, resolved);
  });
}
