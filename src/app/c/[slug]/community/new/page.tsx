import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PostForm } from "@/app/c/[slug]/community/post-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCollegeBySlug } from "@/lib/colleges";
import { getViewerCommunityState } from "@/lib/community";

export const metadata: Metadata = {
  title: "New post · Strimer",
  description: "Start a discussion or ask a question in the college community.",
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ flair?: string }>;
};

async function NewPostContent({ params, searchParams }: Props) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw).toLowerCase();
  const sp = await searchParams;

  let college: Awaited<ReturnType<typeof getCollegeBySlug>> = null;
  let viewer = { signedIn: false, userId: null as string | null };
  let configured = true;
  try {
    college = await getCollegeBySlug(slug);
    if (college) viewer = await getViewerCommunityState();
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

  if (!viewer.signedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Log in to post</CardTitle>
          <CardDescription>
            Only signed-in members can post in the {college.name} community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className={buttonVariants()}>
            Log in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New post in /c/{college.slug}</CardTitle>
        <CardDescription>
          {college.name} — ask as yourself, stay anonymous to readers. Your
          handle is all anyone sees.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PostForm
          collegeId={college.id}
          slug={college.slug}
          defaultFlair={sp.flair}
        />
      </CardContent>
    </Card>
  );
}

export default async function NewPostPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}
      >
        <NewPostContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
