import Link from "next/link";

import { MapPin, Star } from "lucide-react";

import type { CollegeCardData } from "@/lib/colleges";
import { feeRangeLabel, ratingDisplay } from "@/lib/rating";

export function CollegeCard({ college }: { college: CollegeCardData }) {
  const rating = ratingDisplay(college.rating_cache, college.review_count);

  return (
    <Link
      href={`/c/${college.slug}`}
      className="group block rounded-xl border bg-card p-4 shadow-sm transition-colors outline-none hover:border-primary/40 hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="leading-snug font-semibold group-hover:text-primary">
            {college.name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {[college.city, college.state].filter(Boolean).join(", ") ||
              "India"}
          </p>
        </div>
        {rating.visible ? (
          <div className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-primary-foreground">
            <Star className="size-4 fill-current" aria-hidden />
            <span className="text-sm leading-none font-bold">
              {rating.label}
            </span>
          </div>
        ) : (
          <div
            className="shrink-0 rounded-lg border border-dashed px-2 py-1.5 text-center text-[10px] leading-tight text-muted-foreground"
            title="Ratings appear after 5 verified reviews"
          >
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
