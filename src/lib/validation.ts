const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Loose sanity check for a login email. Verification domains are checked separately. */
export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value) && value.length <= 254;
}

/**
 * True when the configured Supabase URL points at the local CLI stack
 * (dev nicety: the login page can then point at the Inbucket email inbox).
 */
export function isLocalSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0";
  } catch {
    return false;
  }
}
