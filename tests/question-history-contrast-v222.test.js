const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const contrast = fs.readFileSync("question-history-contrast-v222.css", "utf8");
const tone = fs.readFileSync("question-history-tone-v216.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

test("títulos e descrições da distribuição permanecem escuros no tema premium", () => {
  assert.match(contrast, /\.qhcv215-title[\s\S]*color: #062845 !important/);
  assert.match(contrast, /\.qhcv215-subtitle[\s\S]*color: #304f68 !important/);
  assert.match(contrast, /\.qhcv215-card h4[\s\S]*color: #0b3154 !important/);
});

test("percentuais, rótulos e contadores não herdam texto branco", () => {
  assert.match(contrast, /\.qhcv215-label[\s\S]*color: #193b56 !important/);
  assert.match(contrast, /\.qhcv215-value small[\s\S]*color: #425f77 !important/);
  assert.match(contrast, /\.qhcv215-category-count[\s\S]*color: #2d4e68 !important/);
  assert.match(contrast, /-webkit-text-fill-color/);
  assert.match(contrast, /opacity: 1 !important/);
});

test("fonte estrutural e publicação carregam o hotfix de contraste", () => {
  assert.match(tone, /20260802-contraste-distribuicao-v222/);
  assert.match(worker, /question-history-contrast-v222\.css/);
  assert.match(worker, /ensureContrastStylesheet/);
});
