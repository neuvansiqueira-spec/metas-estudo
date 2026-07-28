const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const patch = fs.readFileSync('daily-smart-review-collapsible-v138.js', 'utf8');
const publishedPatch = fs.readFileSync('docs/daily-smart-review-collapsible-v138.js', 'utf8');
const loader = fs.readFileSync('daily-study-collapsible-v137.js', 'utf8');
const publishedLoader = fs.readFileSync('docs/daily-study-collapsible-v137.js', 'utf8');

test('patch da revisão diária possui sintaxe JavaScript válida', () => {
  assert.doesNotThrow(() => new Function(patch));
});

test('alteração fica isolada na Revisão Inteligente do Plano do Dia', () => {
  assert.match(patch, /view-metas-do-dia/);
  assert.match(patch, /details\.day-smart-review-panel/);
  assert.match(patch, /day-smart-review-summary/);
  assert.match(patch, /daySmartReview/);
  assert.doesNotMatch(patch, /today-study-panel/);
});

test('texto visual alterna entre Abrir e Recolher conforme o estado nativo do details', () => {
  assert.match(patch, /const isOpen = panel\.open/);
  assert.match(patch, /isOpen \? "Recolher" : "Abrir"/);
  assert.match(patch, /panel\.addEventListener\("toggle", updateState\)/);
  assert.match(patch, /aria-expanded/);
  assert.match(patch, /aria-controls/);
});

test('patch não altera persistência, dados ou sincronização', () => {
  assert.doesNotMatch(patch, /localStorage/);
  assert.doesNotMatch(patch, /indexedDB/i);
  assert.doesNotMatch(patch, /googleDrive|metas-estudo-sync|state\s*[.=]/i);
  assert.doesNotMatch(patch, /panel\.open\s*=/);
});

test('módulo é idempotente e incorporado ao bundle', () => {
  assert.match(patch, /__aldusDailySmartReviewCollapsibleV138/);
  const bundle = fs.readFileSync('app-v169.js', 'utf8');
  assert.equal((bundle.match(/Aldus source: daily-smart-review-collapsible-v138\.js/g) || []).length, 1);
  assert.doesNotMatch(loader, /daily-smart-review-collapsible-v138\.js|createElement\(["']script/);
});

test('arquivos publicados permanecem idênticos aos arquivos da raiz', () => {
  assert.equal(publishedPatch, patch);
  assert.equal(publishedLoader, loader);
});
