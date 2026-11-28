export const ASPECTS = [
  { key: "academics", label: "Academics" },
  { key: "faculty", label: "Faculty" },
  { key: "placements", label: "Placements" },
  { key: "campus_hostel", label: "Campus & hostel" },
  { key: "campus_life", label: "Campus life" },
  { key: "value_for_money", label: "Value for money" },
] as const;

export type AspectKey = (typeof ASPECTS)[number]["key"];

export const MIN_WRITTEN_CHARS = 150;

export type ValidatedReview = {
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
};

function rating(value: FormDataEntryValue | null): number {
  const n = Math.round(Number(value));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 0;
}

/**
 * Validates the review form. Returns either the DB-shaped row (plus the chosen
 * college) or the first user-facing error message. The 150-char minimum spans
 * pros + cons together (spec); ratings must be 1–5 (the DB also enforces this
 * via CHECK constraints — this gives friendly errors first).
 */
export function validateReviewInput(
  formData: FormData,
):
  | { ok: true; collegeId: string; value: ValidatedReview }
  | { ok: false; error: string } {
  const collegeId = String(formData.get("collegeId") ?? "");
  if (!collegeId) return { ok: false, error: "Pick a college first." };

  const aspects = Object.fromEntries(
    ASPECTS.map(({ key }) => [key, rating(formData.get(key))]),
  ) as Record<AspectKey, number>;

  const missing = ASPECTS.find(({ key }) => aspects[key] === 0);
  if (missing) {
    return { ok: false, error: `Rate "${missing.label}" from 1 to 5.` };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 8 || title.length > 120) {
    return { ok: false, error: "Give the review a title (8–120 characters)." };
  }

  const pros = String(formData.get("pros") ?? "").trim();
  const cons = String(formData.get("cons") ?? "").trim();
  if (pros.length + cons.length < MIN_WRITTEN_CHARS) {
    return {
      ok: false,
      error: `Pros and cons need at least ${MIN_WRITTEN_CHARS} characters combined — you have ${pros.length + cons.length}.`,
    };
  }

  const branch = String(formData.get("branch") ?? "")
    .trim()
    .slice(0, 80);
  const batchYearRaw = Math.round(Number(formData.get("batchYear")));
  const batchYear =
    Number.isInteger(batchYearRaw) &&
    batchYearRaw >= 1990 &&
    batchYearRaw <= 2100
      ? batchYearRaw
      : null;

  return {
    ok: true,
    collegeId,
    value: {
      branch: branch || null,
      batch_year: batchYear,
      ...aspects,
      title,
      pros,
      cons,
      would_choose_again: formData.get("wouldChooseAgain") === "yes",
      best_for:
        String(formData.get("bestFor") ?? "")
          .trim()
          .slice(0, 200) || null,
      not_for:
        String(formData.get("notFor") ?? "")
          .trim()
          .slice(0, 200) || null,
    },
  };
}
