import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { toggleFollow } from "@/app/c/[slug]/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCollegeBySlug, getFollowState } from "@/lib/colleges";
import {
  feeRangeLabel,
  MIN_REVIEWS_FOR_RATING,
  ratingDisplay,
} from "@/lib/rating";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} · Strimer`,
    description: `Verified student reviews, ratings and community for ${slug}.`,
  };
}

const TABS = ["Overview", "Reviews", "Community", "Placements"] as const;

function Tabs({ active }: { active: (typeof TABS)[number] }) {
  return (
    <nav
      className="mb-5 flex gap-1 overflow-x-auto border-b"
      aria-label="College sections"
    >
      {TABS.map((tab) =>
        tab === active ? (
          <span
            key={tab}
            aria-current="page"
            className="-mb-px border-b-2 border-primary px-3 py-2 text-sm font-medium"
          >
            {tab}
          </span>
        ) : (
          <span
            key={tab}
            aria-disabled="true"
            title="Coming soon"
            className="px-3 py-2 text-sm text-muted-foreground/60"
          >
            {tab}
          </span>
        ),
      )}
    </nav>
  );
}

async function CollegeContent({ params }: Props) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw).toLowerCase();

  let college: Awaited<ReturnType<typeof getCollegeBySlug>> = null;
  let follow: Awaited<ReturnType<typeof getFollowState>> = {
    following: false,
    signedIn: false,
  };
  let configured = true;
  try {
    college = await getCollegeBySlug(slug);
    if (college) follow = await getFollowState(college.id);
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
            This environment has no Supabase configured. Set the env vars, run
            the migrations and seed, then reload.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rating = ratingDisplay(college.rating_cache, college.review_count);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl leading-snug font-bold">{college.name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {[college.city, college.state].filter(Boolean).join(", ") || "India"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
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
        </div>
      </div>

      <Tabs active="Overview" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {rating.visible ? `★ ${rating.label}` : "Rating hidden"}
          </CardTitle>
          <CardDescription>
            {rating.visible
              ? `Average of six aspects from ${rating.reviewCount} verified reviews`
              : `Average appears once ${MIN_REVIEWS_FOR_RATING} verified reviews are in — ${college.review_count} so far`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <form action={toggleFollow}>
            <input type="hidden" name="slug" value={college.slug} />
            <input type="hidden" name="collegeId" value={college.id} />
            <input
              type="hidden"
              name="following"
              value={follow.following ? "1" : "0"}
            />
            <Button
              type="submit"
              variant={follow.following ? "outline" : "default"}
              size="sm"
            >
              {follow.following ? "Following ✓" : "Follow"}
            </Button>
          </form>
          <Button size="sm" disabled title="Community is coming soon">
            Ask a question
          </Button>
          {college.website ? (
            <a
              href={college.website}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "link", size: "sm" })}
            >
              Website ↗
            </a>
          ) : null}
        </CardContent>
      </Card>

      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-3">
          <dt className="text-muted-foreground">Verified reviews</dt>
          <dd className="font-medium">{college.review_count}</dd>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <dt className="text-muted-foreground">Annual fee</dt>
          <dd className="font-medium">
            {feeRangeLabel(college.fee_min, college.fee_max)}
          </dd>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <dt className="text-muted-foreground">Type</dt>
          <dd className="font-medium capitalize">{college.type ?? "—"}</dd>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <dt className="text-muted-foreground">NIRF rank</dt>
          <dd className="font-medium">
            {college.nirf_rank ? `#${college.nirf_rank}` : "—"}
          </dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        Facts are pre-filled from public sources; the reviews tab, community and
        placement reports arrive in the next milestone steps.
      </p>
    </div>
  );
}

function CollegeSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function CollegePage({ params }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {/* params is runtime data under cacheComponents: await inside the boundary */}
      <Suspense fallback={<CollegeSkeleton />}>
        <CollegeContent params={params} />
      </Suspense>
    </div>
  );
}
