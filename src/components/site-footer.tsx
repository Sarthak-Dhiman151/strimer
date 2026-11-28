import Link from "next/link";

import { GraduationCap, ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-bold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-4" aria-hidden />
            </span>
            Strimer
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Verified student reviews and real senior answers for Indian
            colleges. Trust is the product.
          </p>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            Colleges cannot pay to change a rating or remove a review.
          </p>
        </div>

        <nav aria-label="Explore">
          <h2 className="text-sm font-semibold">Explore</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <Link
                href="/colleges"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Browse colleges
              </Link>
            </li>
            <li>
              <Link
                href="/verify"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Get verified
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Log in
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold">The fine print</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Privacy Policy, Terms of Use and grievance contact are published
            before public launch — the team reviews them with a lawyer first.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            © Strimer — built in the open.
          </p>
        </div>
      </div>
    </footer>
  );
}
