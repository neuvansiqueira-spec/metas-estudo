const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const MODULE = 'daily-plan-more-options-v643.js';

test('V643 é segura sem DOM e não instala duas vezes', () => {
  const ctx = vm.createContext({});
  vm.runInContext(read(MODULE), ctx);
  const api = ctx.__ALDUS_DAILY_PLAN_MORE_OPTIONS_V643__;
  assert.equal(api.install(), false);
  assert.equal(api.apply(), false);
  vm.runInContext(read(MODULE), ctx);
  assert.equal(ctx.__ALDUS_DAILY_PLAN_MORE_OPTIONS_V643__, api);
});

test('V643 só compõe a tela: não grava dados nem recria os formulários', () => {
  const source = read(MODULE);
  assert.doesNotMatch(source, /saveData|localStorage|indexedDB|state\.dailyGoals|innerHTML\s*=/);
  // Os dois formulários originais são movidos (IDs e listeners do app preservados), não clonados.
  assert.match(source, /byId\("chooseSubjectForDayForm"\)/);
  assert.match(source, /byId\("goalForm"\)/);
  assert.doesNotMatch(source, /cloneNode/);
  // As duas funções continuam acessíveis, cada uma na sua aba.
  assert.match(source, /Encaixar no dia/);
  assert.match(source, /Com detalhes/);
});

test('V643 é carregada pela cadeia ativa e publicada igual na raiz e em docs', () => {
  const loader = read('security-observability-v318.js');
  assert.ok(loader.includes(`${MODULE}?v=20260928-mais-opcoes-do-dia-v643`));
  assert.match(loader, /\n  installDailyPlanMoreOptionsV643\(\);/);
  for (const file of [MODULE, 'security-observability-v318.js', 'script.js']) assert.equal(read(file), read('docs/' + file), file);
});

test('V643 ordena alfabeticamente os assuntos da disciplina no formulário "Com detalhes"', () => {
  const source = read('script.js');
  const start = source.indexOf('function compareSyllabusItemsAlphabeticallyV643');
  assert.ok(start > 0);
  const end = source.indexOf('\n}', start) + 2;
  const ctx = vm.createContext({});
  vm.runInContext(source.slice(start, end), ctx);
  const items = [
    { id: '1', subject: 'Lei de Migração' },
    { id: '2', subject: 'Lei Antiterrorismo' },
    { id: '3', subject: 'ação penal', subtopic: 'b' },
    { id: '4', subject: 'Ação penal', subtopic: 'a' },
    { id: '5', subject: 'Lei 10' },
    { id: '6', subject: 'Lei 9' }
  ];
  const sorted = [...items].sort(ctx.compareSyllabusItemsAlphabeticallyV643).map(item => item.id);
  assert.deepEqual(sorted, ['4', '3', '6', '5', '2', '1']);
  assert.match(source, /optionsForItems\(elements\.goalSyllabusItem, discipline, current, \{ alphabetical: true \}\)/);
  assert.match(source, /if \(options\.alphabetical\) items\.sort\(compareSyllabusItemsAlphabeticallyV643\)/);
  // A lista "meta que sairá" também segue disciplina e assunto em ordem alfabética.
  assert.match(source, /\[\.\.\.capacity\.replacementGoals\]\.sort\(/);
});
