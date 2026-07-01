#!/usr/bin/env node
// gen-image.mjs — AI 產圖 CLI（概念圖 / 參考用，非直接進遊戲）
//
// 用途：讓主 Claude 一拿到 API key 就能立刻產「概念圖 / mood board / 參考圖」，
//       用來指導我們用 Canvas2D 純程式重畫（遊戲鐵則：單檔零外部資源，
//       不可把點陣圖塞進遊戲、不可進 sw.js ASSETS）。
//
// 支援：--provider openai | gemini
// 金鑰：只從 process.env 讀（OPENAI_API_KEY / GEMINI_API_KEY），絕不硬寫。
// 代理：尊重 HTTPS_PROXY（Node v22 全域 fetch 需手動掛 proxy dispatcher）。
//
// 範例：
//   OPENAI_API_KEY=sk-... node tools/gen-image.mjs --provider openai \
//       --prompt "台灣石虎在低海拔次生林，寫實水彩概念圖" --out ./out/leopard.png
//   GEMINI_API_KEY=... node tools/gen-image.mjs --provider gemini \
//       --prompt "福壽螺入侵稻田的生態插畫" --out ./out/snail.png --size 1024x1024
//
// 注意：本工具需要有效金鑰才會真的呼叫 API。無金鑰時會優雅報錯並 exit 1。

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// ---------- 參數解析 ----------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true; // flag 無值
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function die(msg, code = 1) {
  console.error(`\n[gen-image] 錯誤：${msg}\n`);
  process.exit(code);
}

const USAGE = `
gen-image.mjs — AI 產圖 CLI（概念圖 / 參考用）

用法：
  node tools/gen-image.mjs --provider <openai|gemini> --prompt "..." --out <path.png> [--size 1024x1024] [--quality high]

參數：
  --provider   openai 或 gemini（必填）
  --prompt     文字提示（必填）
  --out        輸出 PNG 檔路徑（必填），建議放 scratchpad 或 docs/research/refs/（勿 commit 大圖）
  --size       影像尺寸，openai: 1024x1024 | 1536x1024 | 1024x1536 | auto（預設 1024x1024）
  --quality    openai 品質 low | medium | high（預設 high）
  --aspect     gemini 長寬比，例 1:1 | 16:9 | 4:3（可選）

金鑰（只從環境變數讀，絕不寫進檔案／原始碼）：
  OPENAI_API_KEY   provider=openai 時必要
  GEMINI_API_KEY   provider=gemini 時必要

代理：自動尊重 HTTPS_PROXY 環境變數。
`;

// ---------- 代理支援（Node v22 全域 fetch）----------
// Node 內建 fetch（undici）預設不讀 HTTPS_PROXY。三種讓它走代理的方式，本工具都相容：
//   1)【推薦・零依賴】用環境變數 NODE_USE_ENV_PROXY=1 執行 node，Node 會自動
//      依 HTTPS_PROXY 走代理（Node 20.13+／22 內建，實測本沙盒可通）。
//   2) 若已 `npm i undici`，本函式會自動掛 ProxyAgent（不需第 1 點）。
//   3) 若都沒有且有設 HTTPS_PROXY，會印提示叫你加 NODE_USE_ENV_PROXY=1，仍嘗試直連。
// 這樣就不必硬相依 undici（Node v22 並未把 undici 暴露成可 import 的內建模組）。
async function buildFetchOptions() {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy) return {};

  // 已用 NODE_USE_ENV_PROXY=1 執行 → Node 原生處理，不需再掛 dispatcher。
  if (process.env.NODE_USE_ENV_PROXY === '1') return {};

  // 嘗試選用已安裝的 undici（可選相依）。
  try {
    const { ProxyAgent } = await import('undici');
    return { dispatcher: new ProxyAgent(proxy) };
  } catch {
    console.error(
      '[gen-image] 提示：偵測到 HTTPS_PROXY 但未啟用代理支援。\n' +
      '  最簡單方式：在指令前加 NODE_USE_ENV_PROXY=1，例如：\n' +
      `  NODE_USE_ENV_PROXY=1 node tools/gen-image.mjs ...\n` +
      '  （或 `npm i undici` 讓本工具自動掛 ProxyAgent。）本次仍嘗試直連。'
    );
    return {};
  }
}

