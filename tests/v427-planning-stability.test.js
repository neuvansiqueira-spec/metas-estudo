const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const api = require(path.join(root, 'planning-stability-v427.js'));

function planningState(topics = 5, disciplines = 5) {
  return {
    planning: {
      config: { topicsPerDay: topics, disciplinesPerDay: disciplines },
      manualGoalsConfigV235: { version: 'v235', disciplines, topics }
    },
    dailyGoals: []
  };
}

test('V427 grava a cota de 6 nas três fontes que o V235 reaplica', () => {
  const state = planningState();
  const snapshot = api.writeQuota(state);
  assert.equal(state.planning.config.topicsPerDay, 6);
  assert.equal(state.planning.config.disciplinesPerDay, 6);
  assert.equal(state.planning.manualGoalsConfigV235.topics, 6,
    'escrever só em planning.config é desfeito no saveData seguinte');
  assert.equal(snapshot.topics, 6);
});

test('V427 escreve o snapshot no formato que recordManualCount espera', () => {
  const state = planningState();
  const snapshot = api.writeQuota(state);
  for (const campo of ['version', 'disciplines', 'topics', 'savedAt']) {
    assert.ok(Object.prototype.hasOwnProperty.call(snapshot, campo), `falta ${campo}`);
  }
  assert.equal(typeof snapshot.savedAt, 'string');
});

test('V427 registra a cota anterior no marcador, para auditoria', () => {
  const state = planningState(5, 5);
  const result = api.apply(state);
  assert.equal(result.changed, true);
  assert.deepEqual(result.quotaBefore, { disciplines: 5, topics: 5 });
  assert.deepEqual(result.quota, { disciplines: 6, topics: 6 });
  assert.equal(state.migrations.planningStabilityV427.completed, true);
});

test('V427 é idempotente: a segunda execução não reescreve', () => {
  const state = planningState();
  api.apply(state);
  const again = api.apply(state);
  assert.equal(again.repeated, true);
  assert.equal(again.changed, false);
});

test('V427 reaplica quando a cota-alvo muda, e não só na primeira vez', () => {
  // Quem já rodou a versão de cota 8 tem o marcador completed:true. Sem
  // comparar o alvo gravado, trocar 8 por 6 no código não teria efeito nenhum.
  const state = planningState(8, 8);
  state.migrations = { planningStabilityV427: { completed: true, version: 'antiga', quotaAfter: { disciplines: 8, topics: 8 } } };
  const result = api.apply(state);
  assert.equal(result.changed, true, 'marcador antigo não pode congelar a cota velha');
  assert.equal(state.planning.config.topicsPerDay, 6);
  assert.deepEqual(state.migrations.planningStabilityV427.targetQuota, { disciplines: 6, topics: 6 },
    'o alvo precisa ficar gravado, senão a próxima mudança também não pega');
  assert.equal(api.apply(state).repeated, true, 'com o mesmo alvo, volta a ser uma vez só');
});

test('V427 não altera nada quando não há planejamento', () => {
  const result = api.apply({ dailyGoals: [] });
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'planning-unavailable');
});

test('V427 troca a reconstrução destrutiva por preenchimento aditivo', () => {
  const chamadas = [];
  const original = globalThis.reconcileDailyGoalsWithPlanning;
  globalThis.reconcileDailyGoalsWithPlanning = (targetState, date, opts) => {
    chamadas.push(opts);
    return { added: [], removed: [], preserved: [], warnings: [] };
  };
  try {
    api.alignAdditively(planningState(), '2026-09-02', { explicit: true, force: true });
    assert.equal(chamadas.length, 1);
    assert.equal(chamadas[0].rebuildAutomatic, false,
      'rebuildAutomatic:true executa removeGoals(automatic) e apaga as pendentes');
  } finally {
    globalThis.reconcileDailyGoalsWithPlanning = original;
  }
});

test('V441 restaura só meta protegida e mantém fora a automática omitida pela deduplicação', () => {
  const targetState = planningState();
  const protectedGoal = { id: 'protegida', date: '2026-09-03', protected: true };
  const automaticDuplicate = { id: 'automatica-duplicada', date: '2026-09-03', protected: false };
  const survivor = { id: 'sobrevivente', date: '2026-09-03', protected: false };
  targetState.dailyGoals = [protectedGoal, automaticDuplicate, survivor];

  const originalReconcile = globalThis.reconcileDailyGoalsWithPlanning;
  const originalProtected = globalThis.isProtectedDailyGoal;
  globalThis.isProtectedDailyGoal = (goal) => goal.protected === true;
  globalThis.reconcileDailyGoalsWithPlanning = (state) => {
    // Simula a etapa destrutiva/deduplicadora: ambas somem. A rede V441 só
    // pode trazer de volta a que a política central considera protegida.
    state.dailyGoals = [survivor];
    return {
      added: [],
      removed: ['protegida', 'automatica-duplicada'],
      preserved: [],
      warnings: []
    };
  };

  try {
    const result = api.alignAdditively(targetState, '2026-09-03', { explicit: true, force: true });
    assert.equal(targetState.dailyGoals.includes(protectedGoal), true,
      'a meta protegida removida pela etapa interna precisa ser restaurada');
    assert.equal(targetState.dailyGoals.includes(automaticDuplicate), false,
      'a automática omitida pela deduplicação continua fora');
    assert.deepEqual(result.report.restoredProtected, ['protegida']);
    assert.deepEqual(result.report.removed, ['automatica-duplicada'],
      'o relatório não pode dizer que a protegida continua removida após restaurá-la');
    assert.ok(result.report.preserved.includes('protegida'));
  } finally {
    globalThis.reconcileDailyGoalsWithPlanning = originalReconcile;
    globalThis.isProtectedDailyGoal = originalProtected;
  }
});

