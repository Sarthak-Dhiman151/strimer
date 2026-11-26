import { describe, expect, it } from "vitest";

import {
  extractDomain,
  isAllowedCollegeEmail,
  sha256Hex,
} from "./verification";

describe("extractDomain", () => {
  it("extracts the lowercase domain", () => {
    expect(extractDomain("Student@IITD.AC.IN")).toBe("iitd.ac.in");
    expect(extractDomain("a.b+c@sub.college.example")).toBe(
      "sub.college.example",
    );
  });

  it("returns null for unusable input", () => {
    expect(extractDomain("no-at-sign")).toBeNull();
    expect(extractDomain("@nodomain")).toBeNull();
    expect(extractDomain("user@")).toBeNull();
    expect(extractDomain("user@no-tld")).toBeNull();
    expect(extractDomain("user@has space.com")).toBeNull();
  });
});

describe("isAllowedCollegeEmail", () => {
  const domains = ["iitd.ac.in", "ait.example"];

  it("matches case-insensitively against the college list", () => {
    expect(isAllowedCollegeEmail("student@IITD.AC.IN", domains)).toBe(true);
    expect(isAllowedCollegeEmail("x@AIT.example", domains)).toBe(true);
  });

  it("rejects other domains and garbage", () => {
    expect(isAllowedCollegeEmail("student@gmail.com", domains)).toBe(false);
    expect(isAllowedCollegeEmail("look-alike@fakeiitd.ac.in", domains)).toBe(
      false,
    );
    expect(isAllowedCollegeEmail("not-an-email", domains)).toBe(false);
    expect(isAllowedCollegeEmail("", domains)).toBe(false);
  });

  it("ignores whitespace around list entries", () => {
    expect(isAllowedCollegeEmail("s@ait.example", [" ait.example "])).toBe(
      true,
    );
  });
});

describe("sha256Hex", () => {
  it("produces the known 64-char hex digest", () => {
    const digest = sha256Hex("student@iitd.ac.in");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex("student@iitd.ac.in")).toBe(digest); // deterministic
    expect(sha256Hex("Student@iitd.ac.in")).not.toBe(digest); // case-sensitive
  });
});
