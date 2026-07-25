const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const patch = fs.readFileSync('question-board-result-v141.js', 'utf8');
const publishedPatch = fs.readFileSync('docs/question-board-result-v141.js', 'utf8');
const loader = fs.readFileSync('central-goals-real-time-v124.js', 'utf8');
const publishedLoader = fs.readFileSync('docs/central-goals-real-time-v124.js', 'utf8');

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

test('loader é versionado e idempotente', () => {
  assert.match(loader, /__aldusQuestionBoardResultLoaderV141/);
  assert.match(loader, /question-board-result-v141\.js\?v=20260725-resultado-outras-bancas-v141/);
  assert.match(patch, /__aldusQuestionBoardResultV141/);
});

test('arquivos publicados permanecem idênticos aos arquivos da raiz', () => {
  assert.equal(publishedPatch, patch);
  assert.equal(publishedLoader, loader);
});
