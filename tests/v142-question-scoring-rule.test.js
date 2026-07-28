const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const patch = fs.readFileSync('question-scoring-rule-v142.js', 'utf8');
const publishedPatch = fs.readFileSync('docs/question-scoring-rule-v142.js', 'utf8');
const loader = fs.readFileSync('central-goals-real-time-v124.js', 'utf8');
const publishedLoader = fs.readFileSync('docs/central-goals-real-time-v124.js', 'utf8');

test('regra de pontuação possui sintaxe JavaScript válida', () => {
  assert.doesNotThrow(() => new Function(patch));
});

test('oferece os três modelos de correção', () => {
  assert.match(patch, /value="simple"/);
  assert.match(patch, /value="ce"/);
  assert.match(patch, /value="custom"/);
});

test('aplica as fórmulas esperadas sem alterar os números brutos', () => {
  assert.match(patch, /correct: 1, wrong: -1, blank: 0/);
  assert.match(patch, /correct: 1, wrong: 0, blank: 0/);
  assert.match(patch, /correct \* ruleWeights\.correct \+ wrong \* ruleWeights\.wrong \+ blank \* ruleWeights\.blank/);
  assert.match(patch, /correct \/ total \* 100/);
});

test('usa Cebraspe como padrão C/E e demais bancas como pontuação simples', () => {
  assert.match(patch, /toLowerCase\(\) === "cebraspe" \? "ce" : "simple"/);
});

test('remove o rótulo fixo Líquido Cebraspe da exibição calculada', () => {
  assert.match(patch, /Líquido\\s\+Cebraspe/);
  assert.match(patch, /Líquido C\/E/);
  assert.match(patch, /Pontuação simples/);
});

test('não altera persistência, sincronização ou envio do formulário', () => {
  assert.doesNotMatch(patch, /localStorage|indexedDB|saveData|autoSyncAfterSave|submit\s*\(/i);
});

test('módulo está incorporado e arquivos publicados são idênticos', () => {
  const bundle = fs.readFileSync('app-v169.js', 'utf8');
  assert.equal((bundle.match(/Aldus source: question-scoring-rule-v142\.js/g) || []).length, 1);
  assert.doesNotMatch(loader, /question-scoring-rule-v142\.js|createElement\(["']script/);
  assert.equal(publishedPatch, patch);
  assert.equal(publishedLoader, loader);
});
