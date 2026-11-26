import { describe, expect, it } from "vitest";

import { feeRangeLabel, formatFeeCompact, ratingDisplay } from "./rating";

describe("ratingDisplay (rule 5: hidden until 5 verified reviews)", () => {
  it("hides the average below 5 reviews", () => {
    const d = ratingDisplay(4.12, 4);
    expect(d.visible).toBe(false);
    expect(d.average).toBeNull();
    expect(d.label).toBe("Not enough verified reviews yet");
  });

  it("hides the average when the cache is null even with many reviews", () => {
    const d = ratingDisplay(null, 9);
    expect(d.visible).toBe(false);
    expect(d.label).toBe("Not enough verified reviews yet");
  });

  it("shows the average at exactly 5 reviews", () => {
    const d = ratingDisplay(4.0, 5);
    expect(d.visible).toBe(true);
    expect(d.average).toBe(4.0);
    expect(d.label).toBe("4.0");
  });

  it("formats the label to one decimal", () => {
    expect(ratingDisplay(4.125, 7).label).toBe("4.1");
  });

  it("hides for empty colleges", () => {
    expect(ratingDisplay(null, 0).visible).toBe(false);
  });
});

describe("formatFeeCompact", () => {
  it("formats lakhs the Indian way", () => {
    expect(formatFeeCompact(180000)).toBe("₹1.8L");
    expect(formatFeeCompact(200000)).toBe("₹2L");
    expect(formatFeeCompact(1200000)).toBe("₹12L");
  });

  it("handles nonsense safely", () => {
    expect(formatFeeCompact(-5)).toBe("—");
  });
});

describe("feeRangeLabel", () => {
  it("joins min and max", () => {
    expect(feeRangeLabel(180000, 220000)).toBe("₹1.8L–₹2.2L/yr");
  });

  it("collapses equal bounds and open ranges", () => {
    expect(feeRangeLabel(150000, 150000)).toBe("₹1.5L/yr");
    expect(feeRangeLabel(90000, null)).toBe("from ₹0.9L/yr");
    expect(feeRangeLabel(null, 240000)).toBe("up to ₹2.4L/yr");
    expect(feeRangeLabel(null, null)).toBe("—");
  });
});
