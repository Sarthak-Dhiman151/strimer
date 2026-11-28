import Link from "next/link";

import { GraduationCap } from "lucide-react";

import { signOut } from "@/app/login/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { getOwnProfile } from "@/lib/profile";

export async function SiteHeader() {
  let handle: string | null = null;
  try {
    const profile = await getOwnProfile();
    handle = profile?.handle ?? null;
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
