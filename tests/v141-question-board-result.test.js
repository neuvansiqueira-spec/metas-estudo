const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const patch = fs.readFileSync('question-board-result-v141.js', 'utf8');
const publishedPatch = fs.readFileSync('docs/question-board-result-v141.js', 'utf8');
const bundle = fs.readFileSync('app.bundle.js', 'utf8');
const publishedBundle = fs.readFileSync('docs/app.bundle.js', 'utf8');

test('resultado de outras bancas possui sintaxe JavaScript válida', () => {
  assert.doesNotThrow(() => new Function(patch));
});

test('resultado usa percentual geral de acertos sem alterar o líquido Cebraspe', () => {
  assert.match(patch, /const accuracy = total \? clamp\(\(correct \/ total\) \* 100, 0, 100\) : 0/);
  assert.match(patch, /isCebraspe/);
  assert.match(patch, /panel\.hidden = !board \|\| isCebraspe/);
  assert.match(patch, /Cálculo geral: acertos ÷ total, sem penalização/);
  assert.doesNotMatch(patch, /correct\s*-\s*wrong/);
});

test('painel acompanha banca e campos numéricos existentes', () => {
  assert.match(patch, /questionBoard/);
  assert.match(patch, /questionTotal/);
  assert.match(patch, /questionCorrect/);
  assert.match(patch, /questionWrong/);
  assert.match(patch, /questionBlank/);
  assert.match(patch, /insertAdjacentElement\("afterend", panel\)/);
});

test('avisa quando a soma dos resultados diverge do total', () => {
  assert.match(patch, /const informed = correct \+ wrong \+ blank/);
  assert.match(patch, /const mismatch = total > 0 && informed !== total/);
  assert.match(patch, /Conferência: acertos \+ erros \+ brancos/);
});

test('alteração é somente visual e não modifica persistência ou sincronização', () => {
  assert.doesNotMatch(patch, /localStorage|indexedDB|saveData|autoSyncAfterSave|googleDrive|metas-estudo-sync/i);
  assert.doesNotMatch(patch, /addEventListener\("submit"/);
});

test('módulo é compilado e idempotente', () => {
  assert.match(bundle, /Aldus source: question-board-result-v141\.js/);
  assert.match(patch, /__aldusQuestionBoardResultV141/);
});

test('arquivos publicados permanecem idênticos aos arquivos da raiz', () => {
  assert.equal(publishedPatch, patch);
  assert.equal(publishedBundle, bundle);
});
