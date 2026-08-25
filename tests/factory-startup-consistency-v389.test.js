const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const loader = fs.readFileSync('planning-integrity-loader-v235.js', 'utf8');
const docsLoader = fs.readFileSync('docs/planning-integrity-loader-v235.js', 'utf8');

test('Fábrica protege a tela antes de liberar o bootstrap', () => {
  const eagerQueue = loader.indexOf('loadFactoryQueueIntegrity(releaseVersion);');
  const bootstrapGate = loader.indexOf('if (!bootstrapReady()) return false;');
  assert.ok(eagerQueue >= 0, 'fila da Fábrica deve ser carregada');
  assert.ok(bootstrapGate >= 0, 'gate do bootstrap deve existir');
  assert.ok(eagerQueue < bootstrapGate, 'integridade da fila deve iniciar antes do gate do bootstrap');
  assert.match(loader, /Sincronizando pendências da Fábrica com o Plano do Dia/);
  assert.match(loader, /list\.hidden = true/);
  assert.match(loader, /releaseFactoryStartupGuard/);
});

test('V394 preserva o contrato de estabilidade V387 e usa cache-bust próprio', () => {
  assert.match(loader, /STARTUP_STABILITY_VERSION = "20260824-startup-planning-stability-v387"/);
  assert.match(loader, /FACTORY_STARTUP_CONSISTENCY_VERSION = "20260825-factory-startup-consistency-v394"/);
  assert.match(loader, /stability=\$\{encodeURIComponent\(FACTORY_STARTUP_CONSISTENCY_VERSION\)\}/);
});

test('proteção da Fábrica não adiciona polling nem gravação automática', () => {
  assert.equal(loader.includes('setInterval('), false);
  assert.equal(loader.includes('saveData({ markLocalChange: true })'), false);
});

test('cópias publicadas do loader permanecem idênticas', () => {
  assert.equal(loader, docsLoader);
});
