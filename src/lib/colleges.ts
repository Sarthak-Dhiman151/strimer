import { createClient } from "@/lib/supabase/server";

export type CollegeCardData = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  type: "government" | "private" | null;
  nirf_rank: number | null;
  fee_min: number | null;
  fee_max: number | null;
  rating_cache: number | null;
  review_count: number;
};

export type CollegeFilters = {
  state?: string;
  type?: "government" | "private";
  maxFee?: number;
  ratedOnly?: boolean;
};

/** All colleges for the browse page. Public data — anonymous readable. */
export async function listColleges(
  filters: CollegeFilters = {},
): Promise<CollegeCardData[]> {
  const supabase = await createClient();
  let q = supabase
    .from("colleges")
    .select(
      "id, slug, name, city, state, type, nirf_rank, fee_min, fee_max, rating_cache, review_count",
    );
  if (filters.state) q = q.eq("state", filters.state);
  if (filters.type) q = q.eq("type", filters.type);
  if (filters.maxFee) q = q.lte("fee_max", filters.maxFee);
  if (filters.ratedOnly) q = q.not("rating_cache", "is", null);

  const { data, error } = await q.order("rating_cache", {
    ascending: false,
    nullsFirst: false,
  });
  if (error) throw error;
  return (data ?? []) as CollegeCardData[];
}

/** Distinct states present in the directory, for the filter dropdown. */
export async function listCollegeStates(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colleges")
    .select("state")
    .order("state");
  if (error) throw error;
  const states = (data ?? [])
    .map((r) => r.state)
    .filter((s): s is string => Boolean(s));
  return [...new Set(states)];
}

export type CollegeDetail = CollegeCardData & {
  website: string | null;
  email_domains: string[];
  updated_at: string;
};

/** One college by slug, for the overview page. */
export async function getCollegeBySlug(
  slug: string,
): Promise<CollegeDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colleges")
    .select(
      "id, slug, name, city, state, type, nirf_rank, fee_min, fee_max, rating_cache, review_count, website, email_domains, updated_at",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as CollegeDetail | null) ?? null;
}

export type FollowState = { following: boolean; signedIn: boolean };

/** Whether the current viewer follows the college (for the Follow button). */
export async function getFollowState(collegeId: string): Promise<FollowState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { following: false, signedIn: false };
  const { count, error } = await supabase
    .from("follows")
    .select("college_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("college_id", collegeId);
  if (error) throw error;
  return { following: (count ?? 0) > 0, signedIn: true };
}
