const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const api = require(path.join(root, 'delta-full-plan-v448.js'));

function estado() {
  return { dailyGoals: [], syllabusItems: [], migrations: {} };
}

test('V448 cadastra as 42 aulas que restam do Delta FULL', () => {
  const state = estado();
  const r = api.apply(state);
  assert.equal(r.created, 42, 'o curso tem 47 aulas únicas e a Semana 01 já foi feita');
  assert.equal(state.dailyGoals.length, 42);
  assert.equal(state.syllabusItems.length, 42, 'cada meta precisa do seu item, como as 501 existentes');
});

test('V448 não repete uma aula que já existe como meta', () => {
  const state = estado();
  const primeira = api.schedule[0];
  state.dailyGoals.push({ id: 'ja-existe', discipline: 'DEDICAÇÃO DELTA', subject: api.subjectFor(primeira) });
  const r = api.apply(state);
  assert.equal(r.created, 41);
  assert.equal(r.skipped, 1);
});

test('V448 roda uma vez só', () => {
  const state = estado();
  api.apply(state);
  const segunda = api.apply(state);
  assert.equal(segunda.repeated, true);
  assert.equal(segunda.changed, false);
  assert.equal(state.dailyGoals.length, 42, 'a segunda passada não pode duplicar nada');
});

test('V448 não toca em nenhum registro que já existia', () => {
  const state = estado();
  const antiga = { id: 'antiga', date: '2026-09-05', discipline: 'DIREITO PENAL', subject: 'X', status: 'Pendente' };
  const item = { id: 'item-antigo', discipline: 'DIREITO PENAL', subject: 'X' };
  state.dailyGoals.push(antiga);
  state.syllabusItems.push(item);
  const copiaGoal = JSON.stringify(antiga);
  const copiaItem = JSON.stringify(item);
  api.apply(state);
  assert.equal(JSON.stringify(state.dailyGoals[0]), copiaGoal);
  assert.equal(JSON.stringify(state.syllabusItems[0]), copiaItem);
});

test('V448 cria metas que a reconstrução do Planejamento não apaga', () => {
  // isProtectedDailyGoal (script.js) devolve true por origem manual, por
  // userEdited ou por ter history. As três precisam estar presentes: se uma
  // delas mudar de critério no futuro, as outras duas ainda seguram.
  const state = estado();
  api.apply(state);
  for (const goal of state.dailyGoals) {
    const manual = !['edital verticalizado', 'planejamento', 'plano do dia']
      .includes(String(goal.origin || goal.origem || 'manual').toLowerCase());
    assert.equal(manual, true, 'origem precisa ficar fora da lista de origens automáticas');
    assert.equal(goal.userEdited, true);
    assert.ok(Array.isArray(goal.history) && goal.history.length > 0);
  }
});

test('V448 abre por Atos Administrativos, o maior cluster de erro dele', () => {
  // 12 dos 28 erros em Administrativo. Na ordem do curso, isso é Semana 05 —
  // chegaria daqui a quatro semanas.
  const [primeira, segunda] = api.schedule;
  assert.match(primeira.t, /Atos Administrativos/);
  assert.equal(primeira.s, 5, 'a aula está na Semana 05, e vem primeiro assim mesmo');
  assert.match(segunda.t, /Poderes da Administração/);
});

test('V448 sobe os crimes contra pessoa e patrimônio por insegurança declarada', () => {
  // Não aparecem no caderno de erros — ele nunca foi testado neles. Entraram
  // no bloco 1 porque ele disse que não lembra as qualificadoras.
  const alvo = api.schedule.filter((a) => /Contra a Pessoa|contra o Patrimônio/i.test(a.t));
  assert.equal(alvo.length, 2);
  for (const aula of alvo) {
    assert.equal(aula.b, 1, 'insegurança declarada vale tanto quanto erro medido');
    assert.ok(aula.o <= 4, `deveria abrir a fila, veio em ${aula.o}`);
  }
});

