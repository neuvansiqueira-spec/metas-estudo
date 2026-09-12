const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const time = require('../study-time-ledger.js');
const day = '2026-09-11';
const source = fs.readFileSync('script.js','utf8');
function section(start,end) { const a=source.indexOf(start), b=source.indexOf(end,a+start.length); assert.ok(a>=0&&b>a); return source.slice(a,b); }
function fixture() {
  const seconds=[63,720,668,429,3594,959,1454,1708,779,569,2344];
  const studies=seconds.map((seconds,i)=>({id:`s${i}`,timerSessionId:`session${i}`,date:day,seconds,minutes:Math.round(seconds/60),goalId:`g${i<3?0:i<6?1:i<9?2:3}`,origin:'timer',updatesGoal:true}));
  const dailyGoals=Array.from({length:9},(_,i)=>({id:`g${i}`,date:day,discipline:'Disciplina',subject:`Assunto ${i}`,status:i<7?'Concluída':'Pendente',minutes:i===6?120:75,actualMinutes:[24,83,65,48,0,0,0,0,0][i]}));
  return {studies,dailyGoals,questionLogs:[],syllabusItems:[]};
}
test('soma os segundos antes de formatar e mantém as três conclusões sem tempo',()=>{
  const state=fixture(), before=JSON.stringify(state);
  assert.equal(time.secondsBetween(state,day),13287);
  assert.equal(time.formatSeconds(time.secondsBetween(state,day)),'3h 41min 27s');
  assert.equal(time.sessionCount(state,day),11);
  for(const g of state.dailyGoals.slice(4,7))assert.equal(time.goalSeconds(g,state),0);
  assert.equal(JSON.stringify(state),before);
});
test('sessão vinculada a meta de outro dia entra na data do estudo, sem duplicar acumulado',()=>{
  const state={dailyGoals:[{id:'g',date:'2026-09-10',actualMinutes:2}],studies:[{id:'s',goalId:'g',date:day,origin:'timer',minutes:2,seconds:121}]};
  assert.equal(time.secondsBetween(state,day),121);
  assert.equal(time.secondsBetween(state,'2026-09-10'),0);
  assert.equal(time.goalSeconds(state.dailyGoals[0],state),121);
});
test('deduplica sessão e preserva complemento legado e sessão que não atualiza meta',()=>{
  const s={id:'a',timerSessionId:'x',goalId:'g',origin:'timer',date:day,minutes:1,seconds:63};
  const state={dailyGoals:[{id:'g',date:day,actualMinutes:6}],studies:[s,{...s,id:'b'},{id:'c',goalId:'g',origin:'timer',date:day,minutes:1,seconds:61,updatesGoal:false}]};
  assert.equal(time.secondsBetween(state,day),424);
  assert.equal(time.goalSeconds(state.dailyGoals[0],state),363);
});
test('registros antigos em minutos continuam disponíveis e segundos inválidos não contaminam total',()=>{
  assert.equal(time.recordSeconds({minutes:12}),720);
  assert.equal(time.recordSeconds({seconds:'inválido',minutes:12}),720);
  assert.equal(time.formatSeconds(0),'0h 00min 00s');
  assert.equal(time.formatMinutes(75),'1h 15min 00s');
});

