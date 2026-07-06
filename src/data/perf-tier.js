// 自動效能分級 — 純函式，無 DOM，可單元測試。
// 中低階手機不用玩家手動調畫質，而是實測幀時間動態關閉非必要氛圍特效（光束/花瓣/裝飾樹），
// 讓「操作順暢」優先於「畫面好看」：高階裝置全開、低階裝置自動降級。

export const SAMPLE_FRAMES = 20;      // 每累積這麼多幀就評估一次平均幀時間
export const DEGRADE_MS = 28;         // 平均幀時間 > 此值（約 <35fps）→ 降級
export const RECOVER_MS = 18;         // 平均幀時間 < 此值（約 >55fps）才恢復，避免來回閃爍（hysteresis）
export const MAX_SAMPLE_S = 0.15;     // 單幀夾在此秒數以內，避免切分頁等單次超長暫停一次拉爆整輪平均
                                       // （20 幀一輪、降級門檻 28ms：單一超長暫停夾在 150ms 內，其餘 19 幀正常時
                                       //   整輪平均仍 <28ms，不會被誤判成裝置慢；真正持續掉幀則不受影響照常偵測）

/**
 * 建立一個效能分級追蹤器。
 * @returns {{liteFX: boolean, track: (rawDt: number) => boolean}}
 *   track() 傳入本幀「未夾住」的真實秒數，回傳目前是否應降級（liteFX）。
 */
export function createPerfTier() {
  const st = { liteFX: false, acc: 0, n: 0 };
  return {
    get liteFX() { return st.liteFX; },
    track(rawDt) {
      st.acc += Math.min(MAX_SAMPLE_S, Math.max(0, rawDt));
      st.n++;
      if (st.n >= SAMPLE_FRAMES) {
        const avgMs = (st.acc / st.n) * 1000;
        st.acc = 0; st.n = 0;
        if (!st.liteFX && avgMs > DEGRADE_MS) st.liteFX = true;
        else if (st.liteFX && avgMs < RECOVER_MS) st.liteFX = false;
      }
      return st.liteFX;
    },
  };
}
