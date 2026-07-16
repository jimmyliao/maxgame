// 守土 Service Worker — 線上優先、離線可玩
const CACHE = "shoutu-v136";
const ASSETS = ["./", "./index.html", "./src/fullscreen.js", "./src/sfx.js", "./src/legacy.js", "./src/moba.js", "./src/battleshop.js", "./src/net.js", "./src/habitat.js", "./src/data/types-chart.js", "./src/data/perf-tier.js", "./manifest.json", "./icon.svg", "./dino.html",
  // 守護者/入侵種寫實插畫（圖檔優先、沒圖時 canvas fallback）：預快取確保離線也看得到
  "./assets/heroes/leopard.png", "./assets/heroes/bear.png", "./assets/heroes/cicada.png", "./assets/heroes/dragonfly.png", "./assets/heroes/deer.png", "./assets/heroes/magpie.png", "./assets/heroes/muntjac.png", "./assets/heroes/macaque.png", "./assets/heroes/salmon.png", "./assets/heroes/pheasant.png", "./assets/heroes/pangolin.png", "./assets/heroes/yellowmarten.png", "./assets/heroes/mikado.png",
  "./assets/field/ground.png", "./assets/field/shrine.png", "./assets/field/nursery.png", "./assets/field/rock.png", "./assets/field/bush.png", "./assets/field/tree.png", "./assets/views/leopard_front.png", "./assets/views/leopard_right.png", "./assets/views/leopard_back.png", "./assets/views/leopard_left.png",
  "./assets/views/bear_front.png", "./assets/views/bear_right.png", "./assets/views/bear_back.png", "./assets/views/bear_left.png", "./assets/views/cicada_front.png", "./assets/views/cicada_right.png", "./assets/views/cicada_back.png", "./assets/views/cicada_left.png", "./assets/views/dragonfly_front.png", "./assets/views/dragonfly_right.png", "./assets/views/dragonfly_back.png", "./assets/views/dragonfly_left.png", "./assets/views/deer_front.png", "./assets/views/deer_right.png", "./assets/views/deer_back.png", "./assets/views/deer_left.png", "./assets/views/magpie_front.png", "./assets/views/magpie_right.png", "./assets/views/magpie_back.png", "./assets/views/magpie_left.png", "./assets/views/muntjac_front.png", "./assets/views/muntjac_right.png", "./assets/views/muntjac_back.png", "./assets/views/muntjac_left.png", "./assets/views/macaque_front.png", "./assets/views/macaque_right.png", "./assets/views/macaque_back.png", "./assets/views/macaque_left.png", "./assets/views/salmon_front.png", "./assets/views/salmon_right.png", "./assets/views/salmon_back.png", "./assets/views/salmon_left.png", "./assets/views/pheasant_front.png", "./assets/views/pheasant_right.png", "./assets/views/pheasant_back.png", "./assets/views/pheasant_left.png", "./assets/views/pangolin_front.png", "./assets/views/pangolin_right.png", "./assets/views/pangolin_back.png", "./assets/views/pangolin_left.png", "./assets/views/yellowmarten_front.png", "./assets/views/yellowmarten_right.png", "./assets/views/yellowmarten_back.png", "./assets/views/yellowmarten_left.png", "./assets/views/mikado_front.png", "./assets/views/mikado_right.png", "./assets/views/mikado_back.png", "./assets/views/mikado_left.png", "./assets/run/bear_0.png", "./assets/run/bear_1.png", "./assets/run/bear_2.png", "./assets/run/bear_3.png", "./assets/run/canetoad_0.png", "./assets/run/canetoad_1.png", "./assets/run/canetoad_2.png", "./assets/run/canetoad_3.png", "./assets/run/cicada_0.png", "./assets/run/cicada_1.png", "./assets/run/cicada_2.png", "./assets/run/cicada_3.png", "./assets/run/deer_0.png", "./assets/run/deer_1.png", "./assets/run/deer_2.png", "./assets/run/dragonfly_0.png", "./assets/run/dragonfly_1.png", "./assets/run/dragonfly_2.png", "./assets/run/dragonfly_3.png", "./assets/run/frog_0.png", "./assets/run/frog_1.png", "./assets/run/frog_2.png", "./assets/run/frog_3.png", "./assets/run/ibis_0.png", "./assets/run/ibis_1.png", "./assets/run/ibis_2.png", "./assets/run/leopard_0.png", "./assets/run/leopard_1.png", "./assets/run/leopard_2.png", "./assets/run/leopard_3.png", "./assets/run/macaque_0.png", "./assets/run/macaque_1.png", "./assets/run/macaque_2.png", "./assets/run/macaque_3.png", "./assets/run/magpie_0.png", "./assets/run/magpie_1.png", "./assets/run/mikado_0.png", "./assets/run/mikado_1.png", "./assets/run/muntjac_0.png", "./assets/run/muntjac_1.png", "./assets/run/muntjac_2.png", "./assets/run/pangolin_0.png", "./assets/run/pangolin_1.png", "./assets/run/pangolin_2.png", "./assets/run/python_0.png", "./assets/run/python_1.png", "./assets/run/python_2.png", "./assets/run/salmon_0.png", "./assets/run/salmon_1.png", "./assets/run/skink_0.png", "./assets/run/skink_1.png", "./assets/run/skink_2.png", "./assets/run/snail_0.png", "./assets/run/snail_1.png", "./assets/run/snail_2.png", "./assets/run/snail_3.png", "./assets/run/yellowmarten_0.png", "./assets/run/yellowmarten_1.png", "./assets/run/yellowmarten_2.png",
  "./assets/bosses/snail.png", "./assets/bosses/iguana.png", "./assets/bosses/frog.png", "./assets/bosses/ibis.png", "./assets/bosses/anole.png", "./assets/bosses/canetoad.png", "./assets/bosses/python.png", "./assets/bosses/skink.png"];

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
