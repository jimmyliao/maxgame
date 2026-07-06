import { describe, it, expect } from "vitest";
import { createPerfTier, SAMPLE_FRAMES, DEGRADE_MS, RECOVER_MS } from "../../src/data/perf-tier.js";

// 對戰效能自動分級：中低階手機自動關閉氛圍特效，優先保操作順暢。
describe("自動效能分級 perf-tier", () => {
  const feed = (tier, seconds, frames = SAMPLE_FRAMES) => {
    let last;
    for (let i = 0; i < frames; i++) last = tier.track(seconds);
    return last;
  };

  it("初始不降級", () => {
    const tier = createPerfTier();
    expect(tier.liteFX).toBe(false);
  });

  it("持續掉幀（幀時間超過門檻）→ 降級為 liteFX", () => {
    const tier = createPerfTier();
    const slowSec = (DEGRADE_MS + 5) / 1000; // 明顯高於降級門檻
    expect(feed(tier, slowSec)).toBe(true);
  });

  it("持續流暢（60fps）不會降級", () => {
    const tier = createPerfTier();
    expect(feed(tier, 1 / 60)).toBe(false);
  });

  it("降級後，幀時間介於門檻之間（未回到恢復線）不會立刻解除——避免來回閃爍", () => {
    const tier = createPerfTier();
    feed(tier, (DEGRADE_MS + 5) / 1000); // 先觸發降級
    expect(tier.liteFX).toBe(true);
    const midSec = ((DEGRADE_MS + RECOVER_MS) / 2) / 1000; // 介於恢復線與降級線之間
    expect(feed(tier, midSec)).toBe(true); // 遲滯區間應維持降級
  });

  it("降級後，幀時間回升到夠快（低於恢復門檻）才會解除降級", () => {
    const tier = createPerfTier();
    feed(tier, (DEGRADE_MS + 5) / 1000);
    expect(tier.liteFX).toBe(true);
    const fastSec = (RECOVER_MS - 5) / 1000;
    expect(feed(tier, fastSec)).toBe(false);
  });

  it("樣本數不足一輪時不評估（避免單幀暫停誤判）", () => {
    const tier = createPerfTier();
    feed(tier, (DEGRADE_MS + 50) / 1000, SAMPLE_FRAMES - 1); // 少一幀，不觸發評估
    expect(tier.liteFX).toBe(false);
  });

  it("單一超長暫停（如切分頁）不會被算成一次性拉爆整輪平均", () => {
    const tier = createPerfTier();
    // 混合：1 幀超長暫停(5s) + 其餘正常 60fps 幀，整輪平均仍應遠低於降級門檻
    tier.track(5);
    const result = feed(tier, 1 / 60, SAMPLE_FRAMES - 1);
    expect(result).toBe(false);
  });
});
