import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MessageSquare, MessageSquarePlus, Plus } from "lucide-react";

import { CollegeTabs } from "@/components/college-tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCollegeBySlug } from "@/lib/colleges";
import {
  getViewerCommunityState,
  listPosts,
  type PostRow,
} from "@/lib/community";
import { timeAgo } from "@/lib/community-helpers";

export const metadata: Metadata = {
  title: "community · Strimer",
  description: "Ask questions and talk with verified students and alumni.",
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ flair?: string; sort?: string; unanswered?: string }>;
};

const FLAIRS = ["question", "discussion", "advice", "event"] as const;
const SORTS = ["hot", "new", "top"] as const;

const FLAIR_STYLES: Record<(typeof FLAIRS)[number], string> = {
  question: "bg-primary/10 text-primary",
  discussion: "bg-secondary text-secondary-foreground",
  advice: "bg-amber-500/15 text-amber-700",
  event: "bg-emerald-500/15 text-emerald-700",
};

function PostExcerpt({ post }: { post: PostRow }) {
  if (!post.body) return null;
  const oneLine = post.body.replace(/\s+/g, " ").trim();
  return (
    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
      {oneLine.slice(0, 180)}
    </p>
  );
}

function PostRowItem({
  post,
  collegeSlug,
}: {
  post: PostRow;
  collegeSlug: string;
}) {
  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${FLAIR_STYLES[post.flair]}`}
          >
            {post.flair}
          </span>
          <h3 className="mt-1.5 leading-snug font-semibold">
            <Link
              href={`/post/${post.id}`}
              className="hover:text-primary hover:underline"
            >
              {post.title}
            </Link>
          </h3>
          <PostExcerpt post={post} />
          <p className="mt-2 text-xs text-muted-foreground">
            @{post.author?.handle ?? "member"} · {timeAgo(post.created_at)} ·{" "}
            {post.flair === "question" && post.accepted_comment_id
              ? "answered ✓ · "
              : ""}
            {post.comment_count}{" "}
            {post.comment_count === 1 ? "reply" : "replies"}
          </p>
        </div>
        <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-muted py-1.5">
          <span className="text-sm leading-none font-bold">{post.score}</span>
          <span className="text-[10px] text-muted-foreground">upvotes</span>
        </div>
      </div>
      <p className="mt-3 border-t pt-2 text-xs">
        <Link
          href={`/post/${post.id}`}
          className="font-medium text-primary hover:underline"
        >
          {post.flair === "question" ? "View answers" : "Open thread"}
        </Link>
        <span className="text-muted-foreground"> · in /c/{collegeSlug}</span>
      </p>
    </article>
  );
}

async function CommunityContent({ params, searchParams }: Props) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw).toLowerCase();
  const sp = await searchParams;

  let college: Awaited<ReturnType<typeof getCollegeBySlug>> = null;
  let posts: Awaited<ReturnType<typeof listPosts>> = [];
  let viewer = { signedIn: false, userId: null as string | null };
  let configured = true;
  try {
    college = await getCollegeBySlug(slug);
    if (college) {
      const flair = (FLAIRS as readonly string[]).includes(sp.flair ?? "")
        ? (sp.flair as (typeof FLAIRS)[number])
        : undefined;
      const sort = (SORTS as readonly string[]).includes(sp.sort ?? "")
        ? (sp.sort as (typeof SORTS)[number])
        : "hot";
      const unanswered = sp.unanswered === "1";
      [posts, viewer] = await Promise.all([
        listPosts(college.id, { flair, sort, unanswered }),
        getViewerCommunityState(),
      ]);
    }
  } catch {
    configured = false;
  }
  if (configured && !college) notFound();
  if (!college) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community unavailable</CardTitle>
          <CardDescription>
            This environment has no Supabase configured.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const flair = (FLAIRS as readonly string[]).includes(sp.flair ?? "")
    ? (sp.flair as (typeof FLAIRS)[number])
    : undefined;
  const sort = (SORTS as readonly string[]).includes(sp.sort ?? "")
    ? (sp.sort as (typeof SORTS)[number])
    : "hot";
  const unanswered = sp.unanswered === "1";

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <div className="flex flex-col gap-5">
      <CollegeTabs slug={college.slug} active="community" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {college.name} community
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask anything — verified seniors answer, best answers stay pinned.
          </p>
        </div>
        {viewer.signedIn ? (
          <Link
            href={`/c/${college.slug}/community/new?flair=question`}
            className={buttonVariants({ size: "sm" })}
          >
            <MessageSquarePlus className="size-4" aria-hidden />
            Ask a question
          </Link>
        ) : (
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            Log in to ask
          </Link>
        )}
      </div>

      {/* Filters */}
      <form
        method="get"
        action={`/c/${college.slug}/community`}
        className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3"
      >
        <select
          name="flair"
          defaultValue={sp.flair ?? ""}
          className={selectClass}
          aria-label="Flair"
        >
          <option value="">All flairs</option>
          {FLAIRS.map((f) => (
            <option key={f} value={f} className="capitalize">
              {f}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className={selectClass}
          aria-label="Sort"
        >
          {SORTS.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="unanswered"
            value="1"
            defaultChecked={unanswered}
            className="size-4 accent-primary"
          />
          Unanswered
        </label>
        <Button type="submit" size="sm" variant="outline">
          Apply
        </Button>
        {flair || unanswered ? (
          <Link
            href={`/c/${college.slug}/community`}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <MessageSquare
            className="size-8 text-muted-foreground/50"
            aria-hidden
          />
          <p className="max-w-sm text-sm text-muted-foreground">
            {unanswered
              ? "Every question has an answer right now — ask the next one."
              : "No posts yet. Be the first to ask — verified seniors are watching this college."}
          </p>
          {viewer.signedIn ? (
            <Link
              href={`/c/${college.slug}/community/new`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Plus className="size-4" aria-hidden />
              Start a post
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <PostRowItem key={p.id} post={p} collegeSlug={college.slug} />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function CommunityPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Suspense
        fallback={
          <div className="flex flex-col gap-3">
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
          </div>
        }
      >
        <CommunityContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
