import { expect, test } from "@playwright/test";

// Milestone e2e (spec: "the colleges list loads and a college page opens").
// Requires the local Supabase stack with seed data (CI provides it).

test("colleges list loads with seeded data", async ({ page }) => {
  await page.goto("/colleges");
  await expect(page.getByRole("heading", { name: "Colleges" })).toBeVisible();
  // Seeded colleges render as cards linking to their pages
  const firstCard = page.locator("a[href^='/c/']").first();
  await expect(firstCard).toBeVisible();
});

test("a college page opens from the list", async ({ page }) => {
  await page.goto("/colleges");
  const firstCard = page.locator("a[href^='/c/']").first();
  const collegeName = await firstCard.locator("h3").innerText();
  await firstCard.click();
  await expect(page.getByRole("heading", { name: collegeName })).toBeVisible();
  await expect(page.getByText("Overview")).toBeVisible();
  // Rule 5 surfaces honestly either way: a rating, or the hidden notice
  await expect(
    page.getByText(/Rating hidden|verified reviews/).first(),
  ).toBeVisible();
});

test("home page shows the product promise", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Real college reviews")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse colleges" }),
  ).toBeVisible();
});
