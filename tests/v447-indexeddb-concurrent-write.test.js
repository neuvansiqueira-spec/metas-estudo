const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const WARNING = 'Falha ao atualizar a cópia IndexedDB.';
const VALIDATION = 'A validação da gravação no IndexedDB falhou.';

// Contexto mínimo: só os globais que o módulo alcança por identificador simples,
// como no bundle publicado, onde script.js não fica dentro de IIFE.
function harness({ record, valid = true, loadRejects = false } = {}) {
  const calls = { original: [], requeue: 0, diagnostics: 0 };
  const listeners = new Map();
  const status = {
    available: true, activeSource: 'IndexedDB', validation: 'válido',
    lastCopyAt: '', error: '', localStorageFull: false
  };
  const context = {
    console: { warn() {}, error() {}, info() {} },
    setTimeout,
    window: { addEventListener: (nome, fn) => listeners.set(nome, fn) },
    indexedDBStatus: status,
    indexedDBPersistBaseChecksum: 'base-anterior',
    loadStateFromIndexedDB: async () => {
      if (loadRejects) throw new Error('IndexedDB fechou');
      return record;
    },
    validateIndexedDBState: () => valid,
    queueIndexedDBStateCopy: () => { calls.requeue += 1; },
    updateStorageDiagnostics: () => { calls.diagnostics += 1; },
    recordIndexedDBWarning: function(message, error) {
      calls.original.push({ message, error: String(error?.message || error || '') });
      status.available = false;
      status.activeSource = 'localStorage fallback';
      status.validation = 'erro';
      status.error = message;
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read('indexeddb-concurrent-write-v447.js'), context);
  listeners.get('load')();
  return { context, status, calls };
}

const esperar = () => new Promise((resolve) => setImmediate(resolve));

test('V447 reconhece só a assinatura do ciclo gravar-reler-comparar', () => {
  const { context } = harness({ record: { checksum: 'x' } });
  const api = context.__ALDUS_INDEXEDDB_CONCURRENT_WRITE_V447__;
  assert.equal(api.isConcurrentWriteSignature(WARNING, new Error(VALIDATION)), true);
  assert.equal(api.isConcurrentWriteSignature(WARNING, new Error('QuotaExceededError')), false);
  assert.equal(api.isConcurrentWriteSignature('Migração inicial do IndexedDB falhou.', new Error(VALIDATION)), false);
  assert.equal(api.isConcurrentWriteSignature('', null), false);
});

test('V447 com registro válido não rebaixa a persistência e reenfileira', async () => {
  const { context, status, calls } = harness({ record: { checksum: 'da-outra-aba', savedAt: '2026-09-04T13:19:07.369Z' }, valid: true });
  context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
  await esperar();

  assert.equal(calls.original.length, 0, 'o rebaixamento original não pode acontecer');
  assert.equal(status.available, true);
  assert.equal(status.activeSource, 'IndexedDB');
  assert.equal(status.validation, 'válido');
  assert.equal(status.lastCopyAt, '2026-09-04T13:19:07.369Z');
  assert.equal(status.error, '');
  assert.equal(calls.requeue, 1, 'a gravação precisa ser tentada de novo');
});

test('V447 preserva a mensagem do localStorage cheio ao restaurar o status', async () => {
  const { context, status } = harness({ record: { checksum: 'a' }, valid: true });
  status.localStorageFull = true;
  context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
  await esperar();
  assert.match(status.error, /cópia localStorage indisponível por falta de espaço/,
    'apagar este aviso esconderia que o espelho continua sem caber');
});

test('V447 não mexe na base de comparação, para a mesclagem acontecer', async () => {
  // Apontar a base para o registro da outra aba faria a próxima gravação
  // considerar-se em dia e sobrescrever o trabalho dela sem mesclar.
  const { context } = harness({ record: { checksum: 'da-outra-aba' }, valid: true });
  context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
  await esperar();
  assert.equal(context.indexedDBPersistBaseChecksum, 'base-anterior');
});

test('V447 rebaixa quando o registro relido é inválido — falha de verdade', async () => {
  const { context, status, calls } = harness({ record: { checksum: 'x' }, valid: false });
  context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
  await esperar();
  assert.equal(calls.original.length, 1, 'registro corrompido mantém o comportamento antigo');
  assert.equal(status.available, false);
  assert.equal(calls.requeue, 0);
});

test('V447 rebaixa quando nem sequer consegue reler', async () => {
  const { context, calls, status } = harness({ loadRejects: true });
  context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
  await esperar();
  assert.equal(calls.original.length, 1);
  assert.equal(status.available, false);
});

test('V447 deixa passar qualquer outro aviso do IndexedDB, intacto', async () => {
  const { context, calls, status } = harness({ record: { checksum: 'x' } });
  context.recordIndexedDBWarning('Migração inicial do IndexedDB falhou.', new Error('outro motivo'));
  await esperar();
  assert.equal(calls.original.length, 1);
  assert.equal(calls.original[0].message, 'Migração inicial do IndexedDB falhou.');
  assert.equal(status.available, false, 'avisos legítimos continuam rebaixando');
});

test('V447 para de reenfileirar após recuperações seguidas, sem rebaixar', async () => {
  const { context, calls, status } = harness({ record: { checksum: 'x' }, valid: true });
  const limite = context.__ALDUS_INDEXEDDB_CONCURRENT_WRITE_V447__.maxConsecutiveRequeues;
  for (let i = 0; i < limite + 3; i += 1) {
    context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
    await esperar();
  }
  assert.equal(calls.requeue, limite, 'duas abas em revezamento não podem reenfileirar sem fim');
  assert.equal(status.available, true, 'mesmo desistindo de reenfileirar, não rebaixa');
  assert.equal(calls.original.length, 0);
});

test('V447 zera a contagem quando volta a acontecer um aviso comum', async () => {
  const { context, calls } = harness({ record: { checksum: 'x' }, valid: true });
  const limite = context.__ALDUS_INDEXEDDB_CONCURRENT_WRITE_V447__.maxConsecutiveRequeues;
  for (let i = 0; i < limite; i += 1) {
    context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
    await esperar();
  }
  context.recordIndexedDBWarning('outro aviso', new Error('x'));
  context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
  await esperar();
  assert.equal(calls.requeue, limite + 1, 'a série recomeça depois de um evento diferente');
});

test('V447 não instala duas vezes', () => {
  const { context } = harness({ record: { checksum: 'x' } });
  const primeira = context.recordIndexedDBWarning;
  context.__ALDUS_INDEXEDDB_CONCURRENT_WRITE_V447__.install();
  assert.equal(context.recordIndexedDBWarning, primeira);
});

test('V447 não grava estado, não faz polling e não observa o DOM', () => {
  const source = read('indexeddb-concurrent-write-v447.js');
  const codigo = source.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(codigo, /saveData|localStorage\.setItem|MutationObserver|setInterval/);
  assert.doesNotMatch(codigo, /indexedDBPersistBaseChecksum\s*=/,
    'reapontar a base descartaria as alterações da outra aba');
});

test('V447 mantém paridade raiz/docs e é publicado com cache-bust nas duas camadas', () => {
  assert.equal(read('indexeddb-concurrent-write-v447.js'), read('docs/indexeddb-concurrent-write-v447.js'));
  const loader = read('performance-emergency-v350.js');
  assert.match(loader, /indexeddb-concurrent-write-v447\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.equal(loader, read('docs/performance-emergency-v350.js'));
  const outer = read('security-observability-v318.js');
  assert.match(outer, /performance-emergency-v350\.js\?v=20260904-indexeddb-concurrent-write-v447/);
  assert.equal(outer, read('docs/security-observability-v318.js'));
});
