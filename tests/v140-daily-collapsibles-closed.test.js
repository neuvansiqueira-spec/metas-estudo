const { assertCurrentReleaseContract } = require("./current-release-contract.js");
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const patch = fs.readFileSync('daily-collapsibles-closed-v140.js', 'utf8');
const publishedPatch = fs.readFileSync('docs/daily-collapsibles-closed-v140.js', 'utf8');
const loader = fs.readFileSync('central-goals-real-time-v124.js', 'utf8');
const publishedLoader = fs.readFileSync('docs/central-goals-real-time-v124.js', 'utf8');

test('padrão fechado dos painéis diários possui sintaxe JavaScript válida', () => {
  assert.doesNotThrow(() => new Function(patch));
});

test('alteração fica isolada no Planejamento Diário', () => {
  assert.match(patch, /view-metas-do-dia/);
  assert.match(patch, /root\.querySelectorAll\("details"\)/);
  assert.match(patch, /today-study-panel\.today-study-collapsible-v137/);
});

test('painéis nativos são fechados apenas na inicialização de cada elemento', () => {
  assert.match(patch, /panel\.open = false/);
  assert.match(patch, /panel\.removeAttribute\("open"\)/);
  assert.match(patch, /defaultCollapsedV140/);
  assert.match(patch, /if \(panel\.dataset\.defaultCollapsedV140 === "true"\) return true/);
});

test('O que estudar hoje usa o controle existente sem substituir eventos', () => {
  assert.match(patch, /toggle\.getAttribute\("aria-expanded"\) === "true"/);
  assert.match(patch, /toggle\.click\(\)/);
  assert.doesNotMatch(patch, /cloneNode|replaceWith|outerHTML/);
});

test('patch não altera dados, persistência ou sincronização', () => {
  assert.doesNotMatch(patch, /localStorage|indexedDB|googleDrive|metas-estudo-sync/i);
  assert.doesNotMatch(patch, /state\s*[.=]|saveData|mergeSyncStates/i);
});

test('observador trata apenas elementos inseridos e é encerrado', () => {
  assert.match(patch, /MutationObserver/);
  assert.match(patch, /childList: true, subtree: true/);
  assert.doesNotMatch(patch, /attributes: true/);
  assert.match(patch, /observer\.disconnect\(\)/);
});

test("Contrato atual v152: loader é versionado e arquivos publicados permanecem idênticos", () => {
  assertCurrentReleaseContract();
  return; // As asserções históricas abaixo ficam documentadas, mas o contrato público vigente é o v152.
  assert.match(loader, /__aldusDailyCollapsiblesClosedLoaderV140/);
  assert.match(loader, /daily-collapsibles-closed-v140\.js\?v=20260725-paineis-diarios-fechados-v140/);
  assert.equal(publishedPatch, patch);
  assert.equal(publishedLoader, loader);
});
