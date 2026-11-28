import {
  buildCommentTree,
  hotScore,
  type ThreadComment,
} from "@/lib/community-helpers";
import { createClient } from "@/lib/supabase/server";

export type PostFlair = "question" | "discussion" | "advice" | "event";

export type PostRow = {
  id: string;
  college_id: string;
  user_id: string;
  title: string;
  body: string;
  flair: PostFlair;
  score: number;
  comment_count: number;
  accepted_comment_id: string | null;
  status: "visible" | "hidden" | "removed";
  created_at: string;
  author: { handle: string } | null;
  /** Filled only by getPostById (join), not listPosts. */
  college?: { slug: string; name: string } | null;
};

export type PostSort = "hot" | "new" | "top";

/** Visible posts for a college community. */
export async function listPosts(
  collegeId: string,
  opts: { flair?: PostFlair; sort?: PostSort; unanswered?: boolean } = {},
): Promise<PostRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("posts")
    .select("*, author:users(handle)")
    .eq("college_id", collegeId)
    .eq("status", "visible");
  if (opts.flair) q = q.eq("flair", opts.flair);
  if (opts.unanswered) q = q.eq("comment_count", 0);

  const { data, error } = await q;
  if (error) throw error;
  const posts = (data ?? []) as unknown as PostRow[];

  if (opts.sort === "top") {
    posts.sort(
      (a, b) => b.score - a.score || b.created_at.localeCompare(a.created_at),
    );
  } else if (opts.sort === "hot") {
    const now = new Date();
    posts.sort(
      (a, b) =>
        hotScore(b.score, new Date(b.created_at), now) -
        hotScore(a.score, new Date(a.created_at), now),
    );
  } else {
    posts.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return posts;
}

export async function getPostById(id: string): Promise<PostRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*, author:users(handle), college:colleges(slug, name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PostRow | null) ?? null;
}

export type CommentRow = {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  depth: number;
  score: number;
  status: "visible" | "hidden" | "removed";
  created_at: string;
  author: { handle: string } | null;
};

/** Visible comments of a post, as a threaded tree. */
export async function getPostComments(
  postId: string,
): Promise<ThreadComment<CommentRow>[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:users(handle)")
    .eq("post_id", postId)
    .eq("status", "visible")
    .order("created_at");
  if (error) throw error;
  return buildCommentTree((data ?? []) as unknown as CommentRow[]);
}

/** Which comment/post ids the viewer has upvoted. */
export async function getViewerVotedIds(
  targetType: "post" | "comment",
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data, error } = await supabase
    .from("votes")
    .select("target_id")
    .eq("user_id", user.id)
    .eq("target_type", targetType)
    .in("target_id", ids);
  if (error) throw error;
  return new Set((data ?? []).map((v) => v.target_id));
}

/**
 * Handles verified (approved) for a college — used for the badge beside names.
 * For comments, pass the user_ids of comment authors.
 */
export async function getVerifiedUserIds(
  collegeId: string,
  userIds: string[],
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("verifications")
    .select("user_id")
    .eq("college_id", collegeId)
    .eq("status", "approved")
    .in("user_id", userIds);
  if (error) throw error;
  return new Set((data ?? []).map((v) => v.user_id));
}

export type ViewerCommunityState = {
  signedIn: boolean;
  userId: string | null;
};

export async function getViewerCommunityState(): Promise<ViewerCommunityState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { signedIn: Boolean(user), userId: user?.id ?? null };
}
