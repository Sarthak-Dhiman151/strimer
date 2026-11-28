import { createClient } from "@/lib/supabase/server";
import { ASPECTS, type AspectKey } from "@/lib/review-validation";

export type ReviewRow = {
  id: string;
  user_id: string;
  branch: string | null;
  batch_year: number | null;
  academics: number;
  faculty: number;
  placements: number;
  campus_hostel: number;
  campus_life: number;
  value_for_money: number;
  title: string;
  pros: string;
  cons: string;
  would_choose_again: boolean;
  best_for: string | null;
  not_for: string | null;
  helpful_count: number;
  created_at: string;
  author: { handle: string } | null;
};

export type ReviewFilters = {
  branch?: string;
  batchYear?: number;
  sort?: "helpful" | "new";
};

const COLUMNS =
  "id, user_id, branch, batch_year, academics, faculty, placements, campus_hostel, campus_life, value_for_money, title, pros, cons, would_choose_again, best_for, not_for, helpful_count, created_at";

/** Visible reviews for a college, with author handles. */
export async function getCollegeReviews(
  collegeId: string,
  filters: ReviewFilters = {},
): Promise<ReviewRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("reviews")
    .select(`${COLUMNS}, author:users(handle)`)
    .eq("college_id", collegeId)
    .eq("status", "visible");
  if (filters.branch) q = q.eq("branch", filters.branch);
  if (filters.batchYear) q = q.eq("batch_year", filters.batchYear);
  q =
    filters.sort === "new"
      ? q.order("created_at", { ascending: false })
      : q
          .order("helpful_count", { ascending: false })
          .order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ReviewRow[];
}

export type RatingBreakdown = {
  count: number;
  overall: number | null;
  aspects: { key: AspectKey; label: string; average: number | null }[];
  histogram: number[]; // counts of rounded overall scores, index 0 = 1 star
  wouldChooseAgainPct: number | null;
};

function overallOf(r: {
  academics: number;
  faculty: number;
  placements: number;
  campus_hostel: number;
  campus_life: number;
  value_for_money: number;
}): number {
  return (
    (r.academics +
      r.faculty +
      r.placements +
      r.campus_hostel +
      r.campus_life +
      r.value_for_money) /
    6
  );
}

/** Per-aspect averages, histogram and would-choose-again share. */
export async function getRatingBreakdown(
  collegeId: string,
): Promise<RatingBreakdown> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "academics, faculty, placements, campus_hostel, campus_life, value_for_money, would_choose_again",
    )
    .eq("college_id", collegeId)
    .eq("status", "visible")
    .eq("is_verified", true);
  if (error) throw error;
  const rows = data ?? [];

  const count = rows.length;
  const aspects = ASPECTS.map(({ key, label }) => {
    const values = rows.map((r) => r[key]).filter((v) => v != null) as number[];
    const average =
      values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) /
          10
        : null;
    return { key, label, average };
  });

  const histogram = [0, 0, 0, 0, 0];
  for (const r of rows) histogram[Math.round(overallOf(r)) - 1] += 1;
  const overall =
    count > 0
      ? Math.round((rows.reduce((a, r) => a + overallOf(r), 0) / count) * 10) /
        10
      : null;

  const wouldChoose =
    count > 0 ? rows.filter((r) => r.would_choose_again).length : 0;

  return {
    count,
    overall,
    aspects,
    histogram,
    wouldChooseAgainPct:
      count > 0 ? Math.round((wouldChoose / count) * 100) : null,
  };
}

export type ViewerReviewState = {
  signedIn: boolean;
  verified: boolean;
  ownReviewId: string | null;
};

/** What the current viewer may do review-wise on this college. */
export async function getViewerReviewState(
  collegeId: string,
): Promise<ViewerReviewState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, verified: false, ownReviewId: null };

  const [{ count: approvedCount }, own] = await Promise.all([
    supabase
      .from("verifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("college_id", collegeId)
      .eq("status", "approved"),
    supabase
      .from("reviews")
      .select("id")
      .eq("user_id", user.id)
      .eq("college_id", collegeId)
      .eq("status", "visible")
      .maybeSingle(),
  ]);

  return {
    signedIn: true,
    verified: (approvedCount ?? 0) > 0,
    ownReviewId: own.data?.id ?? null,
  };
}

/** Review ids the current viewer has already upvoted ("Helpful"). */
export async function getViewerVotedReviewIds(
  reviewIds: string[],
): Promise<Set<string>> {
  if (reviewIds.length === 0) return new Set();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data, error } = await supabase
    .from("votes")
    .select("target_id")
    .eq("user_id", user.id)
    .eq("target_type", "review")
    .in("target_id", reviewIds);
  if (error) throw error;
  return new Set((data ?? []).map((v) => v.target_id));
}

/** One review by id (for edit prefill). */
export async function getReviewById(id: string): Promise<ReviewRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(`${COLUMNS}, author:users(handle)`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ReviewRow | null) ?? null;
}

/** Distinct branch / batch values present, for the review filters. */
export function collectFilterValues(reviews: ReviewRow[]): {
  branches: string[];
  batches: number[];
} {
  const branches = [
    ...new Set(
      reviews.map((r) => r.branch).filter((b): b is string => Boolean(b)),
    ),
  ].sort();
  const batches = [
    ...new Set(
      reviews.map((r) => r.batch_year).filter((b): b is number => b != null),
    ),
  ].sort((a, b) => b - a);
  return { branches, batches };
}
