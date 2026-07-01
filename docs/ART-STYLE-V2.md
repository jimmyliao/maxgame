# 角色美術風格升級 v2 — 精緻插畫風（依參考圖）

使用者提供的參考圖是「石虎．山林」角色設定卡：精緻半寫實插畫風、細膩毛髮質感、夜間山林場景＋月光、
金色技能特效光圈，並展示待機／移動／技能特效／休憩 4 種姿態。使用者要求**全部**動物（守護者＋入侵種）
在**大廳**與**遊戲對戰**（1v1 側視戰鬥＋MOBA 俯視戰鬥）都要換成這個風格。

## 目前技術現況（重要，請先讀）

遊戲一直都有「圖檔優先、沒圖用程式畫」的管線，**這次不需要改任何程式碼**——只要把對應風格的 PNG
放進正確路徑，全站（大廳、圖鑑、1v1 戰鬥、MOBA 戰鬥）就會自動改用真圖：

| 用途 | 路徑規則 | 涵蓋畫面 |
|---|---|---|
| 側視圖（`drawCreature`，`src/legacy.js`） | `assets/heroes/<kind>.png`（守護者）／`assets/bosses/<kind>.png`（入侵種） | 大廳角色展示、圖鑑、復育畫面卡片、1v1 側視戰鬥 |
| 俯視圖（`SPRITES_TOP`，`src/moba.js`） | `assets/top/<kind>.png` | MOBA「棲地復育保衛戰」戰場（守護者＋入侵種全部都用這組） |

**我目前的工具沒有生圖能力**，沒辦法直接幫你產生這些 PNG——但我可以把每一隻動物、兩種視角、符合這張參考圖
風格的提示詞都寫好，你可以用任何 AI 生圖工具（例如你產生這張石虎參考圖用的工具）批次生成，生完傳給我，
我幫你命名放好路徑、commit、上線，1–2 分鐘生效，完全不用等我改程式。

**待機／移動／技能特效／休憩 4 種姿態**：目前管線一隻角色只支援「一張靜態圖」，還沒有依動畫狀態切換多張圖
的機制。如果你要參考圖那樣完整的多姿態系統，這是額外的工程（要另外設計「哪個時機切哪張圖」），建議先用
**一張最能代表角色個性的姿態**（通常是待機或技能特效那張最有魄力）把 10 隻角色的視覺風格統一升級，之後
如果還想做多姿態動畫，我們再排一個任務去接。

## 共用風格描述（每一張生圖都加在提示詞後面）

```
Semi-realistic painterly game character illustration, detailed fur/feather texture with individual
strand rendering, dramatic atmospheric lighting, rich color depth and soft rim light, Taiwanese
wilderness backdrop hinted (misty forest / moonlit mountains / clean stream / wetland reeds — pick
per habitat), mystical glowing particle accents in the guardian's elemental color, cinematic game
splash-art quality, ultra-detailed, isolated on transparent background for sprite use, single
character only, no text, no UI, no frame.
```

守護者（有保育／魔法感）額外加：`gentle heroic pose, warm noble expression, soft golden-green magic
circle glow beneath feet echoing forest/water/sky/bug elemental type`。
入侵種（威脅感）額外加：`slightly ominous mood, cold-toned rim light, aggressive stance, no magic circle`。

## 側視圖（`assets/heroes/` `assets/bosses/`，3/4 前側或正側面、面向右）

1. **石虎** → `assets/heroes/leopard.png`（🌲山林）
> A semi-realistic painterly Taiwanese leopard cat (Prionailurus bengalensis chinensis), 3/4 side view facing right, sharp amber eyes, detailed rosette-spotted fur with individual strand texture, confident night-hunter pose, misty moonlit forest hinted, golden-green magic circle glowing beneath paws. [+共用風格描述][+守護者加註]

2. **台灣黑熊** → `assets/heroes/bear.png`（🌲山林）
> A semi-realistic painterly Formosan black bear, 3/4 side view facing right, glossy black fur with detailed strand texture, clear white V-shaped chest mark, powerful protective stance, misty mountain forest hinted, golden-green magic circle glowing beneath paws. [+共用風格描述][+守護者加註]

3. **台灣爺蟬** → `assets/heroes/cicada.png`（🪲蟲）
> A semi-realistic painterly giant Taiwanese cicada, 3/4 side view facing right, translucent finely-veined wings catching light, iridescent green-black patterned body, perched on textured tree bark, amber magic circle glowing beneath. [+共用風格描述][+守護者加註]

