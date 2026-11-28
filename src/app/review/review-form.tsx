"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import {
  submitReview,
  updateReview,
  type ReviewFormState,
} from "@/app/review/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASPECTS, MIN_WRITTEN_CHARS } from "@/lib/review-validation";
import type { ReviewRow } from "@/lib/reviews";

const EMPTY: ReviewFormState = {};

function initialAspects(review?: ReviewRow | null) {
  return {
    academics: review?.academics ?? 4,
    faculty: review?.faculty ?? 4,
    placements: review?.placements ?? 3,
    campus_hostel: review?.campus_hostel ?? 3,
    campus_life: review?.campus_life ?? 4,
    value_for_money: review?.value_for_money ?? 4,
  } as Record<(typeof ASPECTS)[number]["key"], number>;
}

export function ReviewForm({
  colleges,
  preselectedId,
  existing,
  slug,
}: {
  colleges: { id: string; name: string; slug: string }[];
  preselectedId?: string;
  existing?: ReviewRow | null;
  slug: string;
}) {
  const action = existing ? updateReview : submitReview;
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const [aspects, setAspects] = useState(initialAspects(existing));
  const [pros, setPros] = useState(existing?.pros ?? "");
  const [cons, setCons] = useState(existing?.cons ?? "");
  const written = pros.trim().length + cons.trim().length;
  const router = useRouter();

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="slug" value={slug} />
      {existing ? (
        <input type="hidden" name="reviewId" value={existing.id} />
      ) : null}
      <input type="hidden" name="collegeId" value={preselectedId ?? ""} />

      {/* College picker (only when not preselected) */}
      {!preselectedId ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="collegePick" className="text-sm font-medium">
            College
          </label>
          <select
            id="collegePick"
            name="collegePicker"
            defaultValue=""
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            onChange={(e) => {
              // Navigating re-runs the page with ?college=slug
              const id = e.target.value;
              const c = colleges.find((x) => x.id === id);
              if (c) router.push(`/review/new?college=${c.slug}`);
            }}
          >
            <option value="" disabled>
              Choose a college…
            </option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Aspect sliders */}
      <fieldset>
        <legend className="mb-3 text-sm font-medium">
          Rate your experience
        </legend>
        <div className="flex flex-col gap-4">
          {ASPECTS.map(({ key, label }) => (
            <div key={key}>
              <div className="flex items-center justify-between text-sm">
                <label htmlFor={key}>{label}</label>
                <span className="font-semibold text-primary">
                  {aspects[key]}/5
                </span>
              </div>
              <input
                id={key}
                name={key}
                type="range"
                min={1}
                max={5}
                step={1}
                value={aspects[key]}
                onChange={(e) =>
                  setAspects((a) => ({ ...a, [key]: Number(e.target.value) }))
                }
                className="mt-1 w-full accent-primary"
              />
            </div>
          ))}
        </div>
      </fieldset>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="title"
          name="title"
          required
          minLength={8}
          maxLength={120}
          defaultValue={existing?.title ?? ""}
          placeholder="Sum up your experience in one line"
        />
      </div>

      {/* Pros / cons */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pros" className="text-sm font-medium">
            Pros
          </label>
          <textarea
            id="pros"
            name="pros"
            rows={5}
            value={pros}
            onChange={(e) => setPros(e.target.value)}
            placeholder="What worked for you?"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cons" className="text-sm font-medium">
            Cons
          </label>
          <textarea
            id="cons"
            name="cons"
            rows={5}
            value={cons}
            onChange={(e) => setCons(e.target.value)}
            placeholder="What should aspirants prepare for?"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>
      </div>
      <p
        className={`text-xs ${written >= MIN_WRITTEN_CHARS ? "text-muted-foreground" : "text-amber-600"}`}
      >
        {written} / {MIN_WRITTEN_CHARS} characters minimum (pros + cons
        combined)
      </p>

      {/* Context */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="branch" className="text-sm font-medium">
            Branch <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="branch"
            name="branch"
            defaultValue={existing?.branch ?? ""}
            placeholder="CSE"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="batchYear" className="text-sm font-medium">
            Batch year <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="batchYear"
            name="batchYear"
            inputMode="numeric"
            maxLength={4}
            defaultValue={existing?.batch_year ?? ""}
            placeholder="2025"
          />
        </div>
      </div>

      {/* Verdict */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          Would you choose this college again?
        </legend>
        <div className="flex gap-2">
          {[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ].map((o) => (
            <label
              key={o.value}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
            >
              <input
                type="radio"
                name="wouldChooseAgain"
                value={o.value}
                defaultChecked={
                  existing
                    ? existing.would_choose_again === (o.value === "yes")
                    : o.value === "yes"
                }
                className="accent-primary"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bestFor" className="text-sm font-medium">
            Best for <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="bestFor"
            name="bestFor"
            maxLength={200}
            defaultValue={existing?.best_for ?? ""}
            placeholder="Students who want X"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="notFor" className="text-sm font-medium">
            Not for <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="notFor"
            name="notFor"
            maxLength={200}
            defaultValue={existing?.not_for ?? ""}
            placeholder="People who need Y"
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : existing ? "Save changes" : "Publish review"}
        </Button>
        {existing ? (
          <p className="text-xs text-muted-foreground">
            Editing updates your review in place — history is kept honest.
          </p>
        ) : null}
      </div>
    </form>
  );
}
