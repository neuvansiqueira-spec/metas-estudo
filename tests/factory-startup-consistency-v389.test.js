const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const loader = fs.readFileSync('planning-integrity-loader-v235.js', 'utf8');
const docsLoader = fs.readFileSync('docs/planning-integrity-loader-v235.js', 'utf8');
const worker = fs.readFileSync('service-worker-v378.js', 'utf8');
const docsWorker = fs.readFileSync('docs/service-worker-v378.js', 'utf8');

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

test('worker V378 busca runtimes críticos na rede antes do cache', () => {
  assert.match(worker, /planning-integrity-loader-v235\.js/);
  assert.match(worker, /factory-queue-integrity-v236\.js/);
  assert.match(worker, /timer-runtime-v316\.js/);
  assert.match(worker, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(worker, /caches\.match\(request, \{ ignoreSearch: true \}\)/);
  assert.match(worker, /event\.stopImmediatePropagation\(\)/);
  assert.match(worker, /importScripts\(`service-worker\.js\?hotfix=/);
});

test('cópias publicadas permanecem idênticas', () => {
  assert.equal(loader, docsLoader);
  assert.equal(worker, docsWorker);
});
