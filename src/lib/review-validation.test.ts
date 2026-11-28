import { describe, expect, it } from "vitest";

import { validateReviewInput } from "./review-validation";

function form(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    collegeId: "ccc00000-0000-4000-8000-00000000c201",
    academics: "4",
    faculty: "4",
    placements: "3",
    campus_hostel: "4",
    campus_life: "5",
    value_for_money: "4",
    title: "A fair, balanced take on the college",
    pros: "Strong labs and reachable faculty. The coding culture is real and clubs get things done every single semester.",
    cons: "Placement season is stressful and the administration is slow with paperwork. Hostel wifi drops at night.",
    wouldChooseAgain: "yes",
    branch: "CSE",
    batchYear: "2025",
    bestFor: "",
    notFor: "",
  };
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    fd.set(k, v);
  }
  return fd;
}

describe("validateReviewInput", () => {
  it("accepts a complete valid review", () => {
    const r = validateReviewInput(form());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.academics).toBe(4);
      expect(r.value.would_choose_again).toBe(true);
      expect(r.value.branch).toBe("CSE");
      expect(r.value.batch_year).toBe(2025);
    }
  });

  it("requires every aspect to be rated 1–5", () => {
    const r = validateReviewInput(form({ placements: "0" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Placements");
    const r6 = validateReviewInput(form({ faculty: "6" }));
    expect(r6.ok).toBe(false);
  });

  it("rounds slider decimals into whole stars", () => {
    const r = validateReviewInput(form({ academics: "4.4" }));
    expect(r.ok && r.value.academics === 4).toBe(true);
  });

  it("enforces the 150-char pros+cons minimum as a combined count", () => {
    const r = validateReviewInput(
      form({
        pros: "Too short.",
        cons: "Also short.",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("150");
  });

  it("validates the title length", () => {
    expect(validateReviewInput(form({ title: "short" })).ok).toBe(false);
  });

  it("rejects an out-of-range batch year to null", () => {
    const r = validateReviewInput(form({ batchYear: "1850" }));
    expect(r.ok && r.value.batch_year === null).toBe(true);
  });
});
