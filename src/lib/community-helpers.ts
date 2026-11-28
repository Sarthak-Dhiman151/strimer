/** Community helpers: pure functions, unit-tested. */

/**
 * Reddit-style Hot score from the spec: score / (hours since posting + 2)^1.5.
 * Upvote-only MVP, so score is the upvote count.
 */
export function hotScore(
  score: number,
  createdAt: Date,
  now: Date = new Date(),
): number {
  const hours = Math.max(0, (now.getTime() - createdAt.getTime()) / 3_600_000);
  return score / Math.pow(hours + 2, 1.5);
}

export type ThreadComment<
  T extends { id: string; parent_id: string | null; created_at: string },
> = T & {
  children: ThreadComment<T>[];
};

/**
 * Builds a threaded tree from a flat comment list (any order).
 * Orphans (missing parent, e.g. hidden) attach to the root level so content
 * never disappears from a thread.
 */
export function buildCommentTree<
  T extends { id: string; parent_id: string | null; created_at: string },
>(comments: T[]): ThreadComment<T>[] {
  const byId = new Map<string, ThreadComment<T>>();
  for (const c of comments) byId.set(c.id, { ...c, children: [] });

  const roots: ThreadComment<T>[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const byTime = (a: ThreadComment<T>, b: ThreadComment<T>) =>
    a.created_at.localeCompare(b.created_at);
  roots.sort(byTime);
  for (const node of byId.values()) node.children.sort(byTime);
  return roots;
}

export const MAX_COMMENT_DEPTH = 4;

/** Depth of a reply to `parentDepth`, capped at MAX_COMMENT_DEPTH (null = over cap). */
export function replyDepth(parentDepth: number): number | null {
  const depth = parentDepth + 1;
  return depth <= MAX_COMMENT_DEPTH ? depth : null;
}

/** Compact relative time: "just now", "5m", "3h", "2d", then a date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 8) return `${days}d`;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}
