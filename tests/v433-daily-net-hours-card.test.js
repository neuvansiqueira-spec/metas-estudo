const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const api = require(path.join(root, 'daily-net-hours-card-v433.js'));

const HOJE = (() => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
})();

test('V446 soma pela meta, mesma fonte do Resumo do dia', () => {
  // Números medidos em 03/09/2026: o Resumo do dia mostrava 3h46 (226min) e o
  // card mostrava 2h31 (151min), lado a lado. A diferença de 75min é tempo que
  // vive na meta e não vira sessão.
  const state = {
    dailyGoals: [
      { id: 'delta', date: HOJE, studyActualMinutes: 112, questionActualMinutes: 0 },
      { id: 'improbidade', date: HOJE, studyActualMinutes: 61, questionActualMinutes: 13 },
      { id: 'peca', date: HOJE, actualMinutes: 40 },
      { id: 'sem-tempo', date: HOJE },
      { id: 'ontem', date: '2026-01-01', studyActualMinutes: 300 }
    ],
    studies: [
      { date: HOJE, minutes: 55, goalId: 'delta' },
      { date: HOJE, minutes: 40, goalId: 'peca' },
      { date: HOJE, minutes: 2, goalId: 'improbidade' },
      { date: HOJE, minutes: 8, goalId: 'improbidade' },
      { date: HOJE, minutes: 43, goalId: 'improbidade' },
      { date: HOJE, minutes: 3, goalId: 'improbidade' },
      { date: '2026-01-01', minutes: 300, goalId: 'ontem' }
    ]
  };
  assert.equal(api.todayMinutes(state), 226,
    'somar as sessões daria 151 e divergiria do Resumo do dia');
  assert.equal(api.todaySessions(state), 6, 'a legenda continua contando sessões');
});

test('V446 não conta duas vezes o tempo que já está na meta', () => {
  const state = {
    dailyGoals: [{ id: 'a', date: HOJE, studyActualMinutes: 60 }],
    studies: [{ date: HOJE, minutes: 60, goalId: 'a' }]
  };
  assert.equal(api.todayMinutes(state), 60, 'a sessão já está refletida na meta');
});

test('V446 preserva sessão avulsa, sem meta do dia', () => {
  const state = {
    dailyGoals: [{ id: 'a', date: HOJE, studyActualMinutes: 60 }],
    studies: [
      { date: HOJE, minutes: 60, goalId: 'a' },
      { date: HOJE, minutes: 25, goalId: 'meta-de-outro-dia' },
      { date: HOJE, minutes: 10 }
    ]
  };
  assert.equal(api.todayMinutes(state), 95, 'tempo real sem meta do dia não pode sumir');
});

test('V446 reproduz goalTotalActualMinutes de script.js:3061', () => {
  // Parcial informada vence actualMinutes; sem parcial, cai no legado.
  assert.equal(api.goalActualMinutes({ studyActualMinutes: 61, questionActualMinutes: 13, actualMinutes: 999 }), 74);
  assert.equal(api.goalActualMinutes({ studyActualMinutes: 0, actualMinutes: 999 }), 0,
    'zero informado é informação, não ausência');
  assert.equal(api.goalActualMinutes({ actualMinutes: 40 }), 40);
  assert.equal(api.goalActualMinutes({ tempo_real_minutos: 30 }), 30);
  assert.equal(api.goalActualMinutes({}), 0);
  assert.equal(api.goalActualMinutes(null), 0);
});

test('V446 parte da lista exibida, não da lista crua de metas', () => {
  // O Resumo do dia soma dailyPlanGoalsForDisplay; somar a lista crua incluiria
  // metas que a tela esconde e recriaria a divergência ao contrário.
  const state = {
    dailyGoals: [
      { id: 'visivel', date: HOJE, actualMinutes: 30 },
      { id: 'escondida', date: HOJE, actualMinutes: 500 }
    ],
    studies: []
  };
  const original = globalThis.dailyPlanGoalsForDisplay;
  globalThis.dailyPlanGoalsForDisplay = (target) => target.dailyGoals.filter((g) => g.id === 'visivel');
  try {
    assert.deepEqual(api.goalsForDate(state, HOJE).map((g) => g.id), ['visivel']);
    assert.equal(api.todayMinutes(state), 30);
  } finally {
    globalThis.dailyPlanGoalsForDisplay = original;
  }
});

