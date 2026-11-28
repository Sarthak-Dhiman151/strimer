import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BadgeCheck } from "lucide-react";

import { ReviewForm } from "@/app/review/review-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCollegeBySlug, listColleges } from "@/lib/colleges";
import { getReviewById, getViewerReviewState } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "Write a review · Strimer",
  description:
    "Share a product-style review of your college — verified students and alumni only.",
};

type SearchParams = Promise<{ college?: string }>;

async function ReviewFormContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  let colleges: Awaited<ReturnType<typeof listColleges>> = [];
  let configured = true;
  try {
    colleges = await listColleges();
  } catch {
    configured = false;
  }

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reviews need Supabase</CardTitle>
          <CardDescription>
            Configure the environment, run the migrations and seed, then reload.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const preselected = sp.college
    ? await getCollegeBySlug(decodeURIComponent(sp.college))
    : null;
  const viewer = await getViewerReviewState(preselected?.id ?? "");

  if (preselected && !viewer.signedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Log in to review</CardTitle>
          <CardDescription>
            Reviews are written by logged-in, verified members only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            Log in
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (preselected && !viewer.verified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck className="size-5 text-primary" aria-hidden />
            Get verified first
          </CardTitle>
          <CardDescription>
            Only verified students and alumni can review {preselected.name}.
            Confirm your college email with a one-time code — it takes a minute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/verify" className={buttonVariants({ size: "sm" })}>
            Verify with college email
          </Link>
        </CardContent>
      </Card>
    );
  }

  const existing = viewer.ownReviewId
    ? await getReviewById(viewer.ownReviewId)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {preselected
            ? existing
              ? `Edit your review of ${preselected.name}`
              : `Review ${preselected.name}`
            : "Which college are you reviewing?"}
        </CardTitle>
        <CardDescription>
          {preselected
            ? existing
              ? "Your ratings and text update in place; the helpful votes stay."
              : `Be specific and fair — your review stays public on ${preselected.name}.`
            : "Only verified students and alumni can publish. One review per college."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ReviewForm
          colleges={colleges.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
          }))}
          preselectedId={preselected?.id}
          slug={preselected?.slug ?? ""}
          existing={existing}
          key={preselected?.id ?? "pick"}
        />
      </CardContent>
    </Card>
  );
}

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Write a review</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Six ratings, honest pros and cons, and a straight verdict.
      </p>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}
      >
        <ReviewFormContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
