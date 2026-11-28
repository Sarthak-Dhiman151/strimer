import Link from "next/link";

import { Bell, GraduationCap } from "lucide-react";

import { signOut } from "@/app/login/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getOwnProfile } from "@/lib/profile";

export async function SiteHeader() {
  let handle: string | null = null;
  let unread = 0;
  try {
    const profile = await getOwnProfile();
    handle = profile?.handle ?? null;
    if (handle) unread = await getUnreadNotificationCount();
  } catch {
    // Supabase not configured (fresh clone / preview) — render signed-out state.
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-2 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          <span className="text-lg">Strimer</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/colleges"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Colleges
          </Link>
          {handle ? (
            <>
              <Link
                href="/notifications"
                aria-label={
                  unread > 0
                    ? `Notifications, ${unread} unread`
                    : "Notifications"
                }
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                  className: "relative px-2",
                })}
              >
                <Bell className="size-4" aria-hidden />
                {unread > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/verify"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <span className="sm:hidden">Verify</span>
                <span className="hidden sm:inline">Get verified</span>
              </Link>
              <Link
                href={`/u/${handle}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                @{handle}
              </Link>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  <span className="sm:hidden">Exit</span>
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
