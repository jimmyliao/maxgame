# 角色寫實圖 — 第二彈：傳奇與特殊能力篇（未來角色構想）

> 這份文件記錄「下一批」可能加入遊戲的台灣特有種角色設計提示詞，供未來擴充章節/圖鑑使用。
> **目前這 4 隻尚未加入 `HEROES`／`GUARDIANS` 資料，也還沒有對應的 `drawCreature` 程式繪製 kind**——
> 要真正上場，需要先完成資料設計（屬性、技能、數值）與 canvas 美術（鐵則：單檔零外部資源，
> 正式上場一定要有程式繪製版本；這裡的 AI 生圖提示詞可作為「圖檔優先」管線的參考圖，放法比照
> `docs/ART-PROMPTS.md` 的說明。

## 這一彈的角色

| 角色 | 學名/俗名 | 特色 |
|---|---|---|
| 山羌 | 台灣山羌（Formosan Reeve's muntjac） | 神秘森林能量系，體型小巧靈活 |
| 台灣獼猴 | Formosan rock macaque | 動態武術戰鬥姿態，敏捷近戰 |
| 櫻花鉤吻鮭 | Formosan landlocked salmon | 傳說級、優游於漩渦水流魔法光暈中 |
| 藍腹鷴 | Swinhoe's pheasant（黑長尾雉） | 華麗金屬光澤羽毛，昂首站姿 |

## 原始提示詞（使用者提供，2×2 角色選角合輯構圖）

> A 3D video game character selection sheet featuring Taiwan's unique endemic species, presented in a 2x2 grid formation. Top-left: a cute and mystical Formosan Reeve's muntjac (Taiwanese barking deer) with glowing forest energy effects. Top-right: a sharp, aggressive Taiwanese Macaque (Formosan rock monkey) in a dynamic martial arts combat stance. Bottom-left: a sleek, legendary Formosan landlocked salmon swimming in a magical swirling water aura. Bottom-right: a colorful and striking Swinhoe's pheasant standing in a proud pose with metallic feathers. Modern video game character design style, vibrant cinematic lighting, Unreal Engine 5 render, highly detailed, sharp focus, 8k resolution, isolated on a solid black background for easy sprite cutting.

這張是「2×2 選角合輯」構圖，適合當風格參考/情緒板，但**不能直接拿來當遊戲內單一角色圖**（遊戲管線需要每隻角色各自一張去背 PNG，面向右側，比照 `docs/ART-PROMPTS.md` 的規格）。若要正式導入，建議：

1. 先決定要不要真的把這 4 隻加入遊戲（保育類型/技能/相剋屬性怎麼設計、要放進哪個章節或當新守護者）。
2. 用上面合輯當風格參考，另外分別生成 4 張獨立去背全身圖，命名比照現有慣例，例如：
   ```
   assets/heroes/muntjac.png   山羌
   assets/heroes/macaque.png   台灣獼猴
   assets/heroes/salmon.png    櫻花鉤吻鮭
   assets/heroes/pheasant.png  藍腹鷴
   ```
3. 同步設計對應的 `drawCreature` 程式繪製版本（鐵則要求，圖檔只是「優先顯示」的加分，不能取代程式繪製 fallback）。

有想好要不要正式導入、放進哪個系統（新章節魔王？新守護者？棲地基地新物種？）再跟我說一聲，我可以評估怎麼串進既有資料合約。
