import { createClient } from "@/lib/supabase/server";

export type ProfileRow = {
  id: string;
  handle: string;
  role: "member" | "moderator" | "admin";
  karma: number;
  created_at: string;
};

export type VerifiedBadge = {
  college_name: string | null;
  college_slug: string;
  kind: "student" | "alumni";
  branch: string | null;
  batch_year: number | null;
};

export type Profile = ProfileRow & { badges: VerifiedBadge[] };

/** The logged-in user's own profile row, or null when signed out. */
export async function getOwnProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, handle, role, karma, created_at")
    .eq("id", user.id)
    .maybeSingle();
  return (data as ProfileRow | null) ?? null;
}

/** A public profile by handle, with approved verification badges. */
export async function getProfileByHandle(
  handle: string,
): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select(
      "id, handle, role, karma, created_at, verifications(kind, branch, batch_year, status, colleges(name, slug))",
    )
    .eq("handle", handle)
    .eq("status", "visible")
    .eq("verifications.status", "approved")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const badges: VerifiedBadge[] = (data.verifications ?? []).map((v) => ({
    college_name: v.colleges?.name ?? null,
    college_slug: v.colleges?.slug ?? "",
    kind: v.kind,
    branch: v.branch,
    batch_year: v.batch_year,
  }));

  return {
    id: data.id,
    handle: data.handle,
    role: data.role,
    karma: data.karma,
    created_at: data.created_at,
    badges,
  };
}
