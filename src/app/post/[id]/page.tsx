import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ArrowBigUp, BadgeCheck, Pin } from "lucide-react";

import {
  acceptAnswer,
  createComment,
  toggleCommentVote,
  togglePostVote,
} from "@/app/c/[slug]/community/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPostById,
  getPostComments,
  getVerifiedUserIds,
  getViewerCommunityState,
  getViewerVotedIds,
  type CommentRow,
} from "@/lib/community";
import { timeAgo, type ThreadComment } from "@/lib/community-helpers";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reply?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const post = await getPostById(id);
    if (post) {
      return {
        title: `${post.title} · Strimer`,
        description:
          post.body?.slice(0, 150) ??
          "Community discussion on Strimer, the college review platform.",
      };
    }
  } catch {
    // fall through to the default title
  }
  return { title: "Post · Strimer" };
}

function VoteBox({
  voteAction,
  targetId,
  postId,
  slug,
  score,
  voted,
  signedIn,
  size = "base",
}: {
  voteAction: (formData: FormData) => Promise<void>;
  targetId: string;
  postId?: string;
  slug?: string;
  score: number;
  voted: boolean;
  signedIn: boolean;
  size?: "base" | "small";
}) {
  return (
    <form
      action={signedIn ? voteAction : undefined}
      className={
        size === "small"
          ? "flex flex-col items-center gap-0.5 pt-1"
          : "flex w-14 shrink-0 flex-col items-center rounded-lg bg-muted py-2"
      }
    >
      <input type="hidden" name="commentId" value={targetId} />
      <input type="hidden" name="postId" value={postId ?? targetId} />
      <input type="hidden" name="slug" value={slug ?? ""} />
      <input type="hidden" name="voted" value={voted ? "1" : "0"} />
      {signedIn ? (
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label={voted ? "Remove upvote" : "Upvote"}
          className={voted ? "text-primary" : "text-muted-foreground"}
        >
          <ArrowBigUp
            className={size === "small" ? "size-4" : "size-6"}
            aria-hidden
            fill={voted ? "currentColor" : "none"}
          />
        </Button>
      ) : (
        <Link
          href="/login"
          aria-label="Log in to upvote"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <ArrowBigUp
            className={size === "small" ? "size-4" : "size-6"}
            aria-hidden
          />
        </Link>
      )}
      <span
        className={
          size === "small"
            ? "text-xs font-semibold"
            : "text-base leading-none font-bold"
        }
      >
        {score}
      </span>
    </form>
  );
}

