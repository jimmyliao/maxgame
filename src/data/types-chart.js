// 屬性系統（台灣棲地）— 純資料與純函式，無 DOM，可單元測試。
// 相剋環：🌲山林 > 💧水域 > 🌪天空 > 🪲蟲 > 🌲山林

/** @typedef {"forest"|"water"|"sky"|"bug"} TypeId */

export const TYPE = { forest: "🌲山林", water: "💧水域", sky: "🌪天空", bug: "🪲蟲" };

// 攻方剋制誰（每個型別剋制一個型別，形成循環）
export const ADV = { forest: ["water"], water: ["sky"], sky: ["bug"], bug: ["forest"] };

/**
 * 屬性相剋倍率。
 * @param {TypeId} at 攻方屬性
 * @param {TypeId} df 守方屬性
 * @returns {number} 1.6（效果絕佳）/ 0.6（效果不佳）/ 1（普通）
 */
export function eff(at, df) {
  if (ADV[at] && ADV[at].includes(df)) return 1.6;
  if (ADV[df] && ADV[df].includes(at)) return 0.6;
  return 1;
}
