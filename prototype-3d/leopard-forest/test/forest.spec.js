import { expect, test } from "@playwright/test";

test("loads a real 3D forest and lets the leopard discover the iguana", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });

  await page.goto("/");
  await expect(page.locator("#world")).toBeVisible();
  await expect(page.locator("#start")).toBeVisible();
  await page.locator("#start").click();
  await expect(page.locator("#start")).toBeHidden();
  await page.keyboard.down("w");
  await page.waitForTimeout(2_000);
  await page.keyboard.up("w");
  await page.screenshot({ path: "test-results/leopard-forest-running.png" });
  await expect(page.locator("#objective")).toHaveText("綠鬣蜥發現石虎了！牠正逃離棲地。");
  expect(errors).toEqual([]);
});
