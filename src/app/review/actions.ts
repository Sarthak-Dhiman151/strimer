"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { validateReviewInput } from "@/lib/review-validation";

export type ReviewFormState = { error?: string };

type PostgresError = { code?: string };

function friendlyDbError(error: unknown): string {
  const code = (error as PostgresError)?.code;
  if (code === "23505") {
    return "You already have an active review for this college — edit it instead.";
  }
  if (code === "42501") {
    return "Only verified students and alumni can review. Get verified with your college email first.";
  }
  return "Could not save the review. Please try again.";
}

/** Create the user's review for a college (RLS enforces the verification gate). */
export async function submitReview(
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const parsed = validateReviewInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const slug = String(formData.get("slug") ?? "");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      college_id: parsed.collegeId,
      ...parsed.value,
    });
    if (error) return { error: friendlyDbError(error) };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // NEXT_REDIRECT
    return { error: friendlyDbError(e) };
  }

  revalidatePath("/colleges");
  if (slug) {
    revalidatePath(`/c/${slug}`);
    revalidatePath(`/c/${slug}/reviews`);
    redirect(`/c/${slug}/reviews`);
  }
  redirect("/colleges");
}

/** Edit the user's own visible review (row-level security scopes the update). */
export async function updateReview(
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const parsed = validateReviewInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const reviewId = String(formData.get("reviewId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!reviewId) return { error: "Missing review reference." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { error } = await supabase
      .from("reviews")
      .update(parsed.value)
      .eq("id", reviewId)
      .eq("user_id", user.id)
      .eq("status", "visible");
    if (error) return { error: friendlyDbError(error) };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // NEXT_REDIRECT
    return { error: friendlyDbError(e) };
  }

  revalidatePath("/colleges");
  if (slug) {
    revalidatePath(`/c/${slug}`);
    revalidatePath(`/c/${slug}/reviews`);
    redirect(`/c/${slug}/reviews`);
  }
  redirect("/colleges");
}

/** Toggle the viewer's "Helpful" upvote on a review (votes RLS: own rows). */
export async function toggleHelpful(formData: FormData): Promise<void> {
  const targetId = String(formData.get("reviewId") ?? "");
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
      .eq("target_type", "review")
      .eq("target_id", targetId);
  } else {
    await supabase
      .from("votes")
      .insert({ user_id: user.id, target_type: "review", target_id: targetId });
  }

  if (slug) {
    revalidatePath(`/c/${slug}/reviews`);
    revalidatePath(`/c/${slug}`);
  }
}
