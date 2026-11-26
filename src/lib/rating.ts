/**
 * UI-layer enforcement of non-negotiable rule 5: a college's average rating is
 * hidden until it has at least 5 verified reviews. The database already hides
 * `rating_cache` below 5 (trigger) — this mirrors the rule so the interface can
 * never leak it either.
 */
export type RatingDisplay =
  | { visible: true; average: number; reviewCount: number; label: string }
  | { visible: false; average: null; reviewCount: number; label: string };

export const MIN_REVIEWS_FOR_RATING = 5;

export function ratingDisplay(
  ratingCache: number | null,
  reviewCount: number,
): RatingDisplay {
  if (ratingCache !== null && reviewCount >= MIN_REVIEWS_FOR_RATING) {
    return {
      visible: true,
      average: ratingCache,
      reviewCount,
      label: ratingCache.toFixed(1),
    };
  }
  return {
    visible: false,
    average: null,
    reviewCount,
    label: "Not enough verified reviews yet",
  };
}

/** 180000 -> "₹1.8L", 1200000 -> "₹12L" (Indian lakh notation). */
export function formatFeeCompact(rupeesPerYear: number): string {
  if (rupeesPerYear < 0) return "—";
  const lakhs = rupeesPerYear / 100000;
  const value = Number.isInteger(lakhs) ? String(lakhs) : lakhs.toFixed(1);
  return `₹${value}L`;
}

/** "₹1.8L–₹2.2L a year", or a single value, or "—" when unknown. */
export function feeRangeLabel(
  feeMin: number | null,
  feeMax: number | null,
): string {
  if (feeMin !== null && feeMax !== null) {
    if (feeMin === feeMax) return `${formatFeeCompact(feeMin)}/yr`;
    return `${formatFeeCompact(feeMin)}–${formatFeeCompact(feeMax)}/yr`;
  }
  if (feeMin !== null) return `from ${formatFeeCompact(feeMin)}/yr`;
  if (feeMax !== null) return `up to ${formatFeeCompact(feeMax)}/yr`;
  return "—";
}
