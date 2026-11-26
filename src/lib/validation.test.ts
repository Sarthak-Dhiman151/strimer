import { describe, expect, it } from "vitest";

import { isLocalSupabaseUrl, isValidEmail } from "./validation";

describe("isValidEmail", () => {
  it("accepts ordinary emails", () => {
    expect(isValidEmail("student@iitd.ac.in")).toBe(true);
    expect(isValidEmail("a.b+tag@sub.example.example")).toBe(true);
  });

  it("rejects strings without a domain or with whitespace", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("missing@tld")).toBe(false);
    expect(isValidEmail("two words@example.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects absurdly long input", () => {
    expect(isValidEmail(`${"a".repeat(300)}@example.com`)).toBe(false);
  });
});

describe("isLocalSupabaseUrl", () => {
  it("detects local stack URLs", () => {
    expect(isLocalSupabaseUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalSupabaseUrl("http://localhost:54321")).toBe(true);
  });

  it("treats hosted projects as remote", () => {
    expect(isLocalSupabaseUrl("https://abc123.supabase.co")).toBe(false);
  });

  it("handles missing and malformed values", () => {
    expect(isLocalSupabaseUrl(undefined)).toBe(false);
    expect(isLocalSupabaseUrl("")).toBe(false);
    expect(isLocalSupabaseUrl("not a url")).toBe(false);
  });
});
