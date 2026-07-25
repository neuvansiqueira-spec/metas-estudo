const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const patch = fs.readFileSync('collapse-chevron-fix-v139.js', 'utf8');
const publishedPatch = fs.readFileSync('docs/collapse-chevron-fix-v139.js', 'utf8');
const loader = fs.readFileSync('daily-study-collapsible-v137.js', 'utf8');
const publishedLoader = fs.readFileSync('docs/daily-study-collapsible-v137.js', 'utf8');

test('correção dos chevrons possui sintaxe JavaScript válida', () => {
  assert.doesNotThrow(() => new Function(patch));
});

test('remove o glifo textual e desenha chevron estável por CSS', () => {
  assert.match(patch, /icon\.textContent = ""/);
  assert.match(patch, /border-right: 2px solid currentColor/);
  assert.match(patch, /border-bottom: 2px solid currentColor/);
  assert.match(patch, /rotate\(-45deg\)/);
  assert.match(patch, /rotate\(45deg\)/);
  assert.doesNotMatch(patch, /⌄/);
});

test('correção fica restrita aos dois controles recolhíveis do Plano do Dia', () => {
  assert.match(patch, /view-metas-do-dia/);
  assert.match(patch, /today-study-toggle-icon-v137/);
  assert.match(patch, /day-smart-review-toggle-icon-v138/);
  assert.doesNotMatch(patch, /localStorage|indexedDB|googleDrive|metas-estudo-sync/i);
});

test('funciona mesmo quando os controles carregam em ordem diferente', () => {
  assert.match(patch, /MutationObserver/);
  assert.match(patch, /applyFix\(\)/);
  assert.match(patch, /observer\.disconnect\(\)/);
});

test('loader é versionado e idempotente', () => {
  assert.match(loader, /__aldusCollapseChevronFixLoaderV139/);
  assert.match(loader, /collapse-chevron-fix-v139\.js\?v=20260724-setas-recolher-v139/);
  assert.match(patch, /__aldusCollapseChevronFixV139/);
});

test('arquivos publicados permanecem idênticos aos arquivos da raiz', () => {
  assert.equal(publishedPatch, patch);
  assert.equal(publishedLoader, loader);
});
