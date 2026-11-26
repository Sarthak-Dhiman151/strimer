"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Follow/unfollow a college. Row-level security on `follows` guarantees the
 * rows are the caller's own (insert own, delete own) — this action adds the
 * sign-in redirect and nothing more.
 */
export async function toggleFollow(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const collegeId = String(formData.get("collegeId") ?? "");
  const isFollowing = String(formData.get("following") ?? "") === "1";
  if (!collegeId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (isFollowing) {
    await supabase
      .from("follows")
      .delete()
      .eq("user_id", user.id)
      .eq("college_id", collegeId);
  } else {
    await supabase
      .from("follows")
      .insert({ user_id: user.id, college_id: collegeId });
  }

  if (slug) revalidatePath(`/c/${slug}`);
}
