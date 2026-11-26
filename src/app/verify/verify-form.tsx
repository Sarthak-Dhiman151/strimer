"use client";

import { useActionState } from "react";

import {
  requestCollegeOtp,
  verifyCollegeOtp,
  type VerifyState,
} from "@/app/verify/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isLocalSupabaseUrl } from "@/lib/validation";

const EMPTY: VerifyState = {};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export function VerifyForm({
  colleges,
}: {
  colleges: { id: string; name: string; email_domains: string[] }[];
}) {
  const isLocalStack = isLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const [requestState, requestAction, requestPending] = useActionState(
    requestCollegeOtp,
    EMPTY,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyCollegeOtp,
    EMPTY,
  );

  const sentTo = requestState.sentTo ?? verifyState.sentTo ?? null;
  // The request action carries the verification details into step two.
  const carried = requestState.sentTo
    ? {
        collegeId: requestState.collegeId ?? "",
        kind: requestState.kind ?? "student",
        branch: requestState.branch ?? "",
        batchYear: requestState.batchYear ?? "",
      }
    : null;

  if (!sentTo) {
    return (
      <form action={requestAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="collegeId" className="text-sm font-medium">
            College
          </label>
          <select
            id="collegeId"
            name="collegeId"
            required
            defaultValue=""
            className={selectClass}
          >
            <option value="" disabled>
              Choose your college…
            </option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kind" className="text-sm font-medium">
            I am a…
          </label>
          <select
            id="kind"
            name="kind"
            defaultValue="student"
            className={selectClass}
          >
            <option value="student">Current student</option>
            <option value="alumni">Alumni</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="branch" className="text-sm font-medium">
              Branch <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="branch"
              name="branch"
              placeholder="CSE"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="batchYear" className="text-sm font-medium">
              Batch year{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="batchYear"
              name="batchYear"
              inputMode="numeric"
              placeholder="2025"
              minLength={4}
              maxLength={4}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            College email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            required
            placeholder={
              colleges[0]?.email_domains[0]
                ? `you@${colleges[0].email_domains[0]}`
                : "you@college.edu"
            }
            className="h-11 text-base"
          />
          <p className="text-xs text-muted-foreground">
            The code can only be sent to a domain on the college&apos;s approved
            list.
          </p>
        </div>
        {requestState.error ? (
          <p role="alert" className="text-sm text-destructive">
            {requestState.error}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={requestPending}>
          {requestPending ? "Sending…" : "Send verification code"}
        </Button>
        {isLocalStack ? (
          <p className="text-xs text-muted-foreground">
            Local dev: codes land in the Inbucket inbox at{" "}
            <code>http://127.0.0.1:54324</code>.
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code sent to{" "}
        <span className="font-medium text-foreground">{sentTo}</span>.
      </p>
      <form action={verifyAction} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={sentTo} />
        <input
          type="hidden"
          name="collegeId"
          value={carried?.collegeId ?? ""}
        />
        <input type="hidden" name="kind" value={carried?.kind ?? "student"} />
        <input type="hidden" name="branch" value={carried?.branch ?? ""} />
        <input
          type="hidden"
          name="batchYear"
          value={carried?.batchYear ?? ""}
        />
        <Input
          id="token"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9\s]*"
          maxLength={7}
          required
          autoFocus
          placeholder="000000"
          className="h-12 text-center text-lg tracking-[0.5em]"
        />
        {verifyState.error ? (
          <p role="alert" className="text-sm text-destructive">
            {verifyState.error}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={verifyPending}>
          {verifyPending ? "Checking…" : "Verify and get my badge"}
        </Button>
      </form>
      <form action={requestAction} className="text-sm">
        <input type="hidden" name="email" value={sentTo} />
        <input
          type="hidden"
          name="collegeId"
          value={carried?.collegeId ?? ""}
        />
        <input type="hidden" name="kind" value={carried?.kind ?? "student"} />
        <input type="hidden" name="branch" value={carried?.branch ?? ""} />
        <input
          type="hidden"
          name="batchYear"
          value={carried?.batchYear ?? ""}
        />
        <button
          type="submit"
          disabled={requestPending}
          className="text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
        >
          {requestPending ? "Sending…" : "Resend code"}
        </button>
      </form>
    </div>
  );
}
