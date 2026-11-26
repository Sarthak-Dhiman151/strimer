import type { Metadata } from "next";
import { Suspense } from "react";

import { CollegeCard } from "@/components/college-card";
import { Button } from "@/components/ui/button";
import {
  listColleges,
  listCollegeStates,
  type CollegeFilters,
} from "@/lib/colleges";

export const metadata: Metadata = {
  title: "Colleges · Strimer",
  description:
    "Browse verified-student reviews and communities for Indian colleges.",
};

type SearchParams = Promise<{
  state?: string;
  type?: string;
  fee?: string;
  rated?: string;
}>;

const FEE_OPTIONS = [
  { value: "100000", label: "Under ₹1L/yr" },
  { value: "200000", label: "Under ₹2L/yr" },
  { value: "300000", label: "Under ₹3L/yr" },
];

function selectClass() {
  return "h-9 rounded-md border border-input bg-background px-2 text-sm";
}

async function CollegesContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const filters: CollegeFilters = {
    state: sp.state || undefined,
    type:
      sp.type === "government" || sp.type === "private" ? sp.type : undefined,
    maxFee:
      sp.fee && FEE_OPTIONS.some((f) => f.value === sp.fee)
        ? Number(sp.fee)
        : undefined,
    ratedOnly: sp.rated === "1",
  };

  let colleges: Awaited<ReturnType<typeof listColleges>>;
  let states: string[] = [];
  let configured = true;
  try {
    colleges = await listColleges(filters);
    states = await listCollegeStates();
  } catch {
    configured = false;
    colleges = [];
  }

  if (!configured) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        College data lives in Supabase. Copy <code>.env.example</code> to{" "}
        <code>.env.local</code>, run the migrations and seed, then reload.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* No-JS GET form: filters are plain links between server renders */}
      <form
        method="get"
        action="/colleges"
        className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3"
      >
        <select
          name="state"
          defaultValue={sp.state ?? ""}
          className={selectClass()}
          aria-label="State"
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={sp.type ?? ""}
          className={selectClass()}
          aria-label="College type"
        >
          <option value="">Any type</option>
          <option value="government">Government</option>
          <option value="private">Private</option>
        </select>
        <select
          name="fee"
          defaultValue={sp.fee ?? ""}
          className={selectClass()}
          aria-label="Fee cap"
        >
          <option value="">Any fee</option>
          {FEE_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="rated"
            value="1"
            defaultChecked={sp.rated === "1"}
            className="size-4 accent-primary"
          />
          Rating visible
        </label>
        <Button type="submit" size="sm" variant="outline">
          Apply
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {colleges.length} {colleges.length === 1 ? "college" : "colleges"}
        {sp.state ? ` in ${sp.state}` : ""}
      </p>

      {colleges.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          No colleges match these filters yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {colleges.map((c) => (
            <CollegeCard key={c.id} college={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CollegesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-xl font-bold">Colleges</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Every rating comes from verified students and alumni. Ratings appear
        once a college has 5 verified reviews.
      </p>
      <Suspense
        fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}
      >
        <CollegesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