4. **無霸勾蜓** → `assets/heroes/dragonfly.png`（🌪天空）
> A semi-realistic painterly giant dragonfly (Anotogaster sieboldii), 3/4 side view facing right, four iridescent transparent wings with fine vein detail, slender green-black banded body, clean stream backdrop hinted, sky-blue magic circle glowing beneath. [+共用風格描述][+守護者加註]

5. **梅花鹿** → `assets/heroes/deer.png`（🌲山林，復育中）
> A semi-realistic painterly Formosa sika deer, 3/4 side view facing right, tan coat with soft white spots rendered in fine fur texture, gentle noble expression, small velvet antlers, warm forest clearing backdrop, golden-green magic circle glowing beneath. [+共用風格描述][+守護者加註]

6. **台灣藍鵲** → `assets/heroes/magpie.png`（🌪天空）
> A semi-realistic painterly Taiwan blue magpie, 3/4 side view facing right, deep blue plumage with fine individual feather strand detail, long trailing tail feathers, red beak, proud perched pose, sky-blue magic circle glowing beneath. [+共用風格描述][+守護者加註]

7. **福壽螺王** → `assets/bosses/snail.png`（💧水域，入侵）
> A semi-realistic painterly giant golden apple snail (invasive), 3/4 side view facing left, oversized detailed spiral shell with fine texture, glistening slimy body, flooded rice paddy backdrop hinted, ominous cold-toned lighting. [+共用風格描述][+入侵種加註]

8. **綠鬣蜥王** → `assets/bosses/iguana.png`（🌲山林，入侵）
> A semi-realistic painterly green iguana (invasive), 3/4 side view facing left, detailed scaly skin texture, prominent dorsal spines, dewlap, aggressive crouched stance, disturbed farmland backdrop hinted, ominous cold-toned lighting. [+共用風格描述][+入侵種加註]

9. **斑腿樹蛙王** → `assets/bosses/frog.png`（💧水域，入侵）
> A semi-realistic painterly spot-legged tree frog (invasive), 3/4 side view facing left, wet glossy skin with fine texture, bulging eyes, dark-spotted legs, night stream backdrop hinted, ominous cold-toned lighting. [+共用風格描述][+入侵種加註]

10. **埃及聖䴉王** → `assets/bosses/ibis.png`（🌪天空，入侵）
> A semi-realistic painterly African sacred ibis (invasive), 3/4 side view facing left, detailed white plumage with fine feather texture, black head and long curved bill, wings slightly raised, dusk wetland backdrop hinted, ominous cold-toned lighting. [+共用風格描述][+入侵種加註]

## 俯視圖（`assets/top/`，正上方往下看、面向右，MOBA 戰場用）

同樣 10 隻，把上面「3/4 側視、面向右/左」改成「top-down bird's-eye view, full body from directly
above, facing right」，其餘描述細節與風格套用同一套規則即可（守護者加金綠魔法圈、入侵種偏冷色調威脅感）。
例如石虎俯視版：

> Top-down bird's-eye view of a Taiwanese leopard cat, semi-realistic painterly style, full body from
> directly above, facing right, detailed rosette-spotted fur texture, golden-green magic circle glowing
> beneath, moonlit forest ground hinted. [+共用風格描述][+守護者加註]

其餘 9 隻依此類推替換主體描述（可直接沿用 `docs/ART-PROMPTS-TOP.md` 每隻的主體描述文字，只把風格結尾換成
本文件的共用風格描述）。

## 尚未加入遊戲、但你已經提過的角色（生成時可以一起做，先備著）

- 山羌、台灣獼猴、櫻花鉤吻鮭、藍腹鷴（`docs/ART-PROMPTS-2.md`）——尚未寫入 `HEROES`/`GUARDIANS`，等資料與程式繪製上場後再補俯視/側視雙版本路徑。
- 沙氏變色蜥（`anole`，生態相剋任務新增中的入侵種）——等該功能整合上線、確認實際 kind 命名後補上。

## 怎麼加圖上線

- **方法 A**：把圖丟到上面對應路徑 → commit + push（開發分支／main）→ 1–2 分鐘線上生效。
- **方法 B**（建議）：生完直接傳圖給我，我幫你命名、放好路徑、commit、上線，兩種視角（側視＋俯視）都放好才算一隻角色完成。
