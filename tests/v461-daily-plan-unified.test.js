const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const version = '20260906-plano-dia-painel-unico-v461';
const meta = (id, extra = {}) => ({ id, date: '2026-09-05', discipline: 'Direito Penal', subject: id, status: 'Pendente', actualMinutes: 0, ...extra });

function harness(goals = [], helpers = {}) {
  const nodes = new Map();
  class Element {
    constructor() { this.style = {}; this.listeners = {}; this.parts = {}; this.open = false; this.innerHTML = ''; }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    querySelector(selector) { return this.parts[selector] ||= { value: '', checked: false, innerHTML: '', textContent: '' }; }
    querySelectorAll() { return this.groups || []; }
    closest() { return this; }
    getAttribute(name) { return this[name]; }
  }
  const host = { parentElement: { insertBefore(panel) { nodes.set(panel.id, panel); } } };
  nodes.set('dailyGoalsList', { closest: () => host });
  const calls = { save: 0, render: 0, reconcile: 0, history: [] };
  const context = vm.createContext({
    console, Element, state: { dailyGoals: goals }, todayISO: () => '2026-09-06',
    document: { getElementById: id => nodes.get(id), createElement: () => new Element() },
    window: { addEventListener() {} },
    goalTotalActualMinutes: g => g.studyActualMinutes !== undefined ? g.studyActualMinutes + (g.questionActualMinutes || 0) : g.actualMinutes,
    saveData: () => calls.save++, render: () => calls.render++,
    appendGoalHistory: (g, message) => calls.history.push(message),
    reconcileDailyGoalsWithPlanning: () => calls.reconcile++,
    reconcilePlanningDates: () => calls.reconcile++, ...helpers
  });
  vm.runInContext(read('daily-plan-pending-panel-v429.js'), context);
  const api = context.__ALDUS_DAILY_PLAN_PENDING_PANEL_V429__;
  api.installRenderHook();
  api.renderPanel();
  const panel = nodes.get(api.panelId);
  const part = name => panel.querySelector(`[data-v429="${name}"]`);
  return { api, context, panel, part, calls, Element };
}
const ids = goals => Array.from(goals, g => g.id);

test('V461 prioriza metas começadas dentro das disciplinas e mantém desempate por data', () => {
  const goals = [meta('recente'), meta('antiga', {date:'2026-09-01'}), meta('pouco', {actualMinutes:20}), meta('muito', {date:'2026-08-20',actualMinutes:95}), meta('outra', {discipline:'Civil'})];
  const {api} = harness(goals);
  const groups = api.groupByDiscipline(api.overdueGoals());
  assert.deepEqual(ids(groups[0][1]), ['muito','pouco','recente','antiga']);
  assert.deepEqual(ids(goals), ['recente','antiga','pouco','muito','outra'], 'ordenar não muda a coleção original');
});

test('V461 grupos com metas começadas precedem disciplinas maiores ainda intocadas', () => {
  const {api} = harness([meta('a'),meta('b'),meta('c',{discipline:'Civil',actualMinutes:1})]);
  assert.equal(api.groupByDiscipline(api.overdueGoals())[0][0], 'Civil');
});

test('V461 mostra o tempo total de estudo e questões calculado pelo app', () => {
  const {api,part} = harness([meta('a',{actualMinutes:7,studyActualMinutes:65,questionActualMinutes:30}),meta('b',{actualMinutes:20}),meta('c')]);
  assert.equal(api.actualMinutesOf(meta('a',{studyActualMinutes:65,questionActualMinutes:30})),95);
  assert.match(part('list').innerHTML,/1h35 já estudados/);
  assert.match(part('list').innerHTML,/20 min já estudados/);
  assert.match(part('list').innerHTML,/sem tempo lançado/);
});

test('V461 filtra disciplina, assunto e data brasileira, combinados com tempo lançado', () => {
  const {api} = harness([meta('a',{subject:'Intervenção federal',discipline:'Constitucional',actualMinutes:45}),meta('b',{subject:'Homicídio',date:'2026-09-04'}),meta('c',{subject:'Homicídio',actualMinutes:15})]);
  const goals = api.overdueGoals();
  assert.deepEqual(ids(api.filterGoals(goals,' PENAL ',false)),['b','c']);
  assert.deepEqual(ids(api.filterGoals(goals,'INTERVENÇÃO',false)),['a']);
  assert.deepEqual(ids(api.filterGoals(goals,'04/09/2026',false)),['b']);
  assert.deepEqual(ids(api.filterGoals(goals,'Homicídio',true)),['c']);
  assert.deepEqual(ids(api.filterGoals(goals,'',true)),['a','c']);
  assert.equal(api.filterGoals(goals,'',false).length,3);
});

