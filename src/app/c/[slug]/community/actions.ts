"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPostById } from "@/lib/community";
import { replyDepth } from "@/lib/community-helpers";

export type FormState = { error?: string };

const FLAIRS = ["question", "discussion", "advice", "event"] as const;
type Flair = (typeof FLAIRS)[number];

function readFlair(value: FormDataEntryValue | null): Flair {
  const v = String(value ?? "");
  return (FLAIRS as readonly string[]).includes(v)
    ? (v as Flair)
    : "discussion";
}

/** Create a post. Any signed-in member can post (RLS scopes ownership). */
export async function createPost(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const collegeId = String(formData.get("collegeId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "")
    .trim()
    .slice(0, 20000);
  const flair = readFlair(formData.get("flair"));

  if (!collegeId) return { error: "Pick a college first." };
  if (title.length < 8 || title.length > 150) {
    return { error: "Titles need 8–150 characters." };
  }

  let postId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data, error } = await supabase
      .from("posts")
      .insert({ college_id: collegeId, user_id: user.id, title, body, flair })
      .select("id")
      .single();
    if (error) return { error: "Could not post. Please try again." };
    postId = data.id;
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { error: "Could not post. Please try again." };
  }

  revalidatePath(`/c/${slug}/community`);
  redirect(`/post/${postId}`);
}

/** Reply to a post (or to a comment, threaded, depth capped at 4). */
export async function createComment(formData: FormData): Promise<void> {
  const postId = String(formData.get("postId") ?? "");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const body = String(formData.get("body") ?? "")
    .trim()
    .slice(0, 8000);
  const slug = String(formData.get("slug") ?? "");
  if (!postId || !body) redirect(`/post/${postId}`);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let depth = 0;
    if (parentId) {
      const { data: parent, error } = await supabase
        .from("comments")
        .select("depth, status")
        .eq("id", parentId)
        .eq("post_id", postId)
        .maybeSingle();
      if (error || !parent || parent.status !== "visible") {
        redirect(`/post/${postId}?error=comment-gone`);
      }
      const next = replyDepth(parent.depth);
      if (next === null) redirect(`/post/${postId}?error=depth`);
      depth = next;
    }

    const { error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        parent_id: parentId,
        user_id: user.id,
        body,
        depth,
      });
    if (error) redirect(`/post/${postId}?error=reply-failed`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    redirect(`/post/${postId}?error=reply-failed`);
  }

  if (slug) revalidatePath(`/c/${slug}/community`);
  revalidatePath(`/post/${postId}`);
  redirect(`/post/${postId}${parentId ? `#comment-${parentId}` : ""}`);
}

/** Toggle the viewer's upvote on a post. */
export async function togglePostVote(formData: FormData): Promise<void> {
  const targetId = String(formData.get("postId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const voted = String(formData.get("voted") ?? "") === "1";
  if (!targetId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (voted) {
    await supabase
      .from("votes")
      .delete()
      .eq("user_id", user.id)
      .eq("target_type", "post")
      .eq("target_id", targetId);
  } else {
    await supabase
      .from("votes")
      .insert({ user_id: user.id, target_type: "post", target_id: targetId });
  }
  if (slug) {
    revalidatePath(`/c/${slug}/community`);
    revalidatePath(`/post/${targetId}`);
  }
}

/** Toggle the viewer's upvote on a comment. */
export async function toggleCommentVote(formData: FormData): Promise<void> {
  const targetId = String(formData.get("commentId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const voted = String(formData.get("voted") ?? "") === "1";
  if (!targetId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (voted) {
    await supabase
      .from("votes")
      .delete()
      .eq("user_id", user.id)
      .eq("target_type", "comment")
      .eq("target_id", targetId);
  } else {
    await supabase
      .from("votes")
      .insert({
        user_id: user.id,
        target_type: "comment",
        target_id: targetId,
      });
  }
  if (slug) revalidatePath(`/c/${slug}/community`);
  revalidatePath(`/post/${postId}`);
}

/** The asker pins the best answer on their Question post. */
export async function acceptAnswer(formData: FormData): Promise<void> {
  const postId = String(formData.get("postId") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!postId || !commentId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const post = await getPostById(postId);
  if (!post || post.user_id !== user.id) return;

  const { error } = await supabase
    .from("posts")
    .update({ accepted_comment_id: commentId })
    .eq("id", postId)
    .eq("user_id", user.id)
    .eq("flair", "question");
  if (!error) {
    if (slug) revalidatePath(`/c/${slug}/community`);
    revalidatePath(`/post/${postId}`);
  }
}
