import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MessageSquarePlus, PenLine, Star, ThumbsUp } from "lucide-react";

import { toggleHelpful } from "@/app/review/actions";
import { CollegeTabs } from "@/components/college-tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCollegeBySlug } from "@/lib/colleges";
import { MIN_WRITTEN_CHARS } from "@/lib/review-validation";
import {
  collectFilterValues,
  getCollegeReviews,
  getRatingBreakdown,
  getViewerReviewState,
  getViewerVotedReviewIds,
  type ReviewRow,
} from "@/lib/reviews";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ branch?: string; batch?: string; sort?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} reviews · Strimer`,
    description: `Verified student reviews of ${slug} — aspect ratings, pros and cons, verdicts.`,
  };
}

function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "size-3.5" : "size-5";
  return (
    <div
      className="flex items-center gap-0.5 text-amber-400"
      aria-label={`${value} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < Math.round(value) ? "fill-current" : "opacity-30"}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function ReviewCard({
  review,
  slug,
  voted,
  isOwn,
}: {
  review: ReviewRow;
  slug: string;
  voted: boolean;
  isOwn: boolean;
}) {
  const overall =
    (review.academics +
      review.faculty +
      review.placements +
      review.campus_hostel +
      review.campus_life +
      review.value_for_money) /
    6;

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/u/${review.author?.handle ?? ""}`}
              className="text-sm font-semibold hover:underline"
            >
              @{review.author?.handle ?? "member"}
            </Link>
            <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Star className="size-3 fill-current" aria-hidden />
              Verified
            </span>
            {review.branch || review.batch_year ? (
              <span className="text-xs text-muted-foreground">
                {[review.branch, review.batch_year].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(review.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Stars value={overall} size="sm" />
          <span className="text-sm font-bold">{overall.toFixed(1)}</span>
        </div>
      </div>

      <h3 className="mt-3 leading-snug font-semibold">{review.title}</h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-secondary/60 p-3">
          <p className="text-xs font-semibold tracking-wide text-secondary-foreground uppercase">
            Pros
          </p>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">
            {review.pros}
          </p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Cons
          </p>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">
            {review.cons}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2.5 py-1 font-medium ${review.would_choose_again ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
        >
          {review.would_choose_again
            ? "✓ Would choose again"
            : "✗ Would not choose again"}
        </span>
        {review.best_for ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            Best for: {review.best_for}
          </span>
        ) : null}
        {review.not_for ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            Not for: {review.not_for}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        {voted ? (
          <form action={toggleHelpful}>
            <input type="hidden" name="reviewId" value={review.id} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="voted" value="1" />
            <Button type="submit" variant="secondary" size="sm">
              <ThumbsUp className="size-4" aria-hidden />
              Helpful ({review.helpful_count})
            </Button>
          </form>
        ) : (
          <form action={toggleHelpful}>
            <input type="hidden" name="reviewId" value={review.id} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="voted" value="0" />
            <Button type="submit" variant="ghost" size="sm">
              <ThumbsUp className="size-4" aria-hidden />
              Helpful ({review.helpful_count})
            </Button>
          </form>
        )}
        {isOwn ? (
          <Link
            href={`/review/new?college=${slug}`}
            className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <PenLine className="size-3.5" aria-hidden />
            Edit
          </Link>
        ) : (
          <span
            className="text-sm text-muted-foreground/60"
            title="Reporting arrives with the trust tools"
          >
            Report
          </span>
        )}
      </div>
    </article>
  );
}

async function ReviewsContent({ params, searchParams }: Props) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw).toLowerCase();
  const sp = await searchParams;

  let college: Awaited<ReturnType<typeof getCollegeBySlug>> = null;
  let configured = true;
  try {
    college = await getCollegeBySlug(slug);
  } catch {
    configured = false;
  }
  if (configured && !college) notFound();
  if (!college) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>College data unavailable</CardTitle>
          <CardDescription>
            This environment has no Supabase configured.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [breakdown, viewer] = await Promise.all([
    getRatingBreakdown(college.id),
    getViewerReviewState(college.id),
  ]);

  const reviews = await getCollegeReviews(college.id, {
    branch: sp.branch || undefined,
    batchYear: sp.batch ? Number(sp.batch) : undefined,
    sort: sp.sort === "new" ? "new" : "helpful",
  });
  const votedIds = await getViewerVotedReviewIds(reviews.map((r) => r.id));
  const { branches, batches } = collectFilterValues(reviews);

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";
  const hasFilters = Boolean(sp.branch || sp.batch);

  return (
    <div className="flex flex-col gap-5">
      <CollegeTabs slug={college.slug} active="reviews" />
      {/* Breakdown */}
      <Card>
        <CardHeader>
          {breakdown.overall !== null ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none font-bold">
                {breakdown.overall.toFixed(1)}
              </span>
              <Stars value={breakdown.overall} />
            </div>
          ) : (
            <CardTitle>Aspect breakdown</CardTitle>
          )}
          <CardDescription>
            {breakdown.count >= 5
              ? `From ${breakdown.count} verified reviews`
              : `Average appears after 5 verified reviews — ${breakdown.count} so far. Aspect details below come from ${breakdown.count} verified ${breakdown.count === 1 ? "review" : "reviews"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {breakdown.aspects.map((a) => (
              <div key={a.key}>
                <div className="flex items-center justify-between text-sm">
                  <span>{a.label}</span>
                  <span className="font-semibold">
                    {a.average?.toFixed(1) ?? "—"}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${((a.average ?? 0) / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Star distribution
              </p>
              <div className="mt-2 flex items-end gap-2">
                {breakdown.histogram
                  .map((n, i) => ({ n, stars: i + 1 }))
                  .reverse()
                  .map(({ n, stars }) => (
                    <div
                      key={stars}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <span className="text-xs font-medium">{n || ""}</span>
                      <div
                        className="w-full rounded-t bg-primary/70"
                        style={{
                          height: `${Math.max(4, (n / Math.max(1, Math.max(...breakdown.histogram))) * 40)}px`,
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {stars}★
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Would choose again
              </p>
              <p className="mt-1 text-2xl font-bold">
                {breakdown.wouldChooseAgainPct !== null
                  ? `${breakdown.wouldChooseAgainPct}%`
                  : "—"}
              </p>
              <div className="mt-2 h-2 w-40 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${breakdown.wouldChooseAgainPct ?? 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <form
        method="get"
        action={`/c/${slug}/reviews`}
        className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3"
      >
        <select
          name="branch"
          defaultValue={sp.branch ?? ""}
          className={selectClass}
          aria-label="Branch"
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          name="batch"
          defaultValue={sp.batch ?? ""}
          className={selectClass}
          aria-label="Batch year"
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sp.sort ?? "helpful"}
          className={selectClass}
          aria-label="Sort"
        >
          <option value="helpful">Most helpful</option>
          <option value="new">Newest</option>
        </select>
        <Button type="submit" size="sm" variant="outline">
          Apply
        </Button>
        {hasFilters ? (
          <Link
            href={`/c/${slug}/reviews`}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {/* CTA */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {reviews.length}
          </span>{" "}
          {reviews.length === 1 ? "review" : "reviews"}
        </p>
        {viewer.verified ? (
          <Link
            href={`/review/new?college=${slug}`}
            className={buttonVariants({ size: "sm" })}
          >
            <PenLine className="size-4" aria-hidden />
            {viewer.ownReviewId ? "Edit your review" : "Write a review"}
          </Link>
        ) : (
          <Link
            href="/verify"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <MessageSquarePlus className="size-4" aria-hidden />
            Verify to review
          </Link>
        )}
      </div>

      {/* Cards */}
      {reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            No {hasFilters ? "" : "visible "}reviews here yet
            {hasFilters ? " for these filters" : ""}. Pros and cons need{" "}
            {MIN_WRITTEN_CHARS}+ characters, so every published review has
            substance.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              slug={slug}
              voted={votedIds.has(r.id)}
              isOwn={viewer.ownReviewId === r.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Suspense
        fallback={
          <div className="flex flex-col gap-3">
            <div className="h-56 animate-pulse rounded-xl bg-muted" />
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          </div>
        }
      >
        <ReviewsContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
