import { expect, test } from "@playwright/test";

test("course staging surface is reachable", async ({ page }) => {
  await page.goto("/admin/course", { waitUntil: "domcontentloaded" });
  const url = new URL(page.url());
  if (url.pathname === "/admin/course") {
    await expect(page.getByText("課程影片管理")).toBeVisible();
    await expect(page.getByText(/測試環境|正式環境|本機環境/)).toBeVisible();
  } else {
    await expect(url.pathname).toMatch(/admin-login|login/);
  }
});

test("learner surface is reachable without requiring admin state", async ({ page }) => {
  const response = await page.goto("/learn", { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 0).toBeLessThan(500);
});

