import { test, expect } from "@playwright/test";

// 冒煙 + 回歸測試：守住「鐵則」與核心玩法不被改壞。
test("載入無錯誤、鐵則齊全、能走完一場戰鬥", async ({ page }) => {
  const errors: string[] = [];
  // JS 例外 = 硬失敗
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e));
  // console error，但忽略「資源載入失敗」雜訊（由下方 response 檢查負責）
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) errors.push("CONSOLE: " + m.text()); });
  // 404：忽略「選用的」角色寫實圖（assets/ 沒放圖時會 404，屬正常 fallback），其餘 404 視為錯誤
  page.on("response", (r) => { if (r.status() === 404 && !r.url().includes("/assets/")) errors.push("404: " + r.url()); });

  await page.goto("/");

  // 大廳（遊戲介面）— 開始守護鈕 + 角色展示
  await expect(page.locator("#playBtn")).toBeVisible();
  await expect(page.locator("#heroShow")).toBeVisible();
  await expect(page.locator("#roster .rb")).toHaveCount(4);

  // 鐵則：6 個 dock 控制鈕都在
  for (const id of ["bLeft", "bRight", "bSwap", "bJump", "bSp", "bAtk"]) {
    await expect(page.locator("#" + id)).toHaveCount(1);
  }
  // 鐵則：手機觸控 touch-action:none
  const ta = await page.evaluate(() => getComputedStyle(document.body).touchAction);
  expect(ta).toBe("none");

  // 開始守護 → 地圖：4 個章節卡
  await page.locator("#playBtn").click();
  await expect(page.locator("#cards .card")).toHaveCount(4);

  // 圖鑑：8 個物種卡（4 守護者 + 4 入侵者）全部能畫出（涵蓋 8 個 kind）
  await page.locator("#toDex").click();
  await expect(page.locator("#dexCards .card")).toHaveCount(8);
  await page.locator("#dexBack").click();

  // 返回後已在地圖；進入第一章（chapter 0 恆解鎖）戰鬥
  await expect(page.locator("#map")).toBeVisible();
  await page.locator("#cards .card").first().click();

  // 跳過開場對話
  for (let i = 0; i < 6; i++) {
    await page.locator("#story").click({ force: true }).catch(() => {});
    await page.waitForTimeout(120);
  }

  // 戰鬥介面出現、可施放動作不報錯
  await expect(page.locator("#dock")).toBeVisible();
  await page.locator("#bRight").click();
  await page.locator("#bAtk").click();
  await page.locator("#bJump").click();
  await page.locator("#bSp").click();
  await page.waitForTimeout(300);

  // 一票否決：全程 0 runtime / console error
  expect(errors, "不可有 runtime/console 錯誤").toEqual([]);
});
