import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Building2, MapPin, Star } from "lucide-react";

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

function Stars({ value }: { value: number }) {
  const filled = Math.round(value);
  return (
    <div
      className="flex items-center gap-0.5 text-amber-400"
      aria-label={`${value} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={i < filled ? "size-5 fill-current" : "size-5 opacity-30"}
          aria-hidden
        />
      ))}
    </div>
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
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <div>
        <div className="flex items-start gap-3">
          <span className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground sm:flex">
            <Building2 className="size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
              {college.name}
            </h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {[college.city, college.state].filter(Boolean).join(", ") ||
                "India"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          {college.type ? (
            <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground capitalize">
              {college.type}
            </span>
          ) : null}
          {college.nirf_rank ? (
            <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
              NIRF #{college.nirf_rank}
            </span>
          ) : null}
          <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
            {feeRangeLabel(college.fee_min, college.fee_max)}
          </span>
        </div>
      </div>

      <Tabs active="Overview" />

      {/* Rating card — rule 5 is shown honestly in both states */}
      <Card>
        <CardHeader>
          {rating.visible ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-3xl leading-none font-bold">
                  {rating.label}
                </span>
                <Stars value={rating.average} />
              </div>
              <CardDescription>
                Average of six aspects from {rating.reviewCount} verified
                reviews
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-lg">Rating hidden</CardTitle>
              <CardDescription>
                A college&apos;s average appears only after{" "}
                {MIN_REVIEWS_FOR_RATING} verified reviews — this college has{" "}
                {college.review_count} so far.
              </CardDescription>
              <div
                className="mt-1 h-2 w-40 overflow-hidden rounded-full bg-muted"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(100, (college.review_count / MIN_REVIEWS_FOR_RATING) * 100)}%`,
                  }}
                />
              </div>
            </>
          )}
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

      {/* Facts */}
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {[
          { label: "Verified reviews", value: String(college.review_count) },
          {
            label: "Annual fee",
            value: feeRangeLabel(college.fee_min, college.fee_max),
          },
          { label: "Type", value: college.type ?? "—" },
          {
            label: "NIRF rank",
            value: college.nirf_rank ? `#${college.nirf_rank}` : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-muted-foreground">
        Facts are pre-filled from public sources. The reviews tab, community and
        placement reports arrive in the next milestone.
      </p>
    </div>
  );
}

function CollegeSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-9 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-36 animate-pulse rounded-xl bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function CollegePage({ params }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* params is runtime data under cacheComponents: await inside the boundary */}
      <Suspense fallback={<CollegeSkeleton />}>
        <CollegeContent params={params} />
      </Suspense>
    </div>
  );
}
