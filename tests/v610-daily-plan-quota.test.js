const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const DATE = '2026-09-08';
// V612 — a revisao vem do proprio modulo. Fixada como texto, ela tornava
// impossivel renovar a cadeia de cache sem editar este teste.
const VERSION = read('daily-plan-quota-v610.js').match(/VERSION\s*=\s*"([^"]+)"/)[1];
const moduleSource = read('daily-plan-quota-v610.js');
const canonical = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const goal = (id, extra = {}) => ({ id, date: DATE, data: DATE, syllabusItemId: id, discipline: id, subject: id, status: 'Pendente', origin: 'planejamento', ...extra });
const piece = extra => goal('piece-existing', { fixedDailyPieceV183: true, discipline: 'PEÇAS PARA DELEGADO', origin: 'planejamento peça diária', ...extra });

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `função ausente: ${name}`);
  const tail = source.slice(start);
  const next = tail.slice(1).search(/\n(?:function |const |\/\/ V)/);
  return next < 0 ? tail : tail.slice(0, next + 1);
}

function harness({ goals = [], limit = 2, loadQuota = true, loadPiece = true } = {}) {
  const state = {
    planning: { config: { topicsPerDay: limit, disciplinesPerDay: limit } }, dailyGoals: goals,
    syllabusItems: [
      { id: 'piece-candidate', discipline: 'PEÇAS PARA DELEGADO', subject: 'Prisão preventiva', status: 'Não iniciado' },
      ...['penal', 'processo', 'constitucional', 'civil', 'humano'].map(id => ({ id, discipline: id, subject: id, status: 'Não iniciado' }))
    ], schedulableSettings: {}, contestSyllabusMap: [], migrations: {},
    backupMetasV606: [goal('backup', { date: '2026-09-09' })]
  };
  const listeners = new Map();
  const buttons = new Map(['generateDailyGoals', 'refreshDailyGoalsFromPlanning'].map(id => [id, {
    id, listeners: [], addEventListener(_type, fn) { this.listeners.push(fn); },
    closest() { return this; }
  }]));
  const counters = { save: 0, render: 0, confirm: 0, messages: [], alerts: 0 };
  let serial = 0;
  const elements = { goalDate: { value: DATE }, ...Object.fromEntries(buttons) };
  const c = {
    __actualState: state, __elements: elements,
    // Deliberadamente errado: o modulo deve usar o const state, nao esta propriedade.
    state: { planning: { config: { topicsPerDay: 99 } }, dailyGoals: [] },
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-09-08T12:00:00Z'])); } static now() { return 1788868800000; } },
    console, canonical, todayISO: () => DATE,
    addDays(date, days) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); },
    addEventListener(type, fn) { const list = listeners.get(type) || []; list.push(fn); listeners.set(type, list); },
    document: {
      addEventListener(type, fn, capture) { const key = `document:${type}:${!!capture}`; const list = listeners.get(key) || []; list.push(fn); listeners.set(key, list); },
      getElementById(id) { return id === 'goalDate' ? elements.goalDate : buttons.get(id); }
    },
    queueMicrotask() {},
    setInterval() { throw new Error('polling proibido'); }, setTimeout() { throw new Error('timer proibido'); },
    ensureDefaultDisciplineWeights() {}, availabilityForDate: () => ({ type: 'dia normal' }),
    dayModeIncludesGoals: () => true, getDayContentConfig: () => ({ mode: 'goals_only' }),
    planningConfig: (s = state) => s.planning.config,
    planningTargetsForDate: (_date, s = state) => ({ topics: s.planning.config.topicsPerDay, disciplines: s.planning.config.disciplinesPerDay, oneGoalPerDiscipline: true }),
    buildPlanningScoreContext(s = state) { return { candidates: s.syllabusItems.filter(i => i.id !== 'piece-candidate'), pendingByDiscipline: { penal: 5 }, scores: new Map(), itemMetrics: new Map(), weaknesses: {} }; },
    goalDateValue: g => g.date || g.data,
    goalSyllabusReservationKey: g => g.syllabusItemId || g.id,
    planningItemKey: g => g.syllabusItemId || g.id,
    planningDistributionOrderV77: records => records.slice(),
    disciplineWeightValue: () => 5,
    planningGoalTypeForItemV157: () => 'Estudo novo', normalGoalTypeForItemV157: () => 'Estudo novo',
    makeGoal: (item, date, type) => [goal(`new-${++serial}`, { date, data: date, discipline: item.discipline, syllabusItemId: item.id, subject: item.subject, type })],
    normalizeGoalTimeFields(g) { g.normalizedByCore = true; },
    goalTotalActualMinutes: g => g.actualMinutes || 0,
    isGoalDone: g => g.status === 'Concluída', isGoalInProgress: g => g.status === 'Em andamento',
    isPlanningStudyGoal: g => !g.operationalDiscipline,
    completedStatus: () => false,
    markDailyPlanAlignmentV174() {},
    dailyPlanAlignmentStatusV174: s => ({ aligned: false, targets: { topics: s.planning.config.topicsPerDay } }),
    showDailyGoalMessage(text, tone) { counters.messages.push({ text, tone }); },
    saveData() { counters.save++; }, render() { counters.render++; },
    confirm() { counters.confirm++; return true; }, alert() { counters.alerts++; },
    formatDateBR: date => date, autoSyncAfterSave() {}, showView() {}, factoryCurrentFilter: '', renderFactory() {}
  };
  c.window = c.globalThis = c;
  vm.createContext(c);
  vm.runInContext('const state = __actualState; const elements = __elements;', c);
  const source = read('script.js');
  for (const name of ['pickCandidate', 'generateGoalsForDate', 'selectPlanningGoalsForTargets', 'eligiblePlanningGoalsForDate', 'isManualDailyGoal', 'isProtectedDailyGoal', 'isAutomaticIntactDailyGoal', 'reconcileDailyGoalsWithPlanning', 'ensureDailyPlanAlignedWithPlanningV174', 'generateDailyGoals', 'refreshDailyGoalsFromPlanning', 'reconcilePlanningDates']) {
    vm.runInContext(functionSource(source, name), c);
  }
  if (loadPiece) {
    vm.runInContext(read('daily-piece-audit-prelude-v186.js'), c);
    vm.runInContext(read('daily-delegate-piece-goal-v183.js'), c);
    vm.runInContext(read('daily-piece-audit-performance-v186.js'), c);
  }
  vm.runInContext(read('planning-stability-v427.js'), c);
  c.__ALDUS_PLANNING_STABILITY_V427__.installAdditiveAlignment();
  // O script registra estas referencias antes de um modulo dinamico carregar.
  for (const [name, button] of buttons) button.addEventListener('click', c[name]);
  if (loadQuota) vm.runInContext(moduleSource, c);
  function click(name) {
    const button = buttons.get(name);
    const event = { target: button, stopped: false, preventDefault() {}, stopImmediatePropagation() { this.stopped = true; } };
    for (const listener of listeners.get('document:click:true') || []) listener(event);
    if (!event.stopped) for (const listener of button.listeners) listener.call(button, event);
  }
  return { c, state, counters, click, listeners };
}

