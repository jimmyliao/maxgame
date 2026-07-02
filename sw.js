// 守土 Service Worker — 線上優先、離線可玩
const CACHE = "shoutu-v118";
const ASSETS = ["./", "./index.html", "./src/fullscreen.js", "./src/sfx.js", "./src/legacy.js", "./src/moba.js", "./src/battleshop.js", "./src/net.js", "./src/habitat.js", "./src/data/types-chart.js", "./manifest.json", "./icon.svg", "./dino.html",
  // 守護者/入侵種寫實插畫（圖檔優先、沒圖時 canvas fallback）：預快取確保離線也看得到
  "./assets/heroes/leopard.png", "./assets/heroes/bear.png", "./assets/heroes/cicada.png", "./assets/heroes/dragonfly.png", "./assets/heroes/deer.png", "./assets/heroes/magpie.png",
  "./assets/field/ground.png", "./assets/bosses/snail.png", "./assets/bosses/iguana.png", "./assets/bosses/frog.png", "./assets/bosses/ibis.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    // 強制略過瀏覽器 HTTP 快取，永遠抓最新（解決 GitHub Pages 快取導致看到舊版）
    fetch(e.request, { cache: "no-store" })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});
