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
  const timers = [];
  const clock = { now: 1000 };
  const context = {
    console: { warn() {}, error() {}, info() {} },
    Date: Object.assign(Object.create(Date), { now: () => clock.now }),
    Math: Object.assign(Object.create(Math), { random: () => 0.5 }),
    // Guarda em vez de agendar: o teste decide quando o tempo passa.
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
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
  const correrTimers = () => { timers.splice(0).forEach((t) => t.fn()); };
  return { context, status, calls, timers, clock, correrTimers };
}

const esperar = () => new Promise((resolve) => setImmediate(resolve));

test('V447 reconhece só a assinatura do ciclo gravar-reler-comparar', () => {
  const { context, clock, correrTimers } = harness({ record: { checksum: 'x' } });
  const api = context.__ALDUS_INDEXEDDB_CONCURRENT_WRITE_V447__;
  assert.equal(api.isConcurrentWriteSignature(WARNING, new Error(VALIDATION)), true);
  assert.equal(api.isConcurrentWriteSignature(WARNING, new Error('QuotaExceededError')), false);
  assert.equal(api.isConcurrentWriteSignature('Migração inicial do IndexedDB falhou.', new Error(VALIDATION)), false);
  assert.equal(api.isConcurrentWriteSignature('', null), false);
});

test('V447 com registro válido não rebaixa a persistência e reenfileira', async () => {
  const { context, status, calls, clock, correrTimers } = harness({ record: { checksum: 'da-outra-aba', savedAt: '2026-09-04T13:19:07.369Z' }, valid: true });
  context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
  await esperar();

  assert.equal(calls.original.length, 0, 'o rebaixamento original não pode acontecer');
  assert.equal(status.available, true);
  assert.equal(status.activeSource, 'IndexedDB');
  assert.equal(status.validation, 'válido');
  assert.equal(status.lastCopyAt, '2026-09-04T13:19:07.369Z');
  assert.equal(status.error, '');
  assert.equal(calls.requeue, 0, 'a nova tentativa é adiada, não imediata');
  correrTimers();
  assert.equal(calls.requeue, 1, 'a gravação precisa ser tentada de novo');
});

test('V447 preserva a mensagem do localStorage cheio ao restaurar o status', async () => {
  const { context, status, clock, correrTimers } = harness({ record: { checksum: 'a' }, valid: true });
  status.localStorageFull = true;
  context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
  await esperar();
  assert.match(status.error, /cópia localStorage indisponível por falta de espaço/,
    'apagar este aviso esconderia que o espelho continua sem caber');
});

test('V447 não mexe na base de comparação, para a mesclagem acontecer', async () => {
  // Apontar a base para o registro da outra aba faria a próxima gravação
  // considerar-se em dia e sobrescrever o trabalho dela sem mesclar.
  const { context, clock, correrTimers } = harness({ record: { checksum: 'da-outra-aba' }, valid: true });
  context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
  await esperar();
  assert.equal(context.indexedDBPersistBaseChecksum, 'base-anterior');
});

test('V447 rebaixa quando o registro relido é inválido — falha de verdade', async () => {
  const { context, status, calls, clock, correrTimers } = harness({ record: { checksum: 'x' }, valid: false });
  context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
  await esperar();
  assert.equal(calls.original.length, 1, 'registro corrompido mantém o comportamento antigo');
  assert.equal(status.available, false);
  assert.equal(calls.requeue, 0);
});

test('V447 rebaixa quando nem sequer consegue reler', async () => {
  const { context, calls, status, clock, correrTimers } = harness({ loadRejects: true });
  context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
  await esperar();
  assert.equal(calls.original.length, 1);
  assert.equal(status.available, false);
});

test('V447 deixa passar qualquer outro aviso do IndexedDB, intacto', async () => {
  const { context, calls, status, clock, correrTimers } = harness({ record: { checksum: 'x' } });
  context.recordIndexedDBWarning('Migração inicial do IndexedDB falhou.', new Error('outro motivo'));
  await esperar();
  assert.equal(calls.original.length, 1);
  assert.equal(calls.original[0].message, 'Migração inicial do IndexedDB falhou.');
  assert.equal(status.available, false, 'avisos legítimos continuam rebaixando');
});

test('V447 aguenta duas abas o dia inteiro: a rajada reinicia após uma pausa', async () => {
  // O usuário mantém uma aba no cronômetro e outra na Fábrica. Uma sessão longa
  // não pode esgotar a proteção só porque acumulou colisões ao longo das horas.
  const { context, status, calls, clock, correrTimers } = harness({ record: { checksum: 'x' }, valid: true });
  const api = context.__ALDUS_INDEXEDDB_CONCURRENT_WRITE_V447__;

  for (let volta = 0; volta < 4; volta += 1) {
    for (let i = 0; i < api.requeueBurstLimit; i += 1) {
      context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
      await esperar();
      correrTimers();
    }
    clock.now += api.burstResetMs + 1; // pausa sem colisão
  }

  assert.equal(calls.requeue, api.requeueBurstLimit * 4,
    'cada rajada depois da pausa precisa voltar a reenfileirar');
  assert.equal(status.available, true);
  assert.equal(calls.original.length, 0, 'em nenhum momento a persistência foi rebaixada');
});

test('V447 para de insistir dentro da rajada, sem rebaixar', async () => {
  // Se a mesclagem não convergir, insistir sem fim só queima gravação de 12 MB.
  const { context, status, calls, correrTimers, clock } = harness({ record: { checksum: 'x' }, valid: true });
  const limite = context.__ALDUS_INDEXEDDB_CONCURRENT_WRITE_V447__.requeueBurstLimit;
  for (let i = 0; i < limite + 5; i += 1) {
    context.recordIndexedDBWarning(WARNING, new Error(VALIDATION));
    await esperar();
    correrTimers();
  }
  assert.equal(calls.requeue, limite, 'a rajada tem teto');
  assert.equal(status.available, true, 'mas desistir da rajada nunca rebaixa a persistência');
  assert.equal(calls.original.length, 0);
});

test('V447 espera mais a cada tentativa, e sorteia para desencontrar as abas', () => {
  const { context, clock, correrTimers } = harness({ record: { checksum: 'x' } });
  const api = context.__ALDUS_INDEXEDDB_CONCURRENT_WRITE_V447__;

  // Sem sorteio as duas abas colidem de novo no mesmo instante, em compasso.
  assert.notEqual(api.backoffDelay(3, () => 0), api.backoffDelay(3, () => 0.999),
    'o intervalo precisa variar entre as abas');

  const minimos = [1, 2, 3, 4].map((n) => api.backoffDelay(n, () => 0));
  for (let i = 1; i < minimos.length; i += 1) {
    assert.ok(minimos[i] > minimos[i - 1], `a espera mínima precisa crescer (${minimos})`);
  }
  assert.ok(api.backoffDelay(50, () => 1) <= api.backoffMaxMs,
    'e precisa ter teto, senão a gravação fica adiada por minutos');
});

test('V447 não instala duas vezes', () => {
  const { context, clock, correrTimers } = harness({ record: { checksum: 'x' } });
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
  // A camada externa é compartilhada e sua query muda a cada publicação:
  // conferir o formato, não a versão, senão todo PR seguinte quebra este teste.
  assert.match(outer, /performance-emergency-v350\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.equal(outer, read('docs/security-observability-v318.js'));
});
