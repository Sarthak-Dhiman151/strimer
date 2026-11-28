import { describe, expect, it } from "vitest";

import {
  buildCommentTree,
  hotScore,
  MAX_COMMENT_DEPTH,
  replyDepth,
  timeAgo,
} from "./community-helpers";

describe("timeAgo", () => {
  const now = new Date("2026-11-26T12:00:00Z");

  it("formats relative units", () => {
    expect(timeAgo("2026-11-26T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-11-26T11:30:00Z", now)).toBe("30m");
    expect(timeAgo("2026-11-26T06:00:00Z", now)).toBe("6h");
    expect(timeAgo("2026-11-24T12:00:00Z", now)).toBe("2d");
  });

  it("falls back to a date after a week", () => {
    expect(timeAgo("2026-11-10T12:00:00Z", now)).toBe("10 Nov");
  });
});

describe("hotScore (spec: score / (hours + 2)^1.5)", () => {
  const now = new Date("2026-11-26T12:00:00Z");

  it("scores a fresh, upvoted post highest", () => {
    const fresh = hotScore(10, new Date("2026-11-26T11:00:00Z"), now);
    const old = hotScore(10, new Date("2026-11-25T12:00:00Z"), now);
    expect(fresh).toBeGreaterThan(old);
  });

  it("prefers a fresh low-score post over an old high-score one in the right window", () => {
    const freshSmall = hotScore(3, new Date("2026-11-26T11:59:00Z"), now);
    const oldBig = hotScore(9, new Date("2026-11-20T12:00:00Z"), now);
    expect(freshSmall).toBeGreaterThan(oldBig);
  });

  it("never divides by zero and stays positive", () => {
    const s = hotScore(0, new Date("2026-11-26T12:00:00Z"), now);
    expect(s).toBe(0);
    expect(hotScore(5, new Date("2026-11-26T12:00:00Z"), now)).toBeGreaterThan(
      0,
    );
  });
});

type Row = {
  id: string;
  parent_id: string | null;
  created_at: string;
};

describe("buildCommentTree", () => {
  const a: Row = {
    id: "a",
    parent_id: null,
    created_at: "2026-11-26T01:00:00Z",
  };
  const b: Row = {
    id: "b",
    parent_id: "a",
    created_at: "2026-11-26T02:00:00Z",
  };
  const c: Row = {
    id: "c",
    parent_id: "b",
    created_at: "2026-11-26T03:00:00Z",
  };
  const d: Row = {
    id: "d",
    parent_id: null,
    created_at: "2026-11-26T01:30:00Z",
  };

  it("nests replies under parents in chronological order", () => {
    const tree = buildCommentTree([c, b, a, d]);
    expect(tree.map((n) => n.id)).toEqual(["a", "d"]);
    expect(tree[0].children.map((n) => n.id)).toEqual(["b"]);
    expect(tree[0].children[0].children.map((n) => n.id)).toEqual(["c"]);
  });

  it("reattaches orphans to the root level instead of dropping them", () => {
    const orphan: Row = {
      id: "x",
      parent_id: "missing",
      created_at: "2026-11-26T04:00:00Z",
    };
    const tree = buildCommentTree([a, orphan]);
    expect(tree.map((n) => n.id).sort()).toEqual(["a", "x"]);
  });

  it("returns an empty tree for no input", () => {
    expect(buildCommentTree([])).toEqual([]);
  });
});

describe("replyDepth", () => {
  it("increments and caps at the spec depth", () => {
    expect(replyDepth(0)).toBe(1);
    expect(replyDepth(3)).toBe(4);
    expect(MAX_COMMENT_DEPTH).toBe(4);
    expect(replyDepth(4)).toBeNull();
  });
});
