const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function harness() {
  const context = { console: { warn() {}, error() {}, info() {} }, setTimeout, clearTimeout };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read('daily-goal-lock-v644.js'), context);
  return { context, api: context.__ALDUS_GOAL_LOCK_V644__ };
}
const goal = (id, date, extra = {}) => ({ id, date, data: date, subject: `Assunto ${id}`, discipline: 'D', ...extra });
const copy = (value) => JSON.parse(JSON.stringify(value));

test('V644 desfaz meta incluída sem ação dele', () => {
  const { api } = harness();
  const gravado = { dailyGoals: [goal('a', '2026-09-28')] };
  const dados = copy(gravado);
  dados.dailyGoals.push(goal('auto', '2026-09-28', { origin: 'planejamento' }));
  const desfeitas = api.verificar(dados, gravado);
  assert.equal(desfeitas.length, 1);
  assert.deepEqual(Array.from(dados.dailyGoals, (g) => g.id), ['a']);
});

test('V644 devolve meta excluída sem ação dele', () => {
  const { api } = harness();
  const gravado = { dailyGoals: [goal('a', '2026-09-28'), goal('b', '2026-09-29')] };
  const dados = { dailyGoals: [copy(gravado.dailyGoals[0])] };
  api.verificar(dados, gravado);
  assert.deepEqual(Array.from(dados.dailyGoals, (g) => g.id).sort(), ['a', 'b']);
});

test('V644 volta a data de meta movida sem ação dele e não mexe em outros campos', () => {
  const { api } = harness();
  const gravado = { dailyGoals: [goal('p', '2026-09-25', { actualMinutes: 0 })] };
  const dados = copy(gravado);
  dados.dailyGoals[0].date = '2026-09-28';
  dados.dailyGoals[0].data = '2026-09-28';
  dados.dailyGoals[0].actualMinutes = 30;
  api.verificar(dados, gravado);
  assert.equal(dados.dailyGoals[0].date, '2026-09-25');
  assert.equal(dados.dailyGoals[0].data, '2026-09-25');
  assert.equal(dados.dailyGoals[0].actualMinutes, 30, 'tempo e status não são da trava');
});

test('V644 aceita o que foi feito por ação dele (carimbo) e registra exclusão autorizada', () => {
  const gravado = { dailyGoals: [goal('a', '2026-09-28'), goal('b', '2026-09-28')] };
  // Via API do agente, com o estado real:
  const estado = copy(gravado);
  const ctx = harness();
  ctx.context.state = estado;
  ctx.api.autorizar('incluir e excluir', () => {
    estado.dailyGoals.push(goal('nova', '2026-09-30'));
    estado.dailyGoals = estado.dailyGoals.filter((g) => g.id !== 'b');
  });
  const dados = copy(estado);
  const desfeitas = ctx.api.verificar(dados, gravado, estado);
  assert.equal(desfeitas.length, 0);
  assert.deepEqual(dados.dailyGoals.map((g) => g.id).sort(), ['a', 'nova']);
  assert.ok(dados.goalLockV644Removals.b, 'a exclusão autorizada fica registrada e viaja para as outras abas');
  assert.match(dados.dailyGoals.find((g) => g.id === 'nova').goalLockV644.by, /^agente:/);
});

test('V644 não aceita carimbo de outra data (mudança automática depois da ação dele)', () => {
  const { api } = harness();
  const gravado = { dailyGoals: [goal('a', '2026-09-28', { goalLockV644: { sig: '2026-09-28|0', at: 'x', by: 'usuario' } })] };
  const dados = copy(gravado);
  dados.dailyGoals[0].date = '2026-10-01';
  dados.dailyGoals[0].data = '2026-10-01';
  assert.equal(api.verificar(dados, gravado).length, 1);
  assert.equal(dados.dailyGoals[0].date, '2026-09-28');
});

test('V644 trata retirar do plano como exclusão', () => {
  const { api } = harness();
  const gravado = { dailyGoals: [goal('a', '2026-09-28')] };
  const dados = copy(gravado);
  dados.dailyGoals[0].removedFromDailyPlanV641 = true;
  assert.equal(api.verificar(dados, gravado).length, 1);
  assert.equal(dados.dailyGoals[0].removedFromDailyPlanV641, undefined);
});

test('V644 é carregada pela cadeia ativa e publicada igual na raiz e em docs', () => {
  const loader = read('security-observability-v318.js');
  assert.ok(loader.includes('daily-goal-lock-v644.js?v=20260928-trava-das-metas-v644'));
  assert.match(loader, /\n  installDailyGoalLockV644\(\);/);
  for (const file of ['daily-goal-lock-v644.js', 'security-observability-v318.js']) assert.equal(read(file), read('docs/' + file), file);
});

test('V644 não trata o estado vazio da abertura como exclusão de todas as metas', () => {
  const { api } = harness();
  const gravado = { dailyGoals: [goal('a', '2026-09-28'), goal('b', '2026-09-29')] };
  const dados = { dailyGoals: [] };
  assert.equal(api.verificar(dados, gravado).length, 0);
  assert.equal(dados.dailyGoals.length, 0, 'não injeta metas num estado que ainda vai ser carregado');
});