for (const button of ['generateDailyGoals', 'refreshDailyGoalsFromPlanning']) {
 for (const n of [0,1,2,8]) test(`${button}: ${n} automáticas, peça e cotas independentes`, () => {
  const originals=[...Array.from({length:n},(_,i)=>goal('old-'+i)),goal('s1',{origin:'manual',simulado3V605:true,userEdited:true}),goal('s2',{origin:'manual',simulado3V605:true})];
  const snap=JSON.stringify(originals), h=harness({goals:originals.slice()});
  h.click(button); h.click(button);
  const api=h.c.__ALDUS_DAILY_PLAN_QUOTA_V610__;
  assert.equal(h.state.dailyGoals.filter(g=>api.automatic(g,h.state)&&api.pending(g)).length, Math.max(n,2));
  assert.equal(h.state.dailyGoals.filter(g=>g.fixedDailyPieceV183).length,1);
  assert.equal(JSON.stringify(originals),snap);
  originals.forEach(g=>assert.ok(h.state.dailyGoals.includes(g)));
  assert.match(h.counters.messages.at(-1).text,/cabiam 0; entraram 0/);
 });
 for (const n of [0,4,8]) test(`${button}: config ${n} manda, mesmo com carimbo 2`,()=>{
  const h=harness({limit:n});
  h.state.migrations.planningStabilityV427={targetQuota:{topics:2}};
  h.click(button);
  assert.equal(h.c.__ALDUS_DAILY_PLAN_QUOTA_V610__.budget(h.state,DATE).before,Math.min(n,5));
  assert.equal(h.state.dailyGoals.filter(g=>g.fixedDailyPieceV183).length,1);
  assert.equal(h.state.planning.config.topicsPerDay,n);
 });
 test(`${button}: alterar configuração depois do primeiro clique`,()=>{
  const h=harness(); h.click(button); h.state.planning.config.topicsPerDay=4; h.state.planning.config.disciplinesPerDay=4; h.click(button);
  assert.equal(h.c.__ALDUS_DAILY_PLAN_QUOTA_V610__.budget(h.state,DATE).before,4);
 });
 test(`${button}: concluídas e peça concluída preservadas sem ocupar automáticas`,()=>{
  const old=[piece({status:'Concluída'}),goal('done',{status:'Concluída'}),goal('manual',{origin:'manual'})];
  const h=harness({goals:old.slice()}); h.click(button);
  assert.equal(h.c.__ALDUS_DAILY_PLAN_QUOTA_V610__.budget(h.state,DATE).before,2);
  assert.equal(h.state.dailyGoals.filter(g=>g.fixedDailyPieceV183).length,1);
  old.forEach(g=>assert.ok(h.state.dailyGoals.includes(g)));
 });
 test(`${button}: antes de 08/09 comportamento legado idêntico`,()=>{
  const a=harness(),b=harness({loadQuota:false});
  for(const h of [a,b]) { h.c.__elements.goalDate.value='2026-09-07'; h.click(button); }
  assert.equal(JSON.stringify(a.state.dailyGoals),JSON.stringify(b.state.dailyGoals));
  assert.deepEqual(a.counters,b.counters);
 });
}
test('guarda público da peça não remove automáticas de dia cheio',()=>{
 const old=Array.from({length:8},(_,i)=>goal('a'+i)),h=harness({goals:old.slice()});
 h.c.__aldusDailyDelegatePieceGoalV183.ensureDailyPieceForDate(DATE,h.state);
 assert.equal(h.state.dailyGoals.length,9); old.forEach(g=>assert.ok(h.state.dailyGoals.includes(g)));
});
test('geração direta inclui peça adicional e respeita teto automático',()=>{
 for(const n of [0,1,2,8]) {
  const h=harness({goals:Array.from({length:n},(_,i)=>goal('a'+i))});
  const generated=h.c.generateGoalsForDate(DATE,{targetState:h.state});
  assert.equal(generated.filter(g=>!g.fixedDailyPieceV183).length,Math.max(0,2-n));
  assert.equal(generated.filter(g=>g.fixedDailyPieceV183).length,1);
 }
});
test('reconciliação de várias datas limita cada dia, preservando originais',()=>{
 const old=[goal('old',{userEdited:true,actualMinutes:20}),goal('manual',{origin:'manual'})];
 const h=harness({goals:old.slice()});
 const r=h.c.reconcilePlanningDates(h.state,[DATE,'2026-09-09'],{explicit:true,rebuildAutomatic:true});
 for(const d of [DATE,'2026-09-09']) assert.equal(h.c.__ALDUS_DAILY_PLAN_QUOTA_V610__.budget(h.state,d).before,2);
 assert.equal(r.removed.length,0); old.forEach(g=>assert.ok(h.state.dailyGoals.includes(g)));
});
test('metas com tempo, userEdited e histórico mantêm identidade e campos',()=>{
 const old=[goal('a',{actualMinutes:1,userEdited:true}),goal('b',{tempoReal:5,history:[{x:1}]})],snapshot=JSON.stringify(old);
 const h=harness({goals:old.slice()}); h.click('refreshDailyGoalsFromPlanning');
 assert.equal(JSON.stringify(old),snapshot); old.forEach(g=>assert.ok(h.state.dailyGoals.includes(g)));
});
test('carregamento tardio, sem polling, sem mutação no carregamento',()=>{
 const h=harness({loadQuota:false}), before=JSON.stringify(h.state);
 vm.runInContext(moduleSource,h.c); vm.runInContext(moduleSource,h.c);
 assert.equal(JSON.stringify(h.state),before); h.click('generateDailyGoals');
 assert.equal(h.state.dailyGoals.length,3);
});
test('cancelamento não gera nem mostra sucesso',()=>{
 const h=harness({goals:[goal('old')]}); h.c.confirm=()=>false;
 h.click('generateDailyGoals'); assert.equal(h.state.dailyGoals.length,1); assert.equal(h.counters.messages.length,0);
});
test('config inválido usa fallback; config válido nunca é reduzido',()=>{
 const h=harness(); const api=h.c.__ALDUS_DAILY_PLAN_QUOTA_V610__;
 for(const value of [4,8,'6',0]) { h.state.planning.config.topicsPerDay=value; assert.equal(api.budget(h.state,DATE).limit,Number(value)); }
 for(const value of [null,'',false,-1,'x']) { h.state.planning.config.topicsPerDay=value; assert.equal(api.budget(h.state,DATE).limit,2); }
});
test('novo módulo espelhado e cadeia completa usam a mesma revisão', () => {
 for(const file of ['daily-plan-quota-v610.js','performance-emergency-v350.js','security-observability-v318.js','daily-plan-legibility-v455.js','daily-plan-preview-v462.js','index.html']) assert.equal(read(file),read('docs/'+file),file);
 for(const [loader,asset] of [['performance-emergency-v350.js','daily-plan-quota-v610.js'],['performance-emergency-v350.js','daily-plan-legibility-v455.js'],['daily-plan-legibility-v455.js','aldus-daily-plan-palette-v456.css'],['security-observability-v318.js','performance-emergency-v350.js'],['index.html','security-observability-v318.js']]) assert.ok(read(loader).includes(`${asset}?v=${VERSION}`),loader);
});