test('V461 eventos atualizam resultados sem substituir controles nem fechar painel e grupos', () => {
  const {context,panel,part} = harness([meta('a',{actualMinutes:20}),meta('b',{discipline:'Civil'})]);
  const field = part('filter');
  const check = part('only-started');
  const shell = panel.innerHTML;
  panel.open = true;
  panel.groups = [{getAttribute:()=> 'Direito Penal'}];
  field.value = 'penal';
  panel.listeners.input({target:{dataset:{v429:'filter'}}});
  check.checked = true;
  panel.listeners.change({target:{dataset:{v429:'only-started'}}});
  context.render();
  assert.equal(part('filter'),field);
  assert.equal(part('only-started'),check);
  assert.equal(field.value,'penal');
  assert.equal(check.checked,true);
  assert.equal(panel.innerHTML,shell);
  assert.equal(panel.open,true);
  assert.match(part('list').innerHTML,/data-v429-discipline="Direito Penal" open/);
  assert.doesNotMatch(part('list').innerHTML,/Civil/);
  assert.match(part('count').textContent,/1 na lista/);
});

test('V461 trazer pelo botão preserva tempo, identidade e metas de hoje sem reconciliação', () => {
  const old = meta('a',{actualMinutes:95,studyActualMinutes:65,questionActualMinutes:30});
  const today = meta('hoje',{date:'2026-09-06'});
  const {context,panel,part,calls,Element} = harness([old,today]);
  part('filter').value = 'a';
  const target = new Element(); target['data-v429-bring'] = 'a';
  panel.listeners.click({target,preventDefault(){}});
  assert.equal(context.state.dailyGoals.length,2);
  assert.equal(context.state.dailyGoals[0],old);
  assert.equal(context.state.dailyGoals[1],today);
  assert.equal(old.date,'2026-09-06');
  assert.equal(old.data,'2026-09-06');
  assert.equal(old.userEdited,true);
  assert.equal(old.status,'Reagendada');
  assert.equal(old.actualMinutes,95);
  assert.equal(old.studyActualMinutes,65);
  assert.equal(old.questionActualMinutes,30);
  assert.equal(calls.save,1);
  assert.equal(calls.reconcile,0);
  assert.equal(calls.history.length,1);
  assert.equal(part('filter').value,'a');
  assert.match(part('list').innerHTML,/Nada ficou para trás/);
});

test('V461 diferencia ausência de pendências de filtro sem resultado e filtra antes do limite', () => {
  assert.match(harness().part('list').innerHTML,/Nada ficou para trás/);
  const {panel,part} = harness(Array.from({length:30},(_,i)=>meta(String(i),{subject:i===29?'Alvo único':'Outro'})));
  part('filter').value = 'alvo';
  panel.listeners.input({target:{dataset:{v429:'filter'}}});
  assert.match(part('list').innerHTML,/Alvo único/);
  part('filter').value = 'inexistente';
  panel.listeners.input({target:{dataset:{v429:'filter'}}});
  assert.match(part('list').innerHTML,/Nenhuma meta corresponde aos filtros/);
});

test('V461 escapa disciplina, assunto e identificador no HTML', () => {
  const {part} = harness([meta('" onclick="alert(1)',{discipline:'<img src=x>',subject:'<script>alert(1)</script>'})]);
  assert.doesNotMatch(part('list').innerHTML,/<script>|<img|data-v429-bring="" onclick/);
  assert.match(part('list').innerHTML,/&lt;script&gt;/);
  assert.match(part('list').innerHTML,/&lt;img/);
});

test('V461 fallback de tempo aceita legado e neutraliza valores inválidos', () => {
  const {api} = harness([],{goalTotalActualMinutes:undefined});
  assert.equal(api.actualMinutesOf({minutosRealizados:30}),30);
  for (const actualMinutes of [-1,NaN,Infinity,'inválido']) assert.equal(api.actualMinutesOf({actualMinutes}),0);
});

test('V461 remove a V452, renova os quatro elos e preserva paridade binária raiz/docs', () => {
  for (const file of ['daily-plan-pending-panel-v429.js','aldus-daily-plan-palette-v456.css','daily-plan-legibility-v455.js','performance-emergency-v350.js','security-observability-v318.js','index.html']) {
    assert.deepEqual(fs.readFileSync(path.join(root,file)),fs.readFileSync(path.join(root,'docs',file)),file);
  }
  for (const file of ['daily-plan-backlog-v452.js','docs/daily-plan-backlog-v452.js','tests/v452-daily-plan-backlog.test.js']) assert.equal(fs.existsSync(path.join(root,file)),false);
  assert.doesNotMatch(read('performance-emergency-v350.js'),/installDailyPlanBacklogV452|daily-plan-backlog-v452/);
  for (const [loader,asset] of [['daily-plan-legibility-v455.js','aldus-daily-plan-palette-v456.css'],['performance-emergency-v350.js','daily-plan-pending-panel-v429.js'],['performance-emergency-v350.js','daily-plan-legibility-v455.js'],['security-observability-v318.js','performance-emergency-v350.js'],['index.html','security-observability-v318.js']]) assert.ok(read(loader).includes(`${asset}?v=${version}`),loader);
});
