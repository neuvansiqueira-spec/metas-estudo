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

test('V454 sem endedAt, usa o hoje do app — não o relógio do sistema', () => {
  const { api } = harnessData();
  // Este teste quebrou sozinho na virada de 06 para 07/09/2026: o módulo caía
  // em new Date() quando faltava endedAt, e a data fixa do harness deixava de
  // bater. Quem manda no calendário do site é o app, via todayISO.
  assert.equal(api.carimbarDiaReal({}), HOJE);
  assert.equal(api.carimbarDiaReal({ endedAt: 0 }), HOJE, 'endedAt inválido também cai no hoje do app');
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

test('V456 dá acento próprio a cada bloco, na paleta do site', () => {
  const folha = read('aldus-daily-plan-palette-v456.css');
  const { api } = harnessVisual();
  for (const [chave, cor] of api.cores) {
    assert.match(folha, new RegExp(`data-daily-plan-section="${chave}"`), `falta o bloco ${chave}`);
    assert.ok(folha.includes(cor), `o bloco ${chave} precisa usar ${cor}, e não um tom inventado`);
  }
});

test('V456 usa a paleta de cartões que já existe, sem inventar cor', () => {
  const folha = read('aldus-daily-plan-palette-v456.css');
  const paleta = read('aldus-card-palette-v294.css');
  for (const token of ['--aldus-card-purple', '--aldus-card-gold', '--aldus-card-blue', '--aldus-card-teal']) {
    assert.ok(paleta.includes(token), `${token} precisa existir na V294`);
    assert.ok(folha.includes(`var(${token})`), `a V456 precisa consumir ${token}`);
  }
  // A receita visual e a mesma da V294: halo radial, gradiente e faixa interna.
  // A coordenada exata do halo e detalhe de ajuste fino, nao regra — fixa-la
  // faria este teste quebrar a cada acerto de peso visual.
  assert.ok(folha.includes('radial-gradient(circle at'), 'falta o halo radial');
  assert.ok(folha.includes('var(--aldus-card-halo)'), 'o halo precisa vir da paleta');
  assert.ok(folha.includes('linear-gradient(145deg'), 'falta a superficie em gradiente');
  assert.ok(folha.includes('inset 5px 0 0 var(--aldus-card-accent)'), 'falta a faixa do acento');
});

test('V456 não inventa cor fora da paleta', () => {
  const folha = read('aldus-daily-plan-palette-v456.css');
  const hex = [...folha.matchAll(/#[0-9a-f]{3,8}/gi)].map((m) => m[0].toLowerCase());
  const permitidos = new Set(['#f2c957', '#0d2b45', '#061a2d', '#b8cadd']);
  const fora = hex.filter((c) => !permitidos.has(c));
  assert.deepEqual(fora, [], `cores fora da paleta: ${fora.join(', ')}`);
});

test('V455 carrega a folha da paleta', () => {
  const { api } = harnessVisual();
  assert.match(api.folha, /aldus-daily-plan-palette-v456\.css\?v=/);
});

test('V455 só pinta: não mexe em comportamento', () => {
  const fonte = read('daily-plan-legibility-v455.js');
  assert.doesNotMatch(fonte, /saveData|state\.dailyGoals|renderDailyGoals\(/,
    'este módulo não pode tocar em dado nem em render do site');
});

test('V459 marca as propriedades em disputa, senão a V68 vence', () => {
  const folha = read('aldus-daily-plan-palette-v456.css');
  // aldus-contrast-system-v68.css aplica background e box-shadow com !important
  // sobre a familia que inclui .daily-plan-section. Sem a mesma marcacao aqui,
  // so a cor do texto passa e a caixa continua chapada.
  const v68 = read('aldus-contrast-system-v68.css');
  assert.match(v68, /daily-plan-section/, 'a V68 precisa mesmo tocar nesta familia');
  // As declaracoes sao multilinha: separa por ponto e virgula e olha o valor.
  const declaracoes = folha.split(';');
  for (const prop of ['background', 'box-shadow']) {
    const alvo = declaracoes.filter((d) => d.trim().includes(prop + ':'));
    assert.ok(alvo.length > 0, 'a folha precisa definir ' + prop);
    for (const decl of alvo) {
      assert.ok(decl.includes('!important'), 'sem !important a V68 vence em ' + prop + ': ' + decl.trim().slice(0, 60));
    }
  }
});

test('V454, V455 e V456 mantêm paridade raiz/docs', () => {
  assert.equal(read('timer-study-real-date-v454.js'), read('docs/timer-study-real-date-v454.js'));
  assert.equal(read('daily-plan-legibility-v455.js'), read('docs/daily-plan-legibility-v455.js'));
  assert.equal(read('aldus-daily-plan-palette-v456.css'), read('docs/aldus-daily-plan-palette-v456.css'));
});
