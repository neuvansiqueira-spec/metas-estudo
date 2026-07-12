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
  assert.match(script, /elements\.factoryList\.innerHTML = factoryCurrentFilter === "faca-agora" \? nowPanel \+ queuePanel : listPanel/);
  assert.match(script, /if \(factoryCurrentFilter === "fila-hoje"\) entries = todayQueue/);
});

test('status visual é calculado dos módulos normalizados e não do item.status legado', () => {
  assert.match(bodyOf('normalizeFactoryItem'), /const status = factoryOverallStatus\(modules\)/);
  assert.match(bodyOf('factoryThemeVisualLabel'), /normalizeFactoryModules\(item\.modules \|\| \{\}, item\)/);
  assert.match(bodyOf('factoryQueueItemLabel'), /factoryResumoAulaReady\(\{ \.\.\.item, modules \}\)/);
  assert.match(script, /const status = factoryOverallStatus\(modules\)/);
});

test('armazenamento, backup e sincronização não foram alterados nesta mudança', { skip: !fs.existsSync('.git') }, () => {
  const diff = execSync('git diff --unified=0 -- script.js docs/script.js', { encoding: 'utf8' });
  assert.doesNotMatch(diff, /function (saveData|loadData|autoSyncAfterSave|syncWithGoogleDrive|saveBackup|restoreBackup|exportBackup|importBackup)\b/);
  assert.doesNotMatch(diff, /localStorage\.(clear|removeItem)\(/);
  assert.doesNotMatch(diff, /factoryAgenda\s*=\s*\[\]|factoryItems\s*=\s*\[\]|materials\s*=\s*\[\]|dailyGoals\s*=\s*\[\]/);
});