test('V433 não quebra com estado ausente ou malformado', () => {
  assert.equal(api.todayMinutes(null), 0);
  assert.equal(api.todayMinutes({}), 0);
  assert.equal(api.todayMinutes({ studies: 'nao é lista', dailyGoals: 'nao é lista' }), 0);
  assert.equal(api.todayMinutes({ dailyGoals: [null, 7, { date: HOJE, actualMinutes: 'abc' }] }), 0);
});

test('V433 formata em horas e minutos, sem decimal', () => {
  assert.equal(api.formatMinutes(0), '0min');
  assert.equal(api.formatMinutes(45), '45min');
  assert.equal(api.formatMinutes(60), '1h');
  assert.equal(api.formatMinutes(75), '1h 15min');
  assert.equal(api.formatMinutes(525), '8h 45min');
  assert.equal(api.formatMinutes(-30), '0min');
});

test('V433 concorda com formatHours do app na conversão de minutos', () => {
  // formatHours devolve "8.8h"; este card devolve "8h 45min". A diferença é
  // deliberada: o card do topo é lido de relance e hora fracionada engana.
  const script = read('script.js');
  assert.match(script, /function formatHours\(minutes\)/);
  assert.equal(api.formatMinutes(525), '8h 45min');
  // A fonte é a mesma do Resumo do dia; só a formatação difere.
  assert.match(script, /function goalTotalActualMinutes\(goal = \{\}\)/);
});

test('V433 descreve quantas sessões existem hoje', () => {
  assert.equal(api.sessionLabel(0), 'Nenhuma sessão registrada hoje.');
  assert.equal(api.sessionLabel(1), '1 sessão registrada hoje.');
  assert.equal(api.sessionLabel(3), '3 sessões registradas hoje.');
});

function domHarness(state) {
  const listeners = new Map();
  const context = {
    console: { info() {}, warn() {} },
    window: { addEventListener: (nome, fn) => listeners.set(nome, fn) }
  };
  const nodes = new Map();
  const detach = (child) => {
    const old = child && child.parentNode;
    if (!old || !Array.isArray(old.children)) return;
    const at = old.children.indexOf(child);
    if (at !== -1) old.children.splice(at, 1);
  };
  const makeNode = (id) => {
    const node = {
      className: '', textContent: '', innerHTML: '',
      children: [], parentNode: null,
      // Mover um nó o retira do pai anterior, como no DOM real. Sem isso o
      // nó aparece nos dois pais e a contagem de filhos mente.
      appendChild(child) { detach(child); child.parentNode = this; this.children.push(child); return child; },
      insertBefore(child, ref) {
        detach(child);
        child.parentNode = this;
        const at = this.children.indexOf(ref);
        this.children.splice(at === -1 ? this.children.length : at, 0, child);
        return child;
      },
      closest(sel) { return sel === '.goal-card' ? nodes.get('goalCard') : null; }
    };
    // O módulo cria o elemento e só depois atribui o id; o registro precisa
    // acompanhar a atribuição, como faz um DOM de verdade.
    let atual = '';
    Object.defineProperty(node, 'id', {
      get: () => atual,
      set(valor) { atual = String(valor || ''); if (atual) nodes.set(atual, node); },
      enumerable: true
    });
    node.id = id;
    return node;
  };
  const head = makeNode('head');
  const parent = makeNode('parent');
  const goalCard = makeNode('goalCard');
  goalCard.className = 'goal-card';
  parent.appendChild(goalCard);
  const weekly = makeNode('weeklyGoalStatus');
  goalCard.appendChild(weekly);
  context.document = {
    head,
    documentElement: head,
    getElementById: (id) => nodes.get(id) || null,
    createElement: () => makeNode('')
  };
  context.state = state;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read('daily-net-hours-card-v433.js'), context);
  return { context, listeners, nodes, parent, goalCard };
}