test('V448 deixa Penal, Processual Penal e LPE para o bloco 2', () => {
  // 33h já investidas somadas: menor retorno marginal antes da prova.
  const consolidacao = api.schedule.filter((a) =>
    ['Direito Processual Penal', 'Legislação Penal Especial'].includes(a.disc));
  for (const aula of consolidacao) assert.equal(aula.b, 2);
});

test('V448 respeita 2 aulas por dia, o ritmo de 2h que ele escolheu', () => {
  const porDia = new Map();
  for (const aula of api.schedule) porDia.set(aula.d, (porDia.get(aula.d) || 0) + 1);
  for (const [dia, n] of porDia) assert.ok(n <= 2, `${dia} ficou com ${n} aulas`);
  assert.equal(api.plannedMinutes * 2, 120, 'duas aulas de 60min fecham as 2h');
});

test('V448 termina com folga antes da prova de 11/10', () => {
  const ultima = api.schedule[api.schedule.length - 1].d;
  assert.ok(ultima < '2026-10-11', 'o curso precisa acabar antes da prova');
  const bloco1 = api.schedule.filter((a) => a.b === 1);
  assert.ok(bloco1[bloco1.length - 1].d <= '2026-09-17',
    'o bloco 1 é o que rende ponto: precisa fechar cedo');
});

test('V448 desfaz tudo pelos ids, sem levar junto o que veio depois', () => {
  const state = estado();
  api.apply(state);
  const depois = { id: 'criada-depois', discipline: 'DEDICAÇÃO DELTA', subject: 'algo meu' };
  state.dailyGoals.push(depois);
  const r = api.undo(state);
  assert.equal(r.removedGoals, 42);
  assert.equal(r.removedItems, 42);
  assert.deepEqual(state.dailyGoals, [depois], 'só sobra o que o usuário criou por conta');
  assert.equal(state.migrations.deltaFullPlanV448, undefined);
});

test('V448 não desfaz o que nunca aplicou', () => {
  assert.equal(api.undo(estado()).blocked, true);
});

test('V448 não faz nada sem estado ou sem as coleções', () => {
  assert.equal(api.apply(null).blocked, true);
  assert.equal(api.apply({}).reason, 'collections-unavailable');
});

test('V448 guarda no marcador o suficiente para auditar e reverter', () => {
  const state = estado();
  const { report } = api.apply(state);
  assert.equal(report.goalIds.length, 42);
  assert.equal(report.syllabusIds.length, 42);
  assert.equal(report.bloco1 + report.bloco2, 42);
  assert.equal(new Set(report.goalIds).size, 42, 'ids repetidos quebrariam o undo');
});

test('V448 alcança o estado declarado como const no escopo global', () => {
  const listeners = new Map();
  const context = vm.createContext({
    console: { info() {}, warn() {} },
    window: { addEventListener: (nome, fn) => listeners.set(nome, fn) }
  });
  context.globalThis = context;
  vm.runInContext(`const state = { dailyGoals: [], syllabusItems: [], migrations: {} };
    globalThis.__leituraDoGlobal = typeof globalThis.state;`, context);
  assert.equal(context.__leituraDoGlobal, 'undefined');
  vm.runInContext(read('delta-full-plan-v448.js'), context);
  listeners.get('load')();
  vm.runInContext('globalThis.__total = state.dailyGoals.length;', context);
  assert.equal(context.__total, 42, 'ler apenas globalThis.state não criaria nada');
});

test('V448 mantém paridade raiz/docs e é publicado com cache-bust nas duas camadas', () => {
  assert.equal(read('delta-full-plan-v448.js'), read('docs/delta-full-plan-v448.js'));
  const loader = read('performance-emergency-v350.js');
  assert.match(loader, /delta-full-plan-v448\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.equal(loader, read('docs/performance-emergency-v350.js'));
  const outer = read('security-observability-v318.js');
  // A camada externa é compartilhada e sua query muda a cada publicação:
  // conferir o formato, não a versão, senão todo PR seguinte quebra este teste.
  assert.match(outer, /performance-emergency-v350\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.equal(outer, read('docs/security-observability-v318.js'));
});
