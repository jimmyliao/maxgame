# 角色寫實圖 — AI 生圖提示詞 & 放置說明

遊戲已內建「圖檔優先」管線：把對應 PNG 放進 `assets/` 後，畫面會自動用寫實圖，沒有圖就用程式插畫頂著。

## 重點規格（每張圖都要）
- **去背 PNG**（透明背景），不要白底/方框。
- **全身、面向右側或 3/4 右前**（遊戲是橫向對戰，程式會自動左右翻轉）。
- 建議尺寸 1024×1024 以上，主體置中、四周留一點空間。
- 風格一致：寫實 / UE5 render / cinematic lighting / game character asset。

## 檔名（放好就生效）
```
assets/heroes/leopard.png    石虎
assets/heroes/bear.png       台灣黑熊
assets/heroes/cicada.png     台灣爺蟬
assets/heroes/dragonfly.png  無霸勾蜓
assets/bosses/snail.png      福壽螺王
assets/bosses/iguana.png     綠鬣蜥王
assets/bosses/frog.png       斑腿樹蛙王
assets/bosses/ibis.png       埃及聖䴉王
```

## 怎麼把圖加進來
- **方法 A**：把圖丟到上面對應路徑，commit + push（重構分支 / main），1–2 分鐘後線上生效。
- **方法 B**：直接把圖傳給我（在對話裡），我幫你命名、放好、commit、上線。

---

## 守護者（台灣特有種）

### 1. 石虎 → `assets/heroes/leopard.png`
> A realistic full-body Taiwanese leopard cat (Prionailurus bengalensis chinensis), 3/4 front view facing right, confident heroic stance, sharp focus on leopard-like rosette spots and the two white stripes between its eyes, amber eyes. Misty Taiwanese subtropical forest hinted, Unreal Engine 5 render, cinematic rim lighting, 8k, game character asset, isolated on transparent background.

### 2. 台灣黑熊 → `assets/heroes/bear.png`
> A realistic full-body Formosan black bear (Ursus thibetanus formosanus), 3/4 front view facing right, powerful protective stance, clear white V-shaped crescent mark on the chest, glossy black fur. Mountain forest hinted, Unreal Engine 5 render, cinematic lighting, 8k, game character asset, isolated on transparent background.

### 3. 台灣爺蟬 → `assets/heroes/cicada.png`
> A realistic large Taiwanese giant cicada (Formotosena seebohmi), 3/4 view facing right, translucent veined wings spread slightly, detailed compound eyes and green-black patterned body, hint of tree bark. Unreal Engine 5 render, macro cinematic lighting, 8k, game character asset, isolated on transparent background.

### 4. 無霸勾蜓 → `assets/heroes/dragonfly.png`
> A realistic giant Taiwanese dragonfly (Anotogaster sieboldii), side/3-4 view facing right, long slender body with green and black bands, four iridescent transparent wings, large compound eyes, dynamic flying pose. Clean stream/wetland hinted, Unreal Engine 5 render, cinematic lighting, 8k, game character asset, isolated on transparent background.

## 入侵者（外來入侵種，魔王 — 帶威脅感）

### 5. 福壽螺王 → `assets/bosses/snail.png`
> A menacing giant golden apple snail (Pomacea canaliculata) as a boss monster, 3/4 view facing left, oversized brown spiral shell, glistening slimy body, extended eye stalks, ominous mood, flooded rice paddy hinted. Unreal Engine 5 render, dramatic cinematic lighting, 8k, game boss asset, isolated on transparent background.

### 6. 綠鬣蜥王 → `assets/bosses/iguana.png`
> A menacing giant green iguana (Iguana iguana) as an invasive boss, 3/4 view facing left, aggressive stance, prominent dorsal spines, dewlap, long tail, scaly green skin, ominous mood. Unreal Engine 5 render, dramatic cinematic lighting, 8k, game boss asset, isolated on transparent background.

### 7. 斑腿樹蛙王 → `assets/bosses/frog.png`
> A menacing oversized spot-legged tree frog (Polypedates megacephalus) as an invasive boss, 3/4 view facing left, bulging eyes, brown body with dark spotted legs, wet glossy skin, aggressive crouch, stream at night hinted. Unreal Engine 5 render, dramatic cinematic lighting, 8k, game boss asset, isolated on transparent background.

### 8. 埃及聖䴉王 → `assets/bosses/ibis.png`
> A menacing African sacred ibis (Threskiornis aethiopicus) as an invasive boss bird, 3/4 view facing left, white body with black head and long curved black bill, wings slightly raised, ominous mood, wetland at dusk hinted. Unreal Engine 5 render, dramatic cinematic lighting, 8k, game boss asset, isolated on transparent background.

---

> 小技巧：8 張請用**同一個生圖工具、同一組風格關鍵字**生成（例如都加 `Unreal Engine 5 render, cinematic lighting, isolated on transparent background`），這樣 8 隻放在一起才會風格統一、像同一款大作。
