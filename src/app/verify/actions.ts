"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  extractDomain,
  isAllowedCollegeEmail,
  sha256Hex,
} from "@/lib/verification";
import { isValidEmail } from "@/lib/validation";

export type VerifyState = {
  error?: string;
  sentTo?: string;
  collegeId?: string;
  kind?: string;
  branch?: string;
  batchYear?: string;
};

type CollegeOption = {
  id: string;
  name: string;
  email_domains: string[];
};

/**
 * Step 1 of verification: check the college-email domain against the college's
 * allowed list, then send an OTP to that address. The OTP email itself is
 * Supabase auth — after it is confirmed the session user owns that address.
 */
export async function requestCollegeOtp(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const collegeId = String(formData.get("collegeId") ?? "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  let college: CollegeOption | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("colleges")
      .select("id, name, email_domains")
      .eq("id", collegeId)
      .maybeSingle();
    college = data as CollegeOption | null;
  } catch {
    return { error: "Authentication is not configured in this environment." };
  }
  if (!college) {
    return { error: "Pick a college from the list." };
  }
  if (!isAllowedCollegeEmail(email, college.email_domains)) {
    const domain = extractDomain(email);
    return {
      error: `@${domain ?? "?"} is not an accepted domain for ${college.name}. Use your official college email.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    return { error: "Could not send the code. Try again in a moment." };
  }
  // Carry the verification details through the two-step form.
  return {
    sentTo: email,
    collegeId,
    kind: String(formData.get("kind") ?? "student"),
    branch: String(formData.get("branch") ?? ""),
    batchYear: String(formData.get("batchYear") ?? ""),
  };
}

/**
 * Step 2: confirm the OTP, then record the approved verification.
 * The insert policy (migration 20261126120000) accepts self-approval only
 * because the stored hash equals the SHA-256 of the caller's own login email —
 * exactly the address the OTP just confirmed.
 */
export async function verifyCollegeOtp(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const email = String(formData.get("email") ?? "");
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");
  const collegeId = String(formData.get("collegeId") ?? "");
  const kind =
    String(formData.get("kind") ?? "") === "alumni" ? "alumni" : "student";
  const branch = String(formData.get("branch") ?? "").trim() || null;
  const batchYearRaw = Number(formData.get("batchYear"));
  const batchYear =
    Number.isInteger(batchYearRaw) &&
    batchYearRaw >= 1990 &&
    batchYearRaw <= 2100
      ? batchYearRaw
      : null;

  if (token.length !== 6) {
    return { error: "Enter the 6-digit code from your email.", sentTo: email };
  }

  let handle: string | null = null;
  try {
    const supabase = await createClient();
    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (otpError) {
      return {
        error: "That code is not valid or has expired. Request a new one.",
        sentTo: email,
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Session could not be established.", sentTo: email };
    }

    const { error: insertError } = await supabase.from("verifications").insert({
      user_id: user.id,
      college_id: collegeId,
      kind,
      method: "email",
      branch,
      batch_year: batchYear,
      email_hash: sha256Hex(email),
      status: "approved",
      verified_at: new Date().toISOString(),
    });

    if (insertError) {
      return {
        error:
          "Could not save the verification — you may already be verified for this college.",
        sentTo: email,
      };
    }

    // Session is now the college-email user; show the badge on their profile.
    const { data: profile } = await supabase
      .from("users")
      .select("handle")
      .eq("id", user.id)
      .maybeSingle();
    handle = profile?.handle ?? null;
  } catch {
    return {
      error: "Verification is not available in this environment.",
      sentTo: email,
    };
  }

  redirect(handle ? `/u/${handle}` : "/");
}