// ---------- OpenAI ----------
async function genOpenAI({ prompt, size, quality }, fetchOpts) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    die(
      '缺少 OPENAI_API_KEY。請先設定環境變數再執行，例如：\n' +
      '  export OPENAI_API_KEY="sk-..."\n' +
      '（本工具不接受從指令列或檔案傳入金鑰，避免外洩。）'
    );
  }
  const url = 'https://api.openai.com/v1/images/generations';
  const body = {
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: size || '1024x1024',
    quality: quality || 'high',
    // gpt-image-1 一律回 b64_json（不支援 response_format=url），無需指定。
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    ...fetchOpts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    die(`OpenAI 回應 HTTP ${res.status}：${text.slice(0, 800)}`);
  }
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) die(`OpenAI 回應無 b64_json 影像：${JSON.stringify(json).slice(0, 800)}`);
  return Buffer.from(b64, 'base64');
}

// ---------- Gemini（2.5 Flash Image / nano banana）----------
async function genGemini({ prompt, aspect }, fetchOpts) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    die(
      '缺少 GEMINI_API_KEY。請先設定環境變數再執行，例如：\n' +
      '  export GEMINI_API_KEY="AIza..."\n' +
      '（本工具不接受從指令列或檔案傳入金鑰，避免外洩。）'
    );
  }
  const model = 'gemini-2.5-flash-image';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };
  if (aspect) {
    body.generationConfig = { imageConfig: { aspectRatio: aspect } };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    ...fetchOpts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    die(`Gemini 回應 HTTP ${res.status}：${text.slice(0, 800)}`);
  }
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find(
    (p) => p?.inlineData?.data || p?.inline_data?.data
  );
  const b64 = imgPart?.inlineData?.data || imgPart?.inline_data?.data;
  if (!b64) die(`Gemini 回應無 inlineData 影像：${JSON.stringify(json).slice(0, 800)}`);
  return Buffer.from(b64, 'base64');
}

// ---------- 主流程 ----------
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    console.log(USAGE);
    process.exit(0);
  }

  const provider = args.provider;
  const prompt = args.prompt;
  const out = args.out;

  if (!provider || (provider !== 'openai' && provider !== 'gemini')) {
    die(`--provider 必須是 openai 或 gemini（收到：${provider || '(空)'}）\n${USAGE}`);
  }
  if (!prompt || prompt === true) {
    die(`--prompt 為必填（文字提示）。\n${USAGE}`);
  }
  if (!out || out === true) {
    die(`--out 為必填（輸出 PNG 檔路徑）。\n${USAGE}`);
  }

  const fetchOpts = await buildFetchOptions();

  let buf;
  if (provider === 'openai') {
    buf = await genOpenAI(
      { prompt, size: args.size, quality: args.quality },
      fetchOpts
    );
  } else {
    buf = await genGemini({ prompt, aspect: args.aspect }, fetchOpts);
  }

  const outPath = resolve(process.cwd(), out);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);

  const kb = (buf.length / 1024).toFixed(1);
  console.log(`\n[gen-image] 成功 ✅`);
  console.log(`  provider : ${provider}`);
  console.log(`  檔案     : ${outPath}`);
  console.log(`  大小     : ${kb} KB (${buf.length} bytes)`);
  console.log(`  提醒     : 此為概念/參考圖，勿直接進遊戲、勿加入 sw.js ASSETS。\n`);
}

main().catch((e) => {
  die(`未預期錯誤：${e?.stack || e?.message || e}`);
});
