"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/validation";

export type LoginState = { error?: string; sentTo?: string };

/** Step 1 of the login flow: send a 6-digit one-time code to the email. */
export async function sendOtp(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      return { error: "Could not send the code. Try again in a moment." };
    }
    return { sentTo: email };
  } catch {
    return {
      error: "Authentication is not configured. Set the Supabase env vars.",
    };
  }
}

/** Step 2: verify the code and start a session. */
export async function verifyOtp(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");
  if (token.length !== 6) {
    return { error: "Enter the 6-digit code from your email.", sentTo: email };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) {
      return {
        error: "That code is not valid or has expired. Request a new one.",
        sentTo: email,
      };
    }
  } catch {
    return {
      error: "Authentication is not configured. Set the Supabase env vars.",
      sentTo: email,
    };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Even without Supabase configured there is nothing to sign out of.
  }
  redirect("/");
}
