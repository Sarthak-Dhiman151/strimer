"use client";

import { useActionState, useState } from "react";

import { createPost, type FormState } from "@/app/c/[slug]/community/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMPTY: FormState = {};

const FLAIRS = [
  { value: "question", label: "Question — asking something specific" },
  { value: "discussion", label: "Discussion — open conversation" },
  { value: "advice", label: "Advice — sharing what I learned" },
  { value: "event", label: "Event — something happening" },
] as const;

export function PostForm({
  collegeId,
  slug,
  defaultFlair,
}: {
  collegeId: string;
  slug: string;
  defaultFlair?: string;
}) {
  const [state, formAction, pending] = useActionState(createPost, EMPTY);
  const [flair, setFlair] = useState(
    (FLAIRS.some((f) => f.value === defaultFlair)
      ? defaultFlair
      : "question") as string,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="collegeId" value={collegeId} />
      <input type="hidden" name="slug" value={slug} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="title"
          name="title"
          required
          minLength={8}
          maxLength={150}
          placeholder={
            flair === "question"
              ? "e.g. How's the placement scene for CSE really?"
              : "Give the post a clear title"
          }
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="flair" className="text-sm font-medium">
          Flair
        </label>
        <select
          id="flair"
          name="flair"
          value={flair}
          onChange={(e) => setFlair(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {FLAIRS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {flair === "question" ? (
          <p className="text-xs text-muted-foreground">
            Questions can get a best answer — you choose it after people reply.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="text-sm font-medium">
          Details <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={7}
          placeholder="Add context so the answers are useful. Plain text for now — formatting arrives with the markdown step."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Posting…" : "Post to the community"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Community rules: no targeting individuals, no selling or referral links,
        no personal details of others.
      </p>
    </form>
  );
}
