import Link from "next/link";

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
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Strimer
        </Link>
        {handle ? (
          <div className="flex items-center gap-2">
            <Link
              href="/verify"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Get verified
            </Link>
            <Link
              href={`/u/${handle}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              @{handle}
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
