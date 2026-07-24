const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const patch = fs.readFileSync('factory-executive-ui-v136.js', 'utf8');
const publishedPatch = fs.readFileSync('docs/factory-executive-ui-v136.js', 'utf8');
const loader = fs.readFileSync('central-goals-real-time-v124.js', 'utf8');
const publishedLoader = fs.readFileSync('docs/central-goals-real-time-v124.js', 'utf8');

test('interface executiva da Fábrica possui sintaxe JavaScript válida', () => {
  assert.doesNotThrow(() => new Function(patch));
});

test('melhoria permanece isolada na tela da Fábrica', () => {
  assert.match(patch, /#view-fabrica-resumos/);
  assert.match(patch, /factory-executive-toolbar-v136/);
  assert.match(patch, /factory-stage-flow-v136/);
  assert.match(patch, /factoryExecutiveSearchV136/);
  assert.match(patch, /Filtros avançados e etapas/);
});

test('atalhos visuais reutilizam os filtros existentes sem alterar dados', () => {
  assert.match(patch, /data-factory-target-filter-v136="fila-hoje"/);
  assert.match(patch, /data-factory-target-filter-v136="em-producao"/);
  assert.match(patch, /data-factory-target-filter-v136="aguardando-revisao"/);
  assert.match(patch, /data-factory-target-filter-v136="prontos"/);
  assert.match(patch, /querySelector\(`\[data-factory-filter=/);
});

test('patch não escreve em persistência, sincronização ou estado do aplicativo', () => {
  for (const forbidden of ['localStorage', 'indexedDB', 'saveData(', 'syncFactoryUpdate(', 'state.']) {
    assert.equal(patch.includes(forbidden), false, `não deveria conter ${forbidden}`);
  }
});

test('carregador usa arquivo versionado e execução idempotente', () => {
  assert.match(loader, /__aldusFactoryExecutiveUiLoaderV136/);
  assert.match(loader, /factory-executive-ui-v136\.js\?v=20260724-fabrica-executiva-v136/);
  assert.match(patch, /__aldusFactoryExecutiveUiV136/);
});

test('arquivos da raiz e da publicação permanecem idênticos', () => {
  assert.equal(publishedPatch, patch);
  assert.equal(publishedLoader, loader);
});
