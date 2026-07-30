import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../question-history-visual-fix-v199.css", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../service-worker-v169.js", import.meta.url), "utf8");

test("resultado usa etiquetas de alto contraste", () => {
  assert.match(css, /\.qhfe-result-v198\s*\{/);
  assert.match(css, /background:\s*#fdebed\s*!important/);
  assert.match(css, /background:\s*#fff4d8\s*!important/);
  assert.match(css, /background:\s*#e6f6ed\s*!important/);
  assert.match(css, /border-radius:\s*999px\s*!important/);
});

test("resumo e líquido permanecem dentro do quadro", () => {
  assert.match(css, /#questionHistorySummary\.stats-grid/);
  assert.match(css, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(145px,\s*100%\),\s*1fr\)\)\s*!important/);
  assert.match(css, /min-width:\s*0\s*!important/);
  assert.match(css, /max-width:\s*100%\s*!important/);
  assert.match(css, /overflow:\s*hidden\s*!important/);
});

test("worker publica e aplica o CSS V199", () => {
  assert.match(worker, /20260730-contraste-resultado-liquido-v169/);
  assert.match(worker, /question-history-visual-fix-v199\.css/);
  assert.match(worker, /runtimeAssetText\(RUNTIME_QUESTION_HISTORY_VISUAL_ASSET\)/);
  assert.match(worker, /question-history-visual-fix-v199\.css \*\//);
});

test("worker preserva módulos e correções anteriores", () => {
  for (const marker of [
    "question-bank-json-review-v192.js",
    "question-bank-json-contrast-v193.js",
    "question-bank-json-priority-v195.js",
    "question-bank-json-completion-v196.js",
    "loading-scrollbar-stability-v197.css",
    "question-history-report-core-v198.js",
    "question-history-report-export-v198.js",
    "question-history-report-ui-v198.js"
  ]) assert.ok(worker.includes(marker), marker);
});
