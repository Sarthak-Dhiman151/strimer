import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  BadgeCheck,
  Bell,
  BellOff,
  EyeOff,
  MessageSquare,
  Pin,
  ThumbsUp,
} from "lucide-react";

import { markAllRead } from "@/app/notifications/actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listNotifications,
  resolveNotificationItems,
  type NotificationItem,
  type NotificationRow,
} from "@/lib/notifications";
import { timeAgo } from "@/lib/community-helpers";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Notifications · Strimer",
  description: "Replies, best answers, votes and verification updates.",
};

function TypeIcon({ type }: { type: NotificationItem["type"] }) {
  const cls = "size-4 shrink-0";
  switch (type) {
    case "reply":
      return <MessageSquare className={cls} aria-hidden />;
    case "answer":
      return <Pin className={cls} aria-hidden />;
    case "helpful_vote":
      return <ThumbsUp className={cls} aria-hidden />;
    case "verification_approved":
      return <BadgeCheck className={cls} aria-hidden />;
    case "moderation":
      return <EyeOff className={cls} aria-hidden />;
    default:
      return <Bell className={cls} aria-hidden />;
  }
}

function NotificationList({ items }: { items: NotificationItem[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className={`flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 ${
              item.read ? "opacity-70" : ""
            }`}
          >
            <span className="mt-0.5 text-muted-foreground">
              <TypeIcon type={item.type} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                {!item.read ? (
                  <span
                    className="size-2 shrink-0 rounded-full bg-primary"
                    aria-label="Unread"
                  />
                ) : null}
                <span className="truncate text-sm font-medium">
                  {item.headline}
                </span>
              </span>
              {item.excerpt ? (
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {item.excerpt}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {timeAgo(item.created_at)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function NotificationsContent() {
  let configured = true;
  let signedIn = false;
  let rows: NotificationRow[] = [];
  let items: NotificationItem[] = [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
    if (user) {
      rows = await listNotifications();
      items = await resolveNotificationItems(rows);
    }
  } catch {
    configured = false;
  }

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This environment has no Supabase configured.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!signedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Log in to see your notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/login" className={buttonVariants()}>
            Log in
          </Link>
        </CardContent>
      </Card>
    );
  }

  const unread = rows.filter((r) => r.read_at === null).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0
              ? `${unread} unread — replies, best answers and votes land here.`
              : "You're all caught up."}
          </p>
        </div>
        {unread > 0 ? (
          <form action={markAllRead}>
            <button
              type="submit"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Mark all read
            </button>
          </form>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <BellOff className="size-8 text-muted-foreground/50" aria-hidden />
          <p className="max-w-sm text-sm text-muted-foreground">
            Nothing yet. When someone replies to your posts, votes for your
            reviews or picks your answer, you&apos;ll see it here.
          </p>
        </div>
      ) : (
        <NotificationList items={items} />
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}
      >
        <NotificationsContent />
      </Suspense>
    </div>
  );
}
