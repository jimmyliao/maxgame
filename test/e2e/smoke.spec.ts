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
  // 選角改成「更換守護者」按鈕 → 彈窗網格（10 隻守護者卡片，開場即建好於隱藏的 #heroPickerGrid）
  await expect(page.locator("#heroSwitchBtn")).toBeVisible();
  await expect(page.locator("#heroPickerGrid .hp-card")).toHaveCount(10);

  // 鐵則：6 個 dock 控制鈕都在
  for (const id of ["bLeft", "bRight", "bSwap", "bJump", "bSp", "bAtk"]) {
    await expect(page.locator("#" + id)).toHaveCount(1);
  }
  // 鐵則：手機觸控 touch-action:none
  const ta = await page.evaluate(() => getComputedStyle(document.body).touchAction);
  expect(ta).toBe("none");

  // 圖鑑：大廳 → 圖鑑（10 隻守護者 + 4 隻入侵種卡，共 14 張）→ 回大廳
  await page.locator("#navDex").click();
  await expect(page.locator("#dexCards .card")).toHaveCount(14);
  await page.locator("#dexBack").click();
  await expect(page.locator("#playBtn")).toBeVisible();

  // 復育中心：10 隻守護者可升級/解鎖
  await page.locator("#navUpg").click();
  await expect(page.locator("#upgCards .card")).toHaveCount(10);
  await page.locator("#upgBack").click();
  await expect(page.locator("#playBtn")).toBeVisible();

  // 每日任務：3 項
  await page.locator("#navDaily").click();
  await expect(page.locator("#dailyCards .card")).toHaveCount(3);
  await page.locator("#dailyBack").click();
  await expect(page.locator("#playBtn")).toBeVisible();

  // 戰績 / 設定
  await page.locator("#navStats").click();
  await expect(page.locator("#statsBack")).toBeVisible();
  await page.locator("#statsBack").click();
  await page.locator("#navSet").click();
  await expect(page.locator("#setBack")).toBeVisible();
  await page.locator("#setBack").click();
  await expect(page.locator("#playBtn")).toBeVisible();

  // 對戰：守護台灣神木（俯視角 MOBA）— 選 3v3 / 5v5
  await page.locator("#playBtn").click();
  await expect(page.locator("#mpick")).toBeVisible();
  await expect(page.locator("#pick3")).toBeVisible();
  await page.locator("#pick3").click();
  // 進入 MOBA：覆蓋層、搖桿、技能鈕都在
  await expect(page.locator("#moba")).toBeVisible();
  await expect(page.locator("#mstick")).toBeVisible();
  await expect(page.locator("#mSp")).toBeVisible();
  // 操作一下（技能 / 回神木）並讓引擎跑幾秒，確保 0 runtime error
  await page.locator("#mSp").click();
  await page.locator("#mBack").click();
  await page.waitForTimeout(1500);
  await expect(page.locator("#mhpAlly")).toBeVisible();

  // 一票否決：全程 0 runtime / console error
  expect(errors, "不可有 runtime/console 錯誤").toEqual([]);
});
