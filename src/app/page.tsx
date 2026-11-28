import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  MessageCircleQuestion,
  ShieldCheck,
  Star,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

const PROOF = [
  {
    icon: BadgeCheck,
    stat: "100%",
    label: "of reviewers are verified students or alumni",
  },
  {
    icon: Star,
    stat: "6",
    label: "aspect ratings in every review, from academics to value",
  },
  {
    icon: ShieldCheck,
    stat: "₹0",
    label: "paid placement — colleges cannot buy a better rating",
  },
];

const STEPS = [
  {
    icon: BadgeCheck,
    title: "Seniors verify with their college email",
    body: "A one-time code to an official college domain earns the verified badge. No verification, no review — that is the whole trick.",
  },
  {
    icon: Star,
    title: "Reviews read like product reviews",
    body: "Six aspect ratings, pros and cons, and a straight verdict: would you choose this college again? Not an essay — a scorecard.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Aspirants ask, seniors answer",
    body: "Every college gets a community. Questions get answers from verified seniors, and the best answer is pinned for the next aspirant.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-4 pt-14 pb-12 sm:pt-20">
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="size-3.5" aria-hidden />
          Verified students only
        </p>
        <h1 className="max-w-2xl text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          Real college reviews from verified students. Real answers from real
          seniors.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground sm:text-lg">
          Structured ratings and honest discussion for Indian colleges — in one
          place, searchable, and impossible for colleges to game.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/colleges" className={buttonVariants({ size: "lg" })}>
            Browse colleges
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/verify"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            I&apos;m a student — get verified
          </Link>
        </div>
      </section>

      {/* Proof strip */}
      <section className="border-y bg-card">
        <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8 sm:grid-cols-3">
          {PROOF.map(({ icon: Icon, stat, label }) => (
            <div key={stat} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <div className="text-xl leading-none font-bold">{stat}</div>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-3xl px-4 py-12">
        <h2 className="text-xl font-bold sm:text-2xl">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  STEP {i + 1}
                </span>
              </div>
              <h3 className="mt-3 leading-snug font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="border-t bg-card">
        <div className="mx-auto w-full max-w-3xl px-4 py-12">
          <div className="flex items-start gap-4">
            <span className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:flex">
              <ShieldCheck className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">
                Trust is the product
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                One planted review poisons everything. So the defences come
                before the growth:
              </p>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm">
                <li className="flex items-start gap-2">
                  <BadgeCheck
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  Every review is tied to an approved college-email verification
                  — one review per person per college.
                </li>
                <li className="flex items-start gap-2">
                  <Building2
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  Ratings appear only after 5 verified reviews, so one angry
                  senior cannot set the narrative.
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  Content is never silently deleted — moderation is logged and
                  visible states are honest.
                </li>
              </ul>
              <div className="mt-6">
                <Link
                  href="/colleges"
                  className={buttonVariants({ variant: "outline" })}
                >
                  See the colleges
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
