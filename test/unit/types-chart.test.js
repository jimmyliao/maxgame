import { describe, it, expect } from "vitest";
import { TYPE, ADV, eff } from "../../src/data/types-chart.js";

describe("屬性系統 types-chart", () => {
  it("有 4 種台灣棲地屬性", () => {
    expect(Object.keys(TYPE).sort()).toEqual(["bug", "forest", "sky", "water"]);
  });

  it("相剋關係是封閉的循環（每型別剋制 1 個）", () => {
    for (const t of Object.keys(ADV)) expect(ADV[t]).toHaveLength(1);
    // 🌲>💧>🌪>🪲>🌲
    expect(ADV.forest).toEqual(["water"]);
    expect(ADV.water).toEqual(["sky"]);
    expect(ADV.sky).toEqual(["bug"]);
    expect(ADV.bug).toEqual(["forest"]);
  });

  it("效果絕佳 = 1.6 倍（山林剋水域）", () => {
    expect(eff("forest", "water")).toBe(1.6);
    expect(eff("bug", "forest")).toBe(1.6);
  });

  it("效果不佳 = 0.6 倍（被剋）", () => {
    expect(eff("water", "forest")).toBe(0.6);
    expect(eff("forest", "bug")).toBe(0.6);
  });

  it("同屬性或無關 = 1 倍", () => {
    expect(eff("forest", "forest")).toBe(1);
    expect(eff("forest", "sky")).toBe(1);
  });
});
