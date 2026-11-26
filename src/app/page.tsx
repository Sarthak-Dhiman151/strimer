import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl leading-tight font-bold sm:text-3xl">
          Real college reviews from verified students. Real answers from real
          seniors.
        </h1>
        <p className="text-muted-foreground">
          Every review is written by someone we verified studies or studied at
          that college. Colleges cannot pay to change a rating. Ask a question,
          get answers, decide with facts.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/colleges" className={buttonVariants({ size: "lg" })}>
            Browse colleges
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Log in
          </Link>
        </div>
        <ul className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
          <li>✓ Product-style reviews with six aspect ratings</li>
          <li>✓ Reddit-style communities with verified senior answers</li>
          <li>✓ No paid placement, ever — trust is the product</li>
        </ul>
      </div>
    </div>
  );
}
