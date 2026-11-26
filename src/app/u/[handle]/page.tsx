import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfileByHandle, type Profile } from "@/lib/profile";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle} · Strimer`,
    description: `Public profile of @${handle} on Strimer.`,
  };
}

function formatJoined(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function badgeLabel(p: Profile, v: (typeof p.badges)[number]): string {
  const kind = v.kind === "alumni" ? "Verified alumni" : "Verified student";
  const context = v.branch
    ? `${v.branch}${v.batch_year ? ` ${v.batch_year}` : ""}`
    : null;
  return [kind, context, v.college_name].filter(Boolean).join(" · ");
}

async function ProfileContent({ params }: Props) {
  const { handle: raw } = await params;
  const handle = decodeURIComponent(raw).toLowerCase();

  let profile: Profile | null = null;
  let configured = true;
  try {
    profile = await getProfileByHandle(handle);
  } catch {
    configured = false;
  }
  if (configured && !profile) notFound();

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {profile ? profile.handle.charAt(0).toUpperCase() : "?"}
        </div>
        <CardTitle className="text-xl">@{handle}</CardTitle>
        {profile ? (
          <CardDescription>
            Member since {formatJoined(profile.created_at)} · {profile.karma}{" "}
            {profile.karma === 1 ? "karma point" : "karma points"}
          </CardDescription>
        ) : (
          <CardDescription>
            Profile unavailable in this environment.
          </CardDescription>
        )}
      </CardHeader>
      {profile && profile.badges.length > 0 ? (
        <CardContent className="flex flex-col gap-2">
          {profile.badges.map((v, i) => (
            <div
              key={i}
              className="rounded-md border bg-muted/50 px-3 py-2 text-sm"
            >
              <span aria-hidden>✓ </span>
              {badgeLabel(profile, v)}
            </div>
          ))}
        </CardContent>
      ) : null}
      {profile && profile.badges.length === 0 ? (
        <CardContent className="text-sm text-muted-foreground">
          No verified college badge yet.
        </CardContent>
      ) : null}
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 size-16 animate-pulse rounded-full bg-muted" />
        <CardTitle className="text-xl">…</CardTitle>
      </CardHeader>
    </Card>
  );
}

export default function ProfilePage({ params }: Props) {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-10">
      {/* params is runtime data under cacheComponents: await it inside the boundary */}
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent params={params} />
      </Suspense>
    </div>
  );
}
