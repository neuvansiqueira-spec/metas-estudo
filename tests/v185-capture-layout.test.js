import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("tipo confirmado ocupa faixa própria sem comprimir os quatro campos principais", () => {
  const script = read("script.js");
  const css = read("question-bank-capture-import-v182.css");

  assert.match(script, /<div class="qb-capture-row-grid">[\s\S]*data-qb-capture-status[\s\S]*<\/div>\s*<div class="qb-capture-type-strip">/);
  assert.match(script, /qb-capture-type-strip[\s\S]*data-qb-capture-type[\s\S]*data-qb-capture-type-note/);
  assert.match(css, /grid-template-columns:\s*minmax\(260px, 2fr\) repeat\(3, minmax\(130px, 1fr\)\)/);
  assert.match(css, /\.qb-capture-type-strip\s*\{[\s\S]*grid-template-columns:\s*minmax\(220px, 280px\) minmax\(0, 1fr\)/);
});

test("faixa de tipo confirmado volta a uma coluna em telas menores", () => {
  const css = read("question-bank-capture-import-v182.css");

  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.qb-capture-type-strip\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*\.qb-capture-row-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/);
});

test("camada visual permanece sem persistência ou alteração de dados", () => {
  const css = read("question-bank-capture-import-v182.css");

  assert.doesNotMatch(css, /localStorage|indexedDB|saveData|sync|fetch\(/i);
});
