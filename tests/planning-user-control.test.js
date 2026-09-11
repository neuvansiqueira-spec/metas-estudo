const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('script.js', 'utf8');
function between(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a);
  return source.slice(a, b);
}
const date = '2026-09-11';
const goal = (id, extra = {}) => ({id, date, discipline:'Direito', subject:'Assunto planejado', syllabusItemId:'s1', status:'Pendente', origin:'planejamento', minutes:45, ...extra});

test('concluir assunto não substitui metas já agendadas do mesmo assunto', () => {
  const s = {dailyGoals:[goal('hoje'),goal('amanha',{date:'2026-09-12'}),goal('manual',{origin:'manual'})],studies:[{minutes:17}]};
  const before = JSON.stringify(s);
  let replacements = 0;
  const ctx = vm.createContext({state:s,todayISO:()=>date,goalDateValue:g=>g.date,isManualDailyGoal:g=>g.origin==='manual',shouldRecalculateDailyGoal:()=>true,planningRecordMatchesCompletedSubject:()=>true,buildPlanningScoreContext:()=>({}),reconcilePlanningDates:()=>{replacements++;return {added:['nova'],warnings:[]};}});
  vm.runInContext(between('function replanFutureGoalsAfterCompletionV77','function rebalanceFuturePlanningGoalsV77'),ctx);
  const report = ctx.replanFutureGoalsAfterCompletionV77({id:'s1'},s);
  assert.equal(JSON.stringify(s),before);
  assert.equal(replacements,0);
  assert.equal(report.skipped,'explicit-authorization-required');
});

test('carregamento de dados não recalcula prioridades antes dos módulos de proteção', () => {
  const s = {dailyGoals:[goal('original')],planning:{},migrations:{}};
  const before = JSON.stringify(s);
  let calls = 0;
  const ctx = vm.createContext({state:s,INTEGRATED_PLANNING_PRIORITY_VERSION_V155:'v155',planningPriorityFingerprintV155:()=> 'novo',prepareIntegratedPlanningPrioritiesV155:()=>{calls++; return {ok:true,candidateState:{dailyGoals:[],planning:{},migrations:{}}};}});
  vm.runInContext(between('function applyIntegratedPlanningPrioritiesV155','function refreshPlanningPrioritiesForQuestionChangesV155'),ctx);
  ctx.applyIntegratedPlanningPrioritiesV155(s,{reason:'replace-state'});
  assert.equal(JSON.stringify(s),before);
  assert.equal(calls,0);
  ctx.applyIntegratedPlanningPrioritiesV155(s,{explicit:true});
  assert.equal(calls,1,'a ação explícita continua disponível');
});

test('meta salva permanece visível mesmo que outro registro tenha concluído o assunto', () => {
  const s = {dailyGoals:[goal('pendente'),goal('concluida',{status:'Concluída'}),goal('outro-dia',{date:'2026-09-12'})]};
  const ctx = vm.createContext({state:s,todayISO:()=>date,goalDateValue:g=>g.date,completedPlanningSubjectRecords:()=>[{id:'s1'}],planningRecordMatchesCompletedSubject:()=>true,isGoalDone:g=>g.status==='Concluída'});
  vm.runInContext(between('function isActionableDailyPlanGoal','function planningDistributionProfileV77'),ctx);
  assert.deepEqual(Array.from(ctx.dailyPlanGoalsForDisplay(s,date),g=>g.id),['pendente','concluida']);
});

test('atualizar conforme planejamento não solicita reconstrução destrutiva por padrão', () => {
  let options;
  const ctx = vm.createContext({state:{},todayISO:()=>date,dailyPlanAlignmentStatusV174:()=>({aligned:false,targets:{topics:2}}),reconcileDailyGoalsWithPlanning:(_s,_d,o)=>{options=o;return {added:[],removed:[]};},markDailyPlanAlignmentV174:()=>{}});
  vm.runInContext(between('function ensureDailyPlanAlignedWithPlanningV174','function generateGoalsForDate'),ctx);
  ctx.ensureDailyPlanAlignedWithPlanningV174({},date,{explicit:true});
  assert.equal(options.rebuildAutomatic,false);
  ctx.ensureDailyPlanAlignedWithPlanningV174({},date,{explicit:true,rebuildAutomatic:true});
  assert.equal(options.rebuildAutomatic,true);
});

