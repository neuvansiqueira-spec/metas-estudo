const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const engine = require('../analytics-engine.js');

function sampleState() { return { subjects:[{id:'s1',name:'Direito Tributário'},{id:'s2',name:'Processo Penal'},{id:'s3',name:'Direito Civil'}], studies:[
  {date:'2026-07-10',subjectId:'s1',topic:'Impostos',minutes:120,questions:10,correct:4,wrong:6,blank:0},
  {date:'2026-07-11',subjectId:'s2',topic:'Ação penal',minutes:60,questions:25,correct:20,wrong:4,blank:1},
  {date:'2026-06-10',subjectId:'s1',topic:'Impostos',minutes:60,questions:10,correct:8,wrong:2,blank:0}],
  questionLogs:[{date:'2026-07-12',discipline:'Processo Penal',subject:'Ação penal',board:'Cebraspe',total:10,correct:8,wrong:1,blank:1},{date:'2026-07-12',discipline:'Direito Tributário',subject:'Taxas',board:'Cebraspe',total:10,correct:4,wrong:6,blank:0},{date:'2026-07-12',discipline:'',subject:'Sem',total:1,correct:1,wrong:0,blank:0}],
  dailyGoals:[{date:'2026-07-10',discipline:'Direito Tributário',subject:'Impostos',status:'Pendente',minutes:60},{date:'2026-07-11',discipline:'Processo Penal',subject:'Ação penal',status:'Concluída',minutes:60},{date:'2026-07-12',discipline:'Direito Civil',subject:'Contratos',status:'Pendente',minutes:60}],
  syllabusItems:[{id:'i1',discipline:'Direito Tributário',subject:'Impostos',status:'Em andamento'},{id:'i2',discipline:'Direito Civil',subject:'Contratos',status:'Não iniciado'},{id:'i3',discipline:'Processo Penal',subject:'Ação penal',status:'Concluído'},{id:'i4',discipline:'Direito Civil',subject:'Ignorado',status:'Ignorado'}],
  smartReviews:[{date:'2026-07-12',status:'revisado'}],
  simulados:[{date:'2026-07-01',name:'S1',net:50,goal:60,disciplines:[]},{date:'2026-07-12',name:'S2',net:70,goal:60,disciplines:[]}]
}; }
const period = engine.getAnalyticsPeriod('30d', {}, {today:'2026-07-13'});