test('V427 exige autorização explícita antes de tocar no plano', () => {
  const resultado = api.alignAdditively(planningState(), '2026-09-02', {});
  assert.equal(resultado.changed, false);
  assert.equal(resultado.skipped, 'explicit-authorization-required');
});

test('V427 mantém a reconstrução destrutiva disponível sob pedido explícito', () => {
  const chamadas = [];
  const originalEnsure = globalThis.ensureDailyPlanAlignedWithPlanningV174;
  const originalReconcile = globalThis.reconcileDailyGoalsWithPlanning;
  globalThis.ensureDailyPlanAlignedWithPlanningV174 = (targetState, date, opts) => {
    chamadas.push(['original', opts]);
    return { changed: true };
  };
  globalThis.reconcileDailyGoalsWithPlanning = (targetState, date, opts) => {
    chamadas.push(['aditivo', opts]);
    return { added: [], removed: [], preserved: [], warnings: [] };
  };
  try {
    assert.equal(api.installAdditiveAlignment(), true);
    globalThis.ensureDailyPlanAlignedWithPlanningV174(planningState(), '2026-09-02', { explicit: true, force: true });
    assert.equal(chamadas.at(-1)[0], 'aditivo', 'o padrão passa a ser aditivo');
    globalThis.ensureDailyPlanAlignedWithPlanningV174(planningState(), '2026-09-02', { rebuildAutomatic: true });
    assert.equal(chamadas.at(-1)[0], 'original', 'a reconstrução continua acessível quando pedida');
  } finally {
    globalThis.ensureDailyPlanAlignedWithPlanningV174 = originalEnsure;
    globalThis.reconcileDailyGoalsWithPlanning = originalReconcile;
  }
});

test('V427 não instala o wrapper duas vezes', () => {
  const originalEnsure = globalThis.ensureDailyPlanAlignedWithPlanningV174;
  const originalReconcile = globalThis.reconcileDailyGoalsWithPlanning;
  globalThis.ensureDailyPlanAlignedWithPlanningV174 = () => ({ changed: false });
  globalThis.reconcileDailyGoalsWithPlanning = () => ({ added: [], removed: [], preserved: [], warnings: [] });
  try {
    api.installAdditiveAlignment();
    const primeira = globalThis.ensureDailyPlanAlignedWithPlanningV174;
    api.installAdditiveAlignment();
    assert.equal(globalThis.ensureDailyPlanAlignedWithPlanningV174, primeira);
  } finally {
    globalThis.ensureDailyPlanAlignedWithPlanningV174 = originalEnsure;
    globalThis.reconcileDailyGoalsWithPlanning = originalReconcile;
  }
});

test('V427 alcança o estado declarado como const no escopo global', () => {
  const vm = require('node:vm');
  const listeners = new Map();
  const context = vm.createContext({
    console: { info() {}, warn() {} },
    localStorage: { setItem() {}, getItem: () => null },
    window: { addEventListener: (nome, fn) => listeners.set(nome, fn) }
  });
  vm.runInContext(`const state = { planning: { config: { topicsPerDay: 5, disciplinesPerDay: 5 } }, dailyGoals: [] };
    globalThis.__leituraDoGlobal = typeof globalThis.state;`, context);
  assert.equal(context.__leituraDoGlobal, 'undefined');
  vm.runInContext(read('planning-stability-v427.js'), context);
  context.__disparaLoad = () => listeners.get('load')?.();
  vm.runInContext('globalThis.__disparaLoad();', context);
  vm.runInContext('globalThis.__cota = state.planning.config.topicsPerDay;', context);
  assert.equal(context.__cota, 6, 'ler apenas globalThis.state faria a cota continuar em 5');
});

test('V441 resolve o estado somente pelo identificador state, nunca por globalThis.state', () => {
  const source = read('planning-stability-v427.js');
  assert.match(source, /if \(isObject\(state\)\) return state;/);
  assert.doesNotMatch(source, /globalThis\.state/,
    'script.js declara const state; globalThis.state não representa o estado real do app');
});

test('V427 não introduz polling nem toca em metas fora do fluxo do botão', () => {
  const source = read('planning-stability-v427.js');
  // Só o código executável: as menções em comentário explicam o defeito e não
  // são chamadas.
  const codigo = source.split('\n').filter((linha) => !linha.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(codigo, /setInterval|requestAnimationFrame|MutationObserver/);
  assert.doesNotMatch(codigo, /dailyGoals\s*=\s*\[/, 'o módulo nunca reescreve a lista de metas');
  assert.doesNotMatch(codigo, /\.splice\(|removeGoals\(/, 'o módulo nunca remove metas');
});

test('V427 mantém paridade raiz/docs e é publicado com cache-bust', () => {
  assert.equal(read('planning-stability-v427.js'), read('docs/planning-stability-v427.js'));
  const loader = read('performance-emergency-v350.js');
  assert.match(loader, /planning-stability-v427\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.equal(loader, read('docs/performance-emergency-v350.js'));
});
