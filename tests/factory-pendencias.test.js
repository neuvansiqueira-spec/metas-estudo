const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execSync } = require('node:child_process');

const script = fs.readFileSync('script.js', 'utf8');

function bodyOf(name) {
  const start = script.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} deve existir`);
  const paren = script.indexOf(')', start);
  const brace = script.indexOf('{', paren);
  let depth = 0;
  for (let i = brace; i < script.length; i += 1) {
    if (script[i] === '{') depth += 1;
    if (script[i] === '}') depth -= 1;
    if (depth === 0) return script.slice(start, i + 1);
  }
  throw new Error(`Não foi possível extrair ${name}`);
}

test('Faça agora considera somente resumo/aula pendente, inclui atrasados, exclui futuros e remove duplicados', () => {
  const fn = bodyOf('factoryDoNowQueue');
  assert.match(fn, /date && date <= today/); // exclui assuntos futuros
  assert.match(fn, /date < today \? overdue : current/); // atrasados antes dos atuais
  assert.match(fn, /seen\.has\(entry\.item\.id\)/); // não duplica
  assert.match(fn, /!factoryResumoAulaPending\(entry\)/); // concluidos/prontos fora
  assert.match(script, /function factoryResumoAulaPending/);
  assert.match(bodyOf('factoryResumoAulaReady'), /\["Aprovado", "PDF gerado"\]/);
  assert.match(bodyOf('factoryResumoAulaReady'), /material\.factoryModuleKey === "resumoAula"/);
});

test('Inquérito Policial aprovado fica fora por regra geral, sem exceção nominal', () => {
  assert.doesNotMatch(script, /Inquérito Policial|Inquerito Policial/i);
  assert.match(bodyOf('factoryDoNowQueue'), /factoryResumoAulaPending/);
  assert.match(bodyOf('factoryResumoAulaPending'), /!factoryThemeIsCompleted\(modules\) && !factoryResumoAulaReady/);
});

test('Abrir usa fila de pendências, seleciona o item clicado no painel principal e filtros não duplicam cards', () => {
  assert.match(script, /const selectedEntry = factoryOpenDetailId \? queue\.find\(\(\{ item \}\) => item\.id === factoryOpenDetailId\)/);
  assert.match(script, /const nowEntry = selectedEntry \|\| firstResumoPendingEntry \|\| queue\[0\]/);
  assert.match(script, /factoryOpenDetailId = factoryOpenDetailId === id \? "" : id/);
  assert.match(script, /if \(factoryOpenDetailId\) factoryCurrentFilter = "faca-agora"/);
  assert.match(script, /todayPlanPanel \+ \(factoryCurrentFilter === "faca-agora"/);
  assert.match(script, /if \(factoryCurrentFilter === "fila-hoje"\) entries = todayQueue/);
});

test('status visual é calculado dos módulos normalizados e não do item.status legado', () => {
  assert.match(bodyOf('normalizeFactoryItem'), /const status = factoryOverallStatus\(modules\)/);
  assert.match(bodyOf('factoryThemeVisualLabel'), /normalizeFactoryModules\(item\.modules \|\| \{\}, item\)/);
  assert.match(bodyOf('factoryQueueItemLabel'), /factoryResumoAulaReady\(\{ \.\.\.item, modules \}\)/);
  assert.match(script, /const status = factoryOverallStatus\(modules\)/);
});

test('cópia IndexedDB preserva backup, sincronização e não remove chaves automaticamente', () => {
  assert.match(script, /function persistStateSafely\(options = \{\}\)/);
  assert.match(script, /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(state\)\)/);
  assert.match(script, /queueIndexedDBStateCopy\(\)/);
  assert.doesNotMatch(script, /indexedDB\.deleteDatabase|localStorage\.clear\(\)/);
  assert.match(script, /function makeBackupPayload\(\)/);
  assert.match(script, /function makeSyncPayload\(\)/);
});
