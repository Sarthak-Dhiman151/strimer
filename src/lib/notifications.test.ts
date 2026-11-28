import { describe, expect, it } from "vitest";

import {
  buildNotificationItem,
  type NotificationRow,
  type ResolvedTarget,
} from "./notification-items";

const row = (
  type: NotificationRow["type"],
  targetType: NotificationRow["target_type"],
  overrides: Partial<NotificationRow> = {},
): NotificationRow => ({
  id: "n-1",
  user_id: "user-1",
  type,
  target_type: targetType,
  target_id: "t-1",
  read_at: null,
  created_at: "2026-11-28T10:00:00Z",
  ...overrides,
});

describe("buildNotificationItem", () => {
  it("renders a top-level reply with a deep link to the comment", () => {
    const resolved: ResolvedTarget = {
      found: true,
      kind: "comment",
      post_id: "p-1",
      parent_id: null,
      body: "The wifi is usable till late in the library block. ".repeat(4),
      status: "visible",
    };
    const item = buildNotificationItem(row("reply", "comment"), resolved);
    expect(item.href).toBe("/post/p-1#comment-t-1");
    expect(item.headline).toBe("New reply on your post");
    expect(item.excerpt).toContain("The wifi is usable");
    expect(item.excerpt!.endsWith("…")).toBe(true);
    expect(item.read).toBe(false);
  });

  it("distinguishes a nested reply", () => {
    const resolved: ResolvedTarget = {
      found: true,
      kind: "comment",
      post_id: "p-1",
      parent_id: "c-9",
      body: "thanks!",
      status: "visible",
    };
    expect(
      buildNotificationItem(row("reply", "comment"), resolved).headline,
    ).toBe("New reply in a thread you commented on");
  });

  it("renders an answer on the asker's question post", () => {
    const item = buildNotificationItem(row("answer", "post"), {
      found: true,
      kind: "post",
      title: "Any hostel tips for a first-year?",
      status: "visible",
    });
    expect(item.href).toBe("/post/t-1");
    expect(item.headline).toBe("New answer on your question");
    expect(item.excerpt).toContain("Any hostel tips");
  });

  it("renders a best answer", () => {
    const resolved: ResolvedTarget = {
      found: true,
      kind: "comment",
      post_id: "p-2",
      parent_id: null,
      body: "Bring a power strip.",
      status: "visible",
    };
    const item = buildNotificationItem(row("answer", "comment"), resolved);
    expect(item.headline).toBe("Your reply was marked as the best answer");
    expect(item.href).toBe("/post/p-2#comment-t-1");
  });

  it("renders helpful votes for each target type with the right link", () => {
    const post = buildNotificationItem(row("helpful_vote", "post"), {
      found: true,
      kind: "post",
      title: "Hostel tips",
      status: "visible",
    });
    expect(post.headline).toBe("Someone found your post helpful");
    expect(post.href).toBe("/post/t-1");

    const review = buildNotificationItem(row("helpful_vote", "review"), {
      found: true,
      kind: "review",
      title: "Great peer group",
      college_slug: "ait",
      status: "visible",
    });
    expect(review.href).toBe("/c/ait/reviews");
    expect(review.excerpt).toBe("Great peer group");
  });

  it("renders verification approval with the college", () => {
    const item = buildNotificationItem(
      row("verification_approved", "verification"),
      {
        found: true,
        kind: "verification",
        college_slug: "ait",
        college_name: "Aurangpur Institute of Technology",
      },
    );
    expect(item.href).toBe("/c/ait");
    expect(item.excerpt).toContain("Aurangpur Institute of Technology");
  });

  it("renders moderation with hidden vs removed and the content noun", () => {
    const hidden = buildNotificationItem(row("moderation", "post"), {
      found: true,
      kind: "post",
      title: "Test",
      status: "hidden",
    });
    expect(hidden.headline).toBe("Your post was hidden by moderators");

    const removed = buildNotificationItem(row("moderation", "comment"), {
      found: true,
      kind: "comment",
      post_id: "p-1",
      parent_id: null,
      body: "objectionable",
      status: "removed",
    });
    expect(removed.headline).toBe("Your reply was removed by moderators");
  });

  it("degrades gracefully when the target row is gone or unreadable", () => {
    const item = buildNotificationItem(row("reply", "comment"), {
      found: false,
    });
    expect(item.headline).toBe("Notification");
    expect(item.href).toBe("/");
    expect(item.excerpt).toBeNull();
  });

  it("marks read state from read_at", () => {
    const read = buildNotificationItem(
      row("reply", "post", { read_at: "2026-11-28T11:00:00Z" }),
      {
        found: false,
      },
    );
    expect(read.read).toBe(true);
  });
});
