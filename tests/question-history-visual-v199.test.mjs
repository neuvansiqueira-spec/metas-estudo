import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../question-history-visual-fix-v199.css", import.meta.url), "utf8");
const bundleCss = fs.readFileSync(new URL("../app.bundle.css", import.meta.url), "utf8");
const bundleJs = fs.readFileSync(new URL("../app.bundle.js", import.meta.url), "utf8");

test("resultado usa etiquetas de alto contraste", () => {
  assert.match(css, /\.qhfe-result-v198\s*\{/);
  assert.match(css, /background:\s*#fdebed\s*!important/);
  assert.match(css, /background:\s*#fff4d8\s*!important/);
  assert.match(css, /background:\s*#e6f6ed\s*!important/);
  assert.match(css, /border-radius:\s*999px\s*!important/);
});

test("resumo e líquido permanecem dentro do quadro", () => {
  assert.match(css, /#questionHistorySummary\.stats-grid/);
  assert.match(css, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(155px,\s*100%\),\s*1fr\)\)\s*!important/);
  assert.match(css, /min-width:\s*0\s*!important/);
  assert.match(css, /max-width:\s*100%\s*!important/);
  assert.match(css, /overflow:\s*hidden\s*!important/);
});

test("bundle publica e aplica o CSS V199", () => {
  assert.match(bundleCss, /question-history-visual-fix-v199\.css \*\//);
  assert.match(bundleCss, /#questionHistorySummary\.stats-grid/);
});

test("bundles preservam módulos e correções anteriores", () => {
  for (const marker of [
    "question-bank-json-review-v192.js",
    "question-bank-json-contrast-v193.js",
    "question-bank-json-priority-v195.js",
    "question-bank-json-completion-v196.js",
    "question-history-report-core-v198.js",
    "question-history-report-export-v198.js",
    "question-history-report-ui-v198.js"
  ]) assert.ok(bundleJs.includes(marker), marker);
  assert.match(bundleCss, /loading-scrollbar-stability-v197\.css/);
});