test('editar configurações ou disponibilidade preserva metas sem gerar substituições', () => {
  const callbacks = {}, fields = new Proxy({}, {get:(obj,key)=>obj[key] ||= {value:'2'}});
  fields.planningConfigForm = {addEventListener:(event,callback)=>callbacks.config=callback};
  fields.availabilityCalendar = {addEventListener:(event,callback)=>callbacks.availability=callback};
  const s = {dailyGoals:[goal('hoje'),goal('futura',{date:'2026-09-12'})],planning:{config:{},availability:{}},edital:{}};
  let rebuilds = 0, saves = 0;
  const ctx = vm.createContext({state:s,elements:fields,planningConfig:()=>s.planning.config,todayISO:()=>date,document:{querySelector:selector=>({value:selector.includes('input[')?'goals_only':'2'})},DAY_CONTENT_MODES:['goals_only'],defaultDayContentModes:{},dayModeIncludesQuestions:()=>false,validateQuestionTarget:()=>true,normalizeDayContentModes:x=>x,daysBetween:()=>[date],reconcilePlanningDates:()=>{rebuilds++;return {reports:[],added:[],removed:[],warnings:[]};},reconcileDailyGoalsWithPlanning:()=>{rebuilds++;return {warnings:[]};},markDailyPlanAlignmentV174:()=>{},availabilityForDate:()=>({type:'normal',hours:2}),availabilityDefaults:()=>3,formatDateBR:x=>x,saveData:()=>saves++,render:()=>{},showView:()=>{},setPlanningSaveStatus:()=>{},showDailyGoalMessage:()=>{},autoSyncAfterSave:()=>{}});
  vm.runInContext(between('elements.planningConfigForm?.addEventListener("submit"','elements.availabilityCalendar?.addEventListener("change"'),ctx);
  const availabilityStart = source.indexOf('elements.availabilityCalendar?.addEventListener("change"');
  const availabilityEnd = source.indexOf('\n});',availabilityStart)+4;
  vm.runInContext(source.slice(availabilityStart,availabilityEnd),ctx);
  const before = JSON.stringify(s.dailyGoals);
  callbacks.config({preventDefault(){}});
  callbacks.availability({target:{dataset:{availabilityHours:date},value:'4'}});
  assert.equal(JSON.stringify(s.dailyGoals),before);
  assert.equal(rebuilds,0);
  assert.equal(saves,2);
  assert.equal(s.planning.availability[date].hours,4);
  assert.equal(s.planning.manualGoalsConfigV235.topics,2);
});

test('abrir e recarregar preserva cinco metas planejadas, três fixas e toda a semana', () => {
  for (const marker of [undefined, {completed:true}, {completed:true,targetQuota:{disciplines:2,topics:2}}]) {
    const s = {dailyGoals:[...Array.from({length:5},(_,i)=>goal(`programada-${i}`)),
      goal('cota-1',{origin:'manual'}),goal('cota-2',{origin:'manual'}),goal('peca',{type:'Peça'}),
      goal('semana',{date:'2026-09-14'})],planning:{config:{topicsPerDay:5,disciplinesPerDay:5},manualGoalsConfigV235:{topics:5,disciplines:5,savedAt:'2026-09-10T20:00:00Z'}},migrations:{planningStabilityV427:marker}};
    const before = JSON.stringify(s), listeners = {}, storage = new Map();
    storage.set('aldusPlanningManualGoalsV235',JSON.stringify(s.planning.manualGoalsConfigV235));
    const saved = storage.get('aldusPlanningManualGoalsV235');
    let writes = 0;
    const ctx = vm.createContext({console,window:{addEventListener:(n,f)=>listeners[n]=f},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>{writes++;storage.set(k,v);}},saveData:()=>writes++});
    ctx.fixture = s;
    vm.runInContext('const state = fixture;',ctx);
    vm.runInContext(between('function applyIntegratedPlanningPrioritiesV155','function refreshPlanningPrioritiesForQuestionChangesV155'),ctx);
    vm.runInContext(between('function repairDailyPlanningInflationV108','function replenishMissingDailyPlanningGoalsV116'),ctx);
    vm.runInContext(between('function repairInvalidReinforcementGoalsV157','const DISCIPLINE_WEIGHT_OPTIONS'),ctx);
    for (let boot=0;boot<2;boot++) {
      ctx.applyIntegratedPlanningPrioritiesV155(s,{reason:'replace-state',force:true});
      ctx.repairDailyPlanningInflationV108(s,{source:'replace-state'});
      ctx.repairInvalidReinforcementGoalsV157(s);
      vm.runInContext(fs.readFileSync('planning-stability-v427.js','utf8'),ctx);
      for (const fire of Object.values(listeners)) fire();
    }
    assert.equal(JSON.stringify(s),before);
    assert.equal(storage.get('aldusPlanningManualGoalsV235'),saved);
    assert.equal(writes,0);
    assert.equal(ctx.applyPlanningStabilityV427(s,{force:true}).reason,'explicit-authorization-required');
  }
});

test('a semana exibe todos os registros salvos, inclusive assunto repetido em outro dia', () => {
  const s = {dailyGoals:[goal('hoje'),goal('amanha',{date:'2026-09-12'})]};
  const before = JSON.stringify(s);
  const ctx = vm.createContext({state:s,todayISO:()=>date,planningConfig:()=>({disciplinesPerDay:5}),daysBetween:()=>[date,'2026-09-12'],goalDateValue:g=>g.date,isPlanningStudyGoal:()=>true,goalSyllabusReservationKey:g=>g.syllabusItemId,planningItemKey:g=>g.syllabusItemId,isManualDailyGoal:()=>false,reserveGeneratedSyllabus:()=>{}});
  vm.runInContext(between('function weeklyPlanGoalsForDate','function renderWeeklyGoalsPlanDesktop'),ctx);
  const days = ctx.weeklyPlanDays();
  assert.deepEqual(Array.from(days,d=>Array.from(d.goals,g=>g.id)),[['hoje'],['amanha']]);
  assert.equal(JSON.stringify(s),before);
});

test('o módulo tardio de integridade não remove cartões de metas salvas', () => {
  const integrity = fs.readFileSync('planning-integrity-v235.js','utf8');
  const a = integrity.indexOf('  function hideCompletedDailyGoalCardsV411'), b = integrity.indexOf('  function installDailyGoalsRenderGuardV411',a);
  const ctx = vm.createContext({document:{querySelectorAll:()=>{throw new Error('não deve filtrar cartões salvos');}}});
  vm.runInContext(integrity.slice(a,b),ctx);
  assert.equal(ctx.hideCompletedDailyGoalCardsV411({dailyGoals:[goal('salva')]}),0);
});
