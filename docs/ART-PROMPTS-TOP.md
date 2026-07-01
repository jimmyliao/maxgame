# 守護神木 MOBA — 俯視角寫實貼圖（讓遊戲變「不像垃圾遊戲」的關鍵）

程式畫的 2D 有廉價感的天花板。要真正**寫實／精緻**，把對應 PNG 放進 `assets/top/`，遊戲會**自動改用寫實圖**（沒有圖就用程式圖頂著），完全不用改程式。

## 每張圖規格（重要）
- **正俯視角（由正上方往下看，bird's-eye / top-down）**。
- **面向右邊**（頭朝圖的右方）——遊戲會依移動方向自動旋轉。
- **去背 PNG（透明背景）**，主體置中、四周留一點空間。
- 建議 1024×1024、正方形。
- 風格統一：寫實 / cinematic top-down game asset / 柔和真實光影。

## 檔名（放好就生效）
```
assets/top/leopard.png    石虎
assets/top/bear.png       台灣黑熊
assets/top/deer.png       梅花鹿
assets/top/magpie.png     台灣藍鵲
assets/top/dragonfly.png  無霸勾蜓
assets/top/cicada.png     台灣爺蟬
assets/top/snail.png      福壽螺（入侵）
assets/top/iguana.png     綠鬣蜥（入侵）
assets/top/frog.png       斑腿樹蛙（入侵）
assets/top/ibis.png       埃及聖䴉（入侵）
```

## 怎麼加圖
- **方法 A**：把圖丟到上面路徑 → commit + push → 1–2 分鐘線上生效。
- **方法 B**：把圖直接傳給我，我幫你命名、放好、上線。

---

## 生圖提示詞（每張都加：top-down view, facing right, transparent background）

1. **石虎** → `assets/top/leopard.png`
> Top-down bird's-eye view of a Taiwanese leopard cat (Prionailurus bengalensis chinensis), full body seen from directly above, facing right, walking pose, leopard-like rosette spots, amber fur, realistic soft daylight, game asset, isolated on transparent background.

2. **台灣黑熊** → `assets/top/bear.png`
> Top-down bird's-eye view of a Formosan black bear, full body from directly above, facing right, glossy black fur with white V chest mark visible from above, powerful build, realistic lighting, game asset, transparent background.

3. **梅花鹿** → `assets/top/deer.png`
> Top-down bird's-eye view of a Formosa sika deer, from directly above, facing right, tan coat with white spots, small antlers, slender body, realistic, game asset, transparent background.

4. **台灣藍鵲** → `assets/top/magpie.png`
> Top-down bird's-eye view of a Taiwan blue magpie, from directly above, wings folded, facing right, deep blue body, black head, long blue tail trailing left, red beak, realistic, game asset, transparent background.

5. **無霸勾蜓** → `assets/top/dragonfly.png`
> Top-down bird's-eye view of a giant dragonfly (Anotogaster sieboldii), from directly above, four iridescent wings spread, green-black banded body, facing right, realistic macro, game asset, transparent background.

6. **台灣爺蟬** → `assets/top/cicada.png`
> Top-down bird's-eye view of a large Taiwanese giant cicada, from directly above, translucent veined wings folded over back, green-black patterned body, facing right, realistic macro, game asset, transparent background.

7. **福壽螺王** → `assets/top/snail.png`
> Top-down bird's-eye view of a giant golden apple snail (invasive), from directly above, big brown spiral shell centered, slimy body and eye stalks facing right, menacing, realistic, game asset, transparent background.

8. **綠鬣蜥王** → `assets/top/iguana.png`
> Top-down bird's-eye view of a green iguana (invasive), from directly above, facing right, dorsal spines along the back, long tail trailing left, scaly green skin, menacing, realistic, game asset, transparent background.

9. **斑腿樹蛙王** → `assets/top/frog.png`
> Top-down bird's-eye view of a spot-legged tree frog (invasive), from directly above, wide squat body, bulging eyes on top of head, dark-spotted legs splayed, wet glossy skin, facing right, realistic, game asset, transparent background.

10. **埃及聖䴉王** → `assets/top/ibis.png`
> Top-down bird's-eye view of an African sacred ibis (invasive), from directly above, white body, black head and long down-curved black bill facing right, wings folded, realistic, game asset, transparent background.

---
> 小技巧：10 張請用**同一個生圖工具、同一組風格關鍵字**（都加 `realistic top-down game asset, soft daylight, transparent background`），放在一起才會像同一款大作。
