const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const HOJE = '2026-09-06';

// ---------------------------------------------------------------- V454
function harnessData() {
  const ouvintes = [];
  const context = {
    console: { warn() {}, error() {} },
    todayISO: () => HOJE,
    pendingTimerStudyDraft: null,
    document: { addEventListener: (nome, fn, captura) => ouvintes.push({ nome, fn, captura }) }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read('timer-study-real-date-v454.js'), context);
  return { context, api: context.__ALDUS_TIMER_STUDY_REAL_DATE_V454__, ouvintes };
}

test('V454 data a sessão pelo dia em que ela terminou, não pelo dia da meta', () => {
  const { api } = harnessData();
  // Ele voltou para a meta de 20/07 e estudou hoje.
  const draft = { goalDate: '', endedAt: new Date('2026-09-06T21:30:00').getTime() };
  assert.equal(api.carimbarDiaReal(draft), HOJE);
  assert.equal(draft.goalDate, HOJE,
    'goalDate tem precedência sobre goal.date na gravação: é por ele que a correção passa');
});

test('V454 sem endedAt, usa hoje', () => {
  const { api } = harnessData();
  const draft = {};
  assert.equal(api.carimbarDiaReal(draft), HOJE);
});

test('V454 não explode sem rascunho', () => {
  const { api } = harnessData();
  assert.equal(api.carimbarDiaReal(null), null);
  assert.equal(api.carimbarDiaReal(undefined), null);
});

test('V454 escuta na captura, para chegar antes do formulário', () => {
  const { ouvintes } = harnessData();
  const submit = ouvintes.find((o) => o.nome === 'submit');
  assert.ok(submit, 'precisa escutar submit');
  assert.equal(submit.captura, true,
    'o listener do site é de bolha; sem captura, a data já teria sido gravada');
});

// ---------------------------------------------------------------- V455
function harnessVisual({ dataNaTela = HOJE, comSecao = true } = {}) {
  const nos = new Map();
  const eventos = [];
  const criar = (tag) => ({
    tag, id: '', hidden: false, innerHTML: '', textContent: '', value: '',
    filhos: [], ouvintes: {},
    appendChild(f) { this.filhos.push(f); if (f.id) nos.set(f.id, f); return f; },
    prepend(f) { this.filhos.unshift(f); if (f.id) nos.set(f.id, f); return f; },
    addEventListener(n, fn) { (this.ouvintes[n] ||= []).push(fn); },
    dispatchEvent(e) { eventos.push({ id: this.id, tipo: e?.type, valor: this.value }); return true; },
    closest() { return null; }
  });
  if (comSecao) { const s = criar('section'); s.id = 'view-metas-do-dia'; nos.set(s.id, s); }
  const campo = criar('input'); campo.id = 'goalDate'; campo.value = dataNaTela; nos.set(campo.id, campo);
  const head = criar('head'); nos.set('head', head);

  const context = {
    console: { warn() {}, error() {} },
    todayISO: () => HOJE,
    formatDateBR: (iso) => { const [a, m, d] = String(iso).split('-'); return `${d}/${m}/${a}`; },
    document: { getElementById: (id) => nos.get(id) || null, createElement: criar, head },
    Event: class { constructor(t) { this.type = t; } },
    setInterval: () => 0,
    clearInterval() {}
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read('daily-plan-legibility-v455.js'), context);
  return { context, api: context.__ALDUS_DAILY_PLAN_LEGIBILITY_V455__, nos, eventos };
}

test('V455 avisa quando o dia na tela não é hoje', () => {
  const { api, nos } = harnessVisual({ dataNaTela: '2026-07-20' });
  assert.equal(api.atualizarAviso(), true);
  const aviso = nos.get('aldusDailyPlanOtherDayV455');
  assert.equal(aviso.hidden, false);
  assert.match(aviso.innerHTML, /20\/07\/2026, não hoje/);
  assert.match(aviso.innerHTML, /Voltar para hoje/);
});

test('V455 fica calado quando o dia é hoje', () => {
  const { api, nos } = harnessVisual({ dataNaTela: HOJE });
  assert.equal(api.atualizarAviso(), false);
  assert.equal(nos.get('aldusDailyPlanOtherDayV455').hidden, true);
});

test('V455 dá cor e rótulo próprios a cada bloco', () => {
  const { api } = harnessVisual();
  const folha = api.css();
  for (const [chave, cor, rotulo] of api.cores) {
    assert.match(folha, new RegExp(`data-daily-plan-section="${chave}"`), `falta o bloco ${chave}`);
    assert.ok(folha.includes(cor), `falta a cor de ${chave}`);
    assert.ok(folha.includes(`content: "${rotulo}"`), `falta o rótulo de ${chave}`);
  }
  const cores = api.cores.map(([, cor]) => cor);
  assert.equal(new Set(cores).size, cores.length, 'duas cores iguais anulam o propósito');
});

test('V455 só pinta: não mexe em comportamento', () => {
  const fonte = read('daily-plan-legibility-v455.js');
  assert.doesNotMatch(fonte, /saveData|state\.dailyGoals|renderDailyGoals\(/,
    'este módulo não pode tocar em dado nem em render do site');
});

test('V454 e V455 mantêm paridade raiz/docs', () => {
  assert.equal(read('timer-study-real-date-v454.js'), read('docs/timer-study-real-date-v454.js'));
  assert.equal(read('daily-plan-legibility-v455.js'), read('docs/daily-plan-legibility-v455.js'));
});
