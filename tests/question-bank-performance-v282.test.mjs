import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const filters224 = fs.readFileSync("question-bank-filters-v224.js", "utf8");
const filters225 = fs.readFileSync("question-bank-filters-v225.js", "utf8");
const appSource = fs.readFileSync("script.js", "utf8");

test("contagens dos filtros são agregadas em uma passagem por etapa", () => {
  assert.match(filters225, /function optionEntries\(key, filters\)/);
  assert.match(filters225, /const counted = new Map\(\)/);
  assert.match(filters225, /questionItemMatchCache = new WeakMap\(\)/);
  assert.doesNotMatch(filters225, /function countForOption\(/);
});

test("abertura do Banco não repete a renderização completa dos filtros", () => {
  assert.doesNotMatch(filters224, /bindExtraEvents\(\);\s*enhancedRenderCascadingFilters\(\);\s*return result/);
  assert.match(filters225, /if \(!extraControlsReady\) renderFilters\(\)/);
  assert.doesNotMatch(filters225, /function initialize\(\) \{\s*bindEvents\(\);\s*renderFilters\(\)/);
});

test("painéis pesados são calculados somente quando abertos", () => {
  assert.match(appSource, /const QB_LAZY_PANELS/);
  assert.match(appSource, /panel\.addEventListener\("toggle"/);
  assert.match(appSource, /delete panel\.dataset\.qbRenderingV282/);
  assert.match(appSource, /if \(options\.heavy === true\)/);
  assert.doesNotMatch(appSource, /const heavy = options\.heavy !== false/);
});
