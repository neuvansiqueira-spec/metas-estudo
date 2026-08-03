import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../question-history-charts-v215.js", import.meta.url), "utf8");
const tone = fs.readFileSync(new URL("../question-history-tone-v216.js", import.meta.url), "utf8");

test("distribuição usa hierarquia ampla em vez de três cartões comprimidos", () => {
  assert.match(source, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(source, /\.qhcv215-card:first-child\{grid-column:1\/-1\}/);
  assert.match(source, /@media\(max-width:900px\).*grid-template-columns:1fr/);
});

test("legenda funciona como ranking visual com quantidade e percentual", () => {
  assert.match(source, /class="qhcv215-rank"/);
  assert.match(source, /class="qhcv215-share-track"/);
  assert.match(source, /--qhcv-share:\$\{percentage\.toFixed\(1\)\}%/);
  assert.match(source, /qhcv215-category-count/);
  assert.match(source, /sort\(\(a, b\) => b\.value - a\.value/);
});

test("cabeçalho explica os filtros e remove mensagem técnica antiga", () => {
  assert.match(source, /Filtros sincronizados/);
  assert.match(source, /acompanham automaticamente os filtros aplicados ao histórico/);
  assert.doesNotMatch(source, /Gráfico restaurado/);
});

test("tons azulados preservam contraste nos novos componentes", () => {
  assert.match(tone, /\.qhcv215-legend-item/);
  assert.match(tone, /\.qhcv215-share-track/);
  assert.match(tone, /background:\s*#d7eee7\s*!important/);
});
