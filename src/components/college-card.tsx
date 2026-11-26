import Link from "next/link";

import { feeRangeLabel, ratingDisplay } from "@/lib/rating";
import type { CollegeCardData } from "@/lib/colleges";

export function CollegeCard({ college }: { college: CollegeCardData }) {
  const rating = ratingDisplay(college.rating_cache, college.review_count);

  return (
    <Link
      href={`/c/${college.slug}`}
      className="block rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="leading-snug font-semibold">{college.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {[college.city, college.state].filter(Boolean).join(", ") ||
              "India"}
          </p>
        </div>
        {rating.visible ? (
          <div className="shrink-0 rounded-lg bg-primary px-2 py-1 text-center text-primary-foreground">
            <div className="text-base leading-none font-bold">
              {rating.label}
            </div>
            <div className="text-[10px] opacity-90">★</div>
          </div>
        ) : (
          <div className="shrink-0 rounded-lg border border-dashed px-2 py-1 text-center text-[10px] leading-tight text-muted-foreground">
            rating
            <br />
            hidden
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {college.type ? (
          <span className="rounded-full bg-muted px-2 py-0.5 capitalize">
            {college.type}
          </span>
        ) : null}
        {college.nirf_rank ? (
          <span className="rounded-full bg-muted px-2 py-0.5">
            NIRF #{college.nirf_rank}
          </span>
        ) : null}
        <span className="rounded-full bg-muted px-2 py-0.5">
          {feeRangeLabel(college.fee_min, college.fee_max)}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5">
          {college.review_count}{" "}
          {college.review_count === 1 ? "review" : "reviews"}
        </span>
      </div>
    </Link>
  );
}
