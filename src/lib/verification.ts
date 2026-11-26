import { createHash } from "node:crypto";

/**
 * The lowercase domain part of an email address ("student@iitd.ac.in" → "iitd.ac.in").
 * Returns null when the string has no usable domain.
 */
export function extractDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  return domain.includes(".") && !domain.includes(" ") ? domain : null;
}

/**
 * True when the email's domain is in the college's allowed list.
 * The list and the email are compared case-insensitively.
 */
export function isAllowedCollegeEmail(
  email: string,
  allowedDomains: string[],
): boolean {
  const domain = extractDomain(email);
  if (!domain) return false;
  return allowedDomains.some((d) => d.trim().toLowerCase() === domain);
}

/** SHA-256 hex digest — the only form in which college emails are stored. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
