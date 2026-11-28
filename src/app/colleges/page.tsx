import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Building2, SlidersHorizontal, X } from "lucide-react";

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
  return "h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";
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
  const hasFilters =
    Boolean(filters.state) ||
    Boolean(filters.type) ||
    Boolean(filters.maxFee) ||
    filters.ratedOnly;

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
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
        <Building2 className="size-8 text-muted-foreground/50" aria-hidden />
        <p className="max-w-sm text-sm text-muted-foreground">
          College data lives in Supabase. Copy <code>.env.example</code> to{" "}
          <code>.env.local</code>, run the migrations and seed, then reload.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* No-JS GET form: filters survive without JavaScript */}
      <form
        method="get"
        action="/colleges"
        className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3"
      >
        <span className="mr-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters
        </span>
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

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {colleges.length}
          </span>{" "}
          {colleges.length === 1 ? "college" : "colleges"}
          {filters.state ? ` in ${filters.state}` : ""}
        </p>
        {hasFilters ? (
          <Link
            href="/colleges"
            className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <X className="size-3.5" aria-hidden />
            Clear filters
          </Link>
        ) : null}
      </div>

      {colleges.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <Building2 className="size-8 text-muted-foreground/50" aria-hidden />
          <p className="text-sm text-muted-foreground">
            No colleges match these filters yet.
          </p>
          {hasFilters ? (
            <Link
              href="/colleges"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Clear all filters
            </Link>
          ) : null}
        </div>
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
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Colleges</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Every rating comes from verified students and alumni. A college&apos;s
        average appears once it has 5 verified reviews — not before.
      </p>
      <Suspense
        fallback={
          <div className="flex flex-col gap-3">
            <div className="h-14 animate-pulse rounded-xl bg-muted" />
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
          </div>
        }
      >
        <CollegesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