test('V433 põe os dois cards lado a lado, com um selo só', () => {
  const { context, listeners, nodes, parent, goalCard } = domHarness({
    dailyGoals: [{ id: 'g', date: HOJE, actualMinutes: 90 }],
    studies: [{ date: HOJE, minutes: 90, goalId: 'g' }]
  });
  listeners.get('load')();
  const card = nodes.get('aldusDailyNetHoursCardV433');
  const pair = nodes.get('aldusHeroIndicatorPairV433');
  const row = nodes.get('aldusHeroIndicatorRowV433');
  const chip = nodes.get('aldusHeroIndicatorChipV433');

  assert.ok(card && pair && row && chip, 'linha, par, selo e card precisam existir');
  assert.equal(card.parentNode, pair, 'o card do dia é irmão do semanal');
  assert.equal(goalCard.parentNode, pair, 'e o semanal vive no mesmo par');
  assert.equal(pair.children.indexOf(card), 0, 'o dia vem à esquerda');
  assert.equal(pair.children.indexOf(goalCard), 1);
  assert.equal(card.className, 'goal-card', 'mesma moldura dos dois lados');

  // .goal-card::before desenha o selo; com dois cards ele aparecia duas vezes.
  assert.equal(chip.textContent, 'Indicador estratégico');
  assert.equal(row.children.indexOf(chip), 0, 'o selo é cabeçalho do par');
  const estilo = context.document.getElementById('aldusDailyNetHoursStyleV433');
  assert.match(estilo.textContent, /\.goal-card::before \{ content: none/, 'e sai de dentro dos cards');
  assert.match(estilo.textContent, /align-items: start/, 'o par fica alinhado ao alto');
  // Medido na página publicada: o tema aplica align-self: center, e com
  // alturas diferentes os topos não batiam (232px contra 240px).
  assert.match(estilo.textContent, /> \.goal-card \{ align-self: stretch !important/,
    'os dois cards precisam esticar para ficar do mesmo tamanho');

  assert.equal(parent.children.length, 1, 'o grid do hero continua com um item nesta coluna');
  assert.equal(nodes.get('aldusDailyNetHoursValueV433').textContent, '1h 30min');
  assert.match(context.__ALDUS_DAILY_NET_HOURS_CARD_V433__.version, /^\d{8}-daily-net-hours-card-v433/);
});

test('V433 não duplica o card em renders sucessivos', () => {
  const { listeners, parent } = domHarness({
    dailyGoals: [{ id: 'g', date: HOJE, actualMinutes: 30 }],
    studies: [{ date: HOJE, minutes: 30, goalId: 'g' }]
  });
  listeners.get('load')();
  const antes = parent.children.length;
  const api433 = null;
  for (let i = 0; i < 5; i += 1) listeners.get('load')();
  assert.equal(parent.children.length, antes, 'inserir mais de uma vez criaria cards repetidos');
  assert.equal(api433, null);
});

test('V433 não faz nada quando o card da meta semanal não existe', () => {
  const context = vm.createContext({
    console: { info() {}, warn() {} },
    window: { addEventListener() {} },
    document: { head: {}, documentElement: {}, getElementById: () => null, createElement: () => ({}) },
    state: { studies: [] }
  });
  context.globalThis = context;
  vm.runInContext(read('daily-net-hours-card-v433.js'), context);
  assert.equal(context.__ALDUS_DAILY_NET_HOURS_CARD_V433__.renderCard(), false);
});

test('V433 alcança o estado declarado como const no escopo global', () => {
  const listeners = new Map();
  const context = vm.createContext({
    console: { info() {}, warn() {} },
    window: { addEventListener: (nome, fn) => listeners.set(nome, fn) },
    document: { head: {}, documentElement: {}, getElementById: () => null, createElement: () => ({}) }
  });
  context.globalThis = context;
  vm.runInContext(`const state = { dailyGoals: [{ id: "g", date: "${HOJE}", actualMinutes: 42 }], studies: [] };
    globalThis.__leituraDoGlobal = typeof globalThis.state;`, context);
  assert.equal(context.__leituraDoGlobal, 'undefined');
  vm.runInContext(read('daily-net-hours-card-v433.js'), context);
  vm.runInContext('globalThis.__minutos = __ALDUS_DAILY_NET_HOURS_CARD_V433__.todayMinutes(state);', context);
  assert.equal(context.__minutos, 42, 'ler apenas globalThis.state daria zero');
});

test('V433 não introduz polling, observador nem escrita de estado', () => {
  const source = read('daily-net-hours-card-v433.js');
  const codigo = source.split('\n').filter((linha) => !linha.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(codigo, /setInterval|setTimeout|requestAnimationFrame|MutationObserver/);
  assert.doesNotMatch(codigo, /saveData|localStorage|indexedDB/);
  assert.doesNotMatch(codigo, /state\.[a-zA-Z]+\s*=/, 'o card apenas lê o estado');
});

test('V433 mantém paridade raiz/docs e é publicado com cache-bust', () => {
  assert.equal(read('daily-net-hours-card-v433.js'), read('docs/daily-net-hours-card-v433.js'));
  const loader = read('performance-emergency-v350.js');
  assert.match(loader, /daily-net-hours-card-v433\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.equal(loader, read('docs/performance-emergency-v350.js'));
});