test('resumo de período', () => { const a=engine.buildStrategicAnalysis(sampleState(),'30d',{}, {today:'2026-07-13'}); assert.equal(a.summary.sessions,2); assert.equal(a.summary.hours,3); assert.equal(a.summary.questionsTotal,56); });
test('comparação com período anterior sem divisão por zero enganosa', () => { const e=engine.compareAnalyticsPeriods(sampleState(), period); assert.ok(['aumento','queda','estabilidade','aumento sem percentual-base','ausência de dados suficientes'].includes(e.hours.direction)); });
test('líquido Cebraspe e brancos neutros', () => { const c=engine.calculateCebraspeStats(sampleState(), period); assert.equal(c.net, 20); });
test('disciplina forte com amostra suficiente', () => { const d=engine.calculateDisciplinePerformance(sampleState(), period); assert.ok(d.find(x=>x.discipline==='Processo Penal').isStrong); });
test('disciplina não classificada forte com amostra insuficiente', () => { const d=engine.calculateDisciplinePerformance(sampleState(), period); assert.equal(d.find(x=>x.discipline==='Direito Tributário').isStrong, false); });
test('disciplina crítica', () => { const d=engine.calculateDisciplinePerformance(sampleState(), period); assert.ok(d.find(x=>x.discipline==='Direito Tributário').isCritical); });
test('assunto negligenciado e concluído não negligenciado', () => { const n=engine.calculateSubjectNeglect(sampleState(), period); assert.ok(n.find(x=>x.subject==='Contratos')); assert.equal(Boolean(n.find(x=>x.subject==='Ação penal')), false); });
test('eficiência sem divisão por zero', () => { const e=engine.calculateStudyEfficiency({studies:[],questionLogs:[]}, period); assert.equal(e.questionsPerHour, null); });
test('dados insuficientes', () => { const a=engine.buildStrategicAnalysis({},'30d',{}, {today:'2026-07-13'}); assert.equal(a.overallSituation.classification, 'DADOS INSUFICIENTES'); });
test('simulados', () => { const m=engine.calculateMockExamStats(sampleState(), period); assert.equal(m.count,2); assert.equal(m.trend,'aumento'); });
test('metas', () => { const g=engine.calculateGoalStats(sampleState(), period); assert.equal(g.planned,3); assert.equal(g.completed,1); });
test('recomendações', () => { const a=engine.buildStrategicAnalysis(sampleState(),'30d',{}, {today:'2026-07-13'}); assert.ok(a.recommendations.highPriority.length); });
test('período personalizado', () => { const p=engine.getAnalyticsPeriod('custom',{start:'2026-07-02',end:'2026-07-04'}); assert.equal(p.days,3); });
test('nenhuma alteração do state', () => { const s=sampleState(); const before=JSON.stringify(s); const a=engine.buildStrategicAnalysis(s,'30d',{}, {today:'2026-07-13'}); assert.equal(JSON.stringify(s), before); assert.equal(a.stateUnchanged, true); });
test('nenhuma persistência indevida', () => { const src=fs.readFileSync('analytics-engine.js','utf8'); assert.equal(/localStorage|indexedDB|fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(src), false); });
test('nenhuma API externa', () => { const src=fs.readFileSync('analytics-engine.js','utf8'); assert.equal(/https?:\/\//.test(src), false); });
test('mobile sem overflow básico', () => { const css=fs.readFileSync('style.css','utf8'); assert.match(css, /@media \(max-width: 760px\)[\s\S]*strategic-analysis-grid/); });
test('paridade entre raiz e docs', () => { assert.equal(fs.readFileSync('analytics-engine.js','utf8'), fs.readFileSync('docs/analytics-engine.js','utf8')); });

function dashboardState() { return { subjects:[{id:'p',name:'Processo Penal'},{id:'c',name:'Direito Civil'}], studies:[
  {id:'st1',date:'2026-07-13T23:30:00-03:00',subjectId:'p',discipline:'Processo Penal',minutes:60,questions:5,correct:3,wrong:1,blank:1,timerSessionId:'t1'},
  {id:'st2',date:'2026-07-06',discipline:'Direito Civil',minutes:30,questions:0,correct:0,wrong:0,blank:0,timerSessionId:'t1'},
  {id:'old',date:'2026-06-10',discipline:'Processo Penal',minutes:30,questions:2,correct:2,wrong:0,blank:0}],
  questionLogs:[{id:'q1',date:'2026-07-13',discipline:'Processo Penal',total:10,correct:8,wrong:2,blank:0,board:'Cebraspe'},{id:'q2',date:'2026-07-12',discipline:'Direito Civil',questions:4,correct:1,wrong:1,blank:2}],
  simulados:[{id:'m1',date:'2026-07-11',name:'Sim 1',correct:10,wrong:4,blank:1,disciplines:[{discipline:'Processo Penal',correct:5,wrong:2,blank:0,total:7}]},{id:'m2',date:'2026-07-12',name:'Sim sem detalhe',net:7}],
  dailyGoals:[{date:'2026-07-13',discipline:'Processo Penal',minutes:45,status:'Concluída'},{date:'2026-07-12',discipline:'Direito Civil',minutes:30,status:'Pendente'}], syllabusItems:[], smartReviews:[] }; }

test('central visual: estado vazio, somente estudos, somente questões e somente simulados', () => {
  assert.equal(engine.buildPerformanceDashboard({}, '7d', {}, {today:'2026-07-14'}).summary.questions, 0);
  assert.equal(engine.buildPerformanceDashboard({studies:[{date:'2026-07-14',discipline:'A',minutes:25}]}, '7d', {}, {today:'2026-07-14'}).summary.minutes, 25);
  assert.equal(engine.buildPerformanceDashboard({questionLogs:[{date:'2026-07-14',discipline:'A',total:2,correct:1,wrong:1}]}, '7d', {}, {today:'2026-07-14'}).summary.questions, 2);
  assert.equal(engine.buildPerformanceDashboard({simulados:[{date:'2026-07-14',correct:2,wrong:1,blank:1}]}, '7d', {}, {today:'2026-07-14'}).summary.mockExams, 1);
});

test('central visual: períodos 7, 30, personalizado e filtro por disciplina', () => {
  const s=dashboardState();
  assert.equal(engine.buildPerformanceDashboard(s,'7d',{}, {today:'2026-07-14'}).period.days, 7);
  assert.equal(engine.buildPerformanceDashboard(s,'30d',{}, {today:'2026-07-14'}).period.days, 30);
  assert.equal(engine.buildPerformanceDashboard(s,'custom',{custom:{start:'2026-07-12',end:'2026-07-13'}}, {today:'2026-07-14'}).period.days, 2);
  const d=engine.buildPerformanceDashboard(s,'30d',{discipline:'Direito Civil'}, {today:'2026-07-14'});
  assert.ok(d.disciplines.every(x=>x.discipline==='Direito Civil'));
});

test('central visual: comparação, base anterior zero, líquido, percentual e brancos neutros', () => {
  const s=dashboardState(); const d=engine.buildPerformanceDashboard(s,'7d',{}, {today:'2026-07-14'});
  assert.ok(d.comparison.minutes);
  assert.equal(engine.comparePerformancePeriods({minutes:1,sessions:1,activeDays:1,questions:1,accuracyPct:50,cebraspeNet:1,goalsCompleted:1},{minutes:0,sessions:0,activeDays:0,questions:0,accuracyPct:0,cebraspeNet:0,goalsCompleted:0}).minutes.percentChange, null);
  assert.equal(d.summary.cebraspeNet, d.summary.correct - d.summary.wrong);
  assert.equal(d.summary.accuracyPct, Math.round((d.summary.correct/(d.summary.correct+d.summary.wrong))*1000)/10);
});

test('central visual: simulados com/sem detalhamento e prevenção básica de duplicidade', () => {
  const s=dashboardState(); const mocks=engine.buildMockExamEvolutionSeries(s, engine.getAnalyticsPeriod('30d',{}, {today:'2026-07-14'}));
  assert.equal(mocks.length, 2); assert.ok(mocks[0].details.length); assert.equal(mocks[1].correct, 0);
  const dup={simulados:[{id:'m1',date:'2026-07-14',correct:2,wrong:1,blank:0}], questionLogs:[{date:'2026-07-14',mockExamId:'m1',total:3,correct:2,wrong:1,blank:0}]};
  assert.equal(engine.calculateQuestionSummary(dup, engine.getAnalyticsPeriod('7d',{}, {today:'2026-07-14'})).total, 3);
});

test('central visual: datas locais, estado imutável, sem NaN/Infinity, amostra e insights', () => {
  const s=dashboardState(); const before=JSON.stringify(s); const d=engine.buildPerformanceDashboard(s,'30d',{}, {today:'2026-07-14'});
  assert.equal(JSON.stringify(s), before); assert.equal(d.stateUnchanged, true);
  assert.equal(JSON.stringify(d).includes('NaN'), false); assert.equal(JSON.stringify(d).includes('Infinity'), false);
  assert.ok(d.daily.find(x=>x.date==='2026-07-13').minutes >= 60);
  assert.ok(d.disciplines.some(x=>x.classificationStatus==='insufficient'));
  assert.ok(d.insights.length);
});

test('central visual: tabelas acessíveis e responsividade estrutural', () => {
  const js=fs.readFileSync('script.js','utf8'), css=fs.readFileSync('style.css','utf8');
  assert.match(js, /Tabela textual acessível/); assert.match(js, /aria-label/);
  assert.match(css, /max-width: 390px/); assert.match(css, /max-width: 430px/); assert.match(css, /max-width: 760px/);
});