function CommentItem({
  comment,
  postId,
  slug,
  signedIn,
  verifiedAuthorIds,
  acceptedId,
  isAsker,
  highlightId,
  votedComments,
}: {
  comment: ThreadComment<CommentRow>;
  postId: string;
  slug: string;
  signedIn: boolean;
  verifiedAuthorIds: Set<string>;
  acceptedId: string | null;
  isAsker: boolean;
  highlightId: string | null;
  votedComments: Set<string>;
}) {
  const isAccepted = acceptedId === comment.id;
  const highlight = highlightId === comment.id;
  const canReply = signedIn && comment.depth < 4;
  const indent = comment.depth > 0 ? "pl-4" : "";

  return (
    <div className={indent}>
      <article
        id={`comment-${comment.id}`}
        className={`scroll-mt-20 rounded-xl border bg-card p-4 shadow-sm ${
          isAccepted
            ? "border-primary/50"
            : highlight
              ? "border-amber-500/60"
              : ""
        }`}
      >
        {isAccepted ? (
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Pin className="size-3.5" aria-hidden /> Best answer — chosen by the
            asker
          </p>
        ) : null}
        <div className="flex gap-3">
          <VoteBox
            voteAction={toggleCommentVote}
            targetId={comment.id}
            postId={postId}
            slug={slug}
            score={comment.score}
            voted={votedComments.has(comment.id)}
            signedIn={signedIn}
            size="small"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {comment.body}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                @{comment.author?.handle ?? "member"}
                {verifiedAuthorIds.has(comment.user_id) ? (
                  <BadgeCheck
                    className="size-3.5 text-primary"
                    aria-label="Verified student or alumni"
                  />
                ) : null}
              </span>
              <span>· {timeAgo(comment.created_at)}</span>
              {canReply ? (
                <Link
                  href={`/post/${postId}?reply=${comment.id}#comment-${comment.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  · Reply
                </Link>
              ) : null}
              {isAsker && !acceptedId ? (
                <form action={acceptAnswer} className="inline">
                  <input type="hidden" name="commentId" value={comment.id} />
                  <input type="hidden" name="postId" value={postId} />
                  <input type="hidden" name="slug" value={slug} />
                  <Button
                    type="submit"
                    variant="link"
                    className="h-auto p-0 text-xs font-medium"
                  >
                    · Mark as best answer
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </article>

      {comment.children.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2 border-l pl-3">
          {comment.children.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              postId={postId}
              slug={slug}
              signedIn={signedIn}
              verifiedAuthorIds={verifiedAuthorIds}
              acceptedId={acceptedId}
              isAsker={isAsker}
              highlightId={highlightId}
              votedComments={votedComments}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function PostContent({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  let configured = true;
  let post: Awaited<ReturnType<typeof getPostById>> = null;
  let comments: ThreadComment<CommentRow>[] = [];
  let viewer = { signedIn: false, userId: null as string | null };
  let verified = new Set<string>();
  let votedComments = new Set<string>();
  let postVoted = false;
  try {
    post = await getPostById(id);
    if (post) {
      viewer = await getViewerCommunityState();
      const [c] = await Promise.all([getPostComments(post.id)]);
      comments = c;
      const commentIds = comments.flatMap((c2) => [c2.id, ...c2.children.map((r) => r.id)]);
      const authorIds = [
        ...new Set(comments.flatMap((c2) => [c2.user_id, ...c2.children.map((r) => r.user_id)])),
      ];
      const [votesC, votesP, v] = await Promise.all([
        getViewerVotedIds("comment", commentIds),
        getViewerVotedIds("post", [post.id]),
        getVerifiedUserIds(post.college_id, authorIds),
      ]);
      votedComments = votesC;
      postVoted = votesP.has(post.id);
      verified = v;
    }
  } catch {
    configured = false;
  }
  if (configured && !post) notFound();
  if (!post) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Post unavailable</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const isAsker = viewer.userId === post.user_id;
  const acceptedId = post.accepted_comment_id ?? null;
  const replyTo = sp.reply ?? null;
  const replyParent = replyTo
    ? comments
        .flatMap((c) => [c, ...c.children])
        .find((c) => c.id === replyTo)
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* Post header */}
      <article className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/c/${post.college?.slug ?? ""}/community`}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              ← /c/{post.college?.slug ?? ""}
            </Link>
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                post.flair === "question"
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {post.flair}
            </span>
            <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
              {post.title}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              @{post.author?.handle ?? "member"} · {timeAgo(post.created_at)} ·{" "}
              {post.comment_count}{" "}
              {post.comment_count === 1 ? "reply" : "replies"}
            </p>
          </div>
          <VoteBox
            voteAction={togglePostVote}
            targetId={post.id}
            slug={post.college?.slug ?? ""}
            score={post.score}
            voted={postVoted}
            signedIn={viewer.signedIn}
          />
        </div>
        {post.body ? (
          <p className="mt-3 border-t pt-3 text-sm leading-relaxed whitespace-pre-line">
            {post.body}
          </p>
        ) : null}
        {viewer.signedIn &&
        !isAsker &&
        post.flair === "question" &&
        !acceptedId ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Answer below — the asker picks the best answer, which stays pinned
            for future applicants.
          </p>
        ) : null}
      </article>

      {/* Reply box */}
      {viewer.signedIn ? (
        replyParent ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Replying to @{replyParent.author?.handle ?? "member"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createComment} className="flex flex-col gap-3">
                <input type="hidden" name="parentId" value={replyParent.id} />
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="slug" value={post.college?.slug ?? ""} />
                <textarea
                  name="body"
                  required
                  rows={4}
                  placeholder={`Reply to @${replyParent.author?.handle ?? "member"}…`}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={replyParent.depth >= 4}
                    title={
                      replyParent.depth >= 4
                        ? "Replies are capped at 4 levels"
                        : undefined
                    }
                  >
                    Post reply
                  </Button>
                  <Link
                    href={`/post/${post.id}`}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <form action={createComment} className="flex flex-col gap-3">
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="slug" value={post.college?.slug ?? ""} />
                <textarea
                  name="body"
                  required
                  rows={4}
                  placeholder={
                    post.flair === "question"
                      ? "Share what you know — specific, honest answers help applicants most."
                      : "Add to the discussion…"
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                <Button type="submit" className="self-start">
                  Post reply
                </Button>
              </form>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Log in to reply or upvote.
            </p>
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              Log in
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {post.comment_count} {post.comment_count === 1 ? "reply" : "replies"}
        </h2>
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {post.flair === "question"
              ? "No answers yet — yours could be the one that gets pinned."
              : "No replies yet."}
          </div>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={post.id}
              slug={post.college?.slug ?? ""}
              signedIn={viewer.signedIn}
              verifiedAuthorIds={verified}
              acceptedId={acceptedId}
              isAsker={isAsker}
              highlightId={replyTo}
              votedComments={votedComments}
            />
          ))
        )}
      </section>
    </div>
  );
}

export default async function PostPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}
      >
        <PostContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