test('relatório mantém disciplina legada e tipos de metas e questões com precisão de segundos',()=>{
  const state={subjects:[{id:'subject',name:'Disciplina antiga'}],studies:[{id:'s',subjectId:'subject',date:day,seconds:91,minutes:2}],
    dailyGoals:[{id:'g',date:day,actualMinutes:3,type:'Revisão'}],questionLogs:[{id:'q',date:day,minutes:2,trainingType:'Treino'}]};
  const ctx=vm.createContext({state,__ALDUS_STUDY_TIME__:time,centralTimeSyllabusIndex:()=>({}),canonicalStudyDescriptor:x=>x,
    studyOriginLabel:()=> 'Estudo',centralTimeLogEdital:()=> 'Edital'});
  vm.runInContext(section('function centralTimeChartLogs(','function centralTimePeriodBounds('),ctx);
  const logs=ctx.centralTimeChartLogs();
  assert.equal(logs[0].discipline,'Disciplina antiga');assert.equal(logs[0].minutes,91/60);
  assert.equal(logs[1].type,'Revisão');assert.equal(logs[2].type,'Treino');assert.equal(logs[2].id,'questions-q');
});
test('salvar cronômetro persiste segundos e pausas sem converter o legado de minutos',()=>{
  const goal={id:'g',date:day,studyActualMinutes:0,questionActualMinutes:0,status:'Pendente'};
  const state={studies:[],subjects:[]};
  const draft={goal,sessionId:'s',kind:'study',minutes:2,seconds:91,startedAt:10000,endedAt:131000,
    pauses:['1970-01-01T00:00:30.000Z'],resumes:['1970-01-01T00:01:00.000Z'],goalDate:day};
  const elements={timerStudyUpdateGoal:{checked:true},timerStudyDiscipline:{value:'Disciplina'},timerStudySubject:{value:'Assunto'},timerStudyMaterial:{value:''},timerStudyNotes:{value:''},timerStudyFeedAnalytics:{checked:true},timerStudyFeedAdvisor:{checked:true}};
  const noop=()=>{};
  const ctx=vm.createContext({state,pendingTimerStudyDraft:draft,elements,canonicalStudyDescriptor:()=>({exact:true,discipline:'Disciplina',subject:'Assunto'}),
    canonical:x=>x,rememberDailyPlanSection:noop,rememberDailyPlanGoal:noop,normalizeGoalTimeFields:noop,timerKindLabel:()=> 'Estudo',appendGoalHistory:noop,
    createId:()=> 'record',saveData:noop,render:noop,showDailyGoalMessage:noop,autoSyncAfterSave:noop,closeTimerStudyModal:noop,closeFloatingTimer:noop,formatHours:time.formatMinutes});
  vm.runInContext(section('function submitTimerStudyModal(','const $ ='),ctx);
  ctx.submitTimerStudyModal({preventDefault:noop});
  assert.equal(state.studies.length,1);assert.equal(state.studies[0].seconds,91);assert.equal(state.studies[0].minutes,2);
  assert.equal(state.studies[0].pauses[0],draft.pauses[0]);assert.equal(state.studies[0].resumes[0],draft.resumes[0]);
  assert.equal(time.secondsBetween({...state,dailyGoals:[goal]},day),91);
});
test('bundle publicado entrega o cálculo de segundos antes do núcleo',()=>{
  const bundle=fs.readFileSync('app.bundle.js','utf8');
  const ledger=bundle.indexOf('/* Aldus source: study-time-ledger.js */');
  assert.ok(ledger>=0&&ledger<bundle.indexOf('/* Aldus source: script.js */'));
});
test('os três módulos de apresentação concordam inclusive após mover os cartões no DOM',()=>{
  const state=fixture();
  const ctx=vm.createContext({console,state,todayISO:()=>day,__ALDUS_STUDY_TIME__:time});
  for(const file of ['daily-net-hours-card-v433.js','dashboard-today-time-sync-v253.js','daily-summary-time-format-v243.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
  assert.equal(ctx.__ALDUS_DAILY_NET_HOURS_CARD_V433__.todayMinutes(state)*60,13287);
  assert.equal(ctx.__ALDUS_DASHBOARD_TODAY_TIME_SYNC_V253__.calculateTodayMinutes(state)*60,13287);
  assert.equal(ctx.__ALDUS_DAILY_SUMMARY_TIME_FORMAT_V243__.formatDurationMinutes(13287/60),'3h 41min 27s');
  assert.match(fs.readFileSync('dashboard-today-time-sync-v253.js','utf8'),/#dailyGoalsSummary \.realized-today-stat > strong/);
});
test('Dashboard inclui as nove metas e a pendência de assunto concluído antes',()=>{
  const state=fixture();
  const elements=Object.fromEntries(['dashboardTodayGoal','dashboardTodayRemaining','todayGoalsTotal','todayPendingGoals','todayDoneGoals'].map(k=>[k,{}]));
  const ctx=vm.createContext({console,state,elements,todayISO:()=>day,weekStart:()=>day,addDays:()=>day,goalsBetween:()=>state.dailyGoals,
    dailyPlanGoalsForDisplay:()=>state.dailyGoals,availabilityForDate:()=>({hours:12}),goalDateValue:g=>g.date,isGoalDone:g=>g.status==='Concluída',
    completedPlanningSubjectRecords:()=>[{subject:'Assunto 7',discipline:'Disciplina'}],completedStatus:()=>false,completionRate:()=>0,
    goalTotalActualMinutes:g=>g.actualMinutes,__ALDUS_STUDY_TIME__:time});
  vm.runInContext(section('function formatHours(','function formatDateBR('),ctx);
  vm.runInContext(source.split('\n').find(l=>l.startsWith('function goalProgressStats(')),ctx);
  vm.runInContext(section('function renderGoalDashboardCards(','function safeRenderView('),ctx);
  ctx.renderGoalDashboardCards([state.dailyGoals[8]]);
  assert.equal(elements.todayGoalsTotal.textContent,9);
  assert.equal(elements.todayPendingGoals.textContent,2);
  assert.equal(elements.todayDoneGoals.textContent,7);
  assert.equal(elements.dashboardTodayGoal.textContent,'12h 00min 00s');
  assert.equal(elements.dashboardTodayRemaining.textContent,'8h 18min 33s');
});
