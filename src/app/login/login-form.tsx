"use client";

import { useActionState, useState } from "react";

import { sendOtp, verifyOtp, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isLocalSupabaseUrl } from "@/lib/validation";

const EMPTY: LoginState = {};

export function LoginForm() {
  // Keyed remount gives "use a different email" a clean slate without effects.
  const [flowKey, setFlowKey] = useState(0);

  return <LoginFlow key={flowKey} onReset={() => setFlowKey((k) => k + 1)} />;
}

function LoginFlow({ onReset }: { onReset: () => void }) {
  const isLocalStack = isLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const [sendState, sendAction, sendPending] = useActionState(sendOtp, EMPTY);
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyOtp,
    EMPTY,
  );

  // The step is derived from the send action's result — no effects needed.
  const sentTo = sendState.sentTo ?? null;

  if (!sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <form action={sendAction} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@college.edu"
            className="h-11 text-base"
          />
          {sendState.error ? (
            <p role="alert" className="text-sm text-destructive">
              {sendState.error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={sendPending}>
            {sendPending ? "Sending…" : "Send login code"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          New here? A code creates your account — no password, ever.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code sent to{" "}
        <span className="font-medium text-foreground">{sentTo}</span>.
        {isLocalStack ? (
          <>
            {" "}
            Local dev: read it in the Inbucket inbox at{" "}
            <code className="text-xs">http://127.0.0.1:54324</code>.
          </>
        ) : null}
      </p>
      <form action={verifyAction} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={sentTo} />
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
        {sendState.error ? (
          <p role="alert" className="text-sm text-destructive">
            {sendState.error}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={verifyPending}>
          {verifyPending ? "Checking…" : "Verify and continue"}
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="text-muted-foreground underline-offset-4 hover:underline"
          onClick={onReset}
        >
          Use a different email
        </button>
        <form action={sendAction}>
          <input type="hidden" name="email" value={sentTo} />
          <button
            type="submit"
            disabled={sendPending}
            className="underline-offset-4 hover:underline disabled:opacity-50"
          >
            {sendPending ? "Sending…" : "Resend code"}
          </button>
        </form>
      </div>
    </div>
  );
}
