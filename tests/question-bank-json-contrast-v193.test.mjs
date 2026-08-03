import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contrast = fs.readFileSync(new URL("../question-bank-json-contrast-v193.js", import.meta.url), "utf8");
const bundle = fs.readFileSync(new URL("../app.bundle.js", import.meta.url), "utf8");

test("V193 força contraste legível no painel sem alterar o site inteiro", () => {
  assert.match(contrast, /\.aldus-json-review-v192 \.aldus-json-review-card-v192/);
  assert.match(contrast, /background:#f8fafc!important/);
  assert.match(contrast, /color:#172033!important/);
  assert.match(contrast, /th\{background:#0b3552!important;color:#ffe17d!important/);
  assert.doesNotMatch(contrast, /(?:^|\n)\s*(?:body|html|:root)\s*\{/);
});

test("V193 diferencia linhas, aviso e botões", () => {
  assert.match(contrast, /tbody tr:nth-child\(even\) td\{background:#eef4f9!important/);
  assert.match(contrast, /aldus-json-review-note-v192\{background:#fff8e6!important/);
  assert.match(contrast, /data-json-review-confirm/);
  assert.match(contrast, /data-json-review-cancel/);
});

test("bundle publica V193", () => {
  assert.match(bundle, /20260730-contraste-revisao-json-qconcursos-v193/);
  assert.match(bundle, /Aldus runtime source: question-bank-json-contrast-v193\.js/);
});

test("bundle mantém V191 e V192 ao adicionar V193", () => {
  assert.match(bundle, /question-bank-json-import-v191\.js/);
  assert.match(bundle, /question-bank-json-review-v192\.js/);
  assert.match(bundle, /question-bank-json-contrast-v193\.js/);
});
