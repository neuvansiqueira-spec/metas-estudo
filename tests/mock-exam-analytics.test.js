const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../analytics-engine.js');
const period = { start:'2026-07-01', end:'2026-07-31', days:31 };

test('simulado detalhado entra na contagem e por disciplina entra no desempenho', () => {
  const state={studies:[],questionLogs:[],dailyGoals:[],syllabusItems:[],smartReviews:[],subjects:[],simulados:[{id:'m1',date:'2026-07-10',name:'S1',board:'Cebraspe',disciplines:[{discipline:'Penal',correct:80,wrong:20,blank:0,total:100},{discipline:'Civil',acertos:40,erros:10,brancos:0,questoes:50}]}]};
  const q=engine.calculateQuestionSummary(state,period);
  assert.equal(q.total,150); assert.equal(q.bySource.mockExams.total,150);
  const d=engine.calculateDisciplinePerformance(state,period);
  assert.equal(d.find(x=>x.discipline==='Penal').questions,100);
  assert.equal(d.find(x=>x.discipline==='Civil').questions,50);
});

test('simulado apenas com líquido não vira questões e estatística própria continua', () => {
  const state={simulados:[{id:'m1',date:'2026-07-10',net:70,goal:80}]};
  assert.equal(engine.calculateQuestionSummary(state,period).total,0);
  assert.equal(engine.calculateMockExamStats(state,period).count,1);
});

test('total ausente usa soma e total inconsistente gera alerta', () => {
  const state={simulados:[{id:'m1',date:'2026-07-10',correct:3,wrong:2,blank:1},{id:'m2',date:'2026-07-11',correct:3,wrong:2,blank:0,total:9}]};
  const q=engine.calculateQuestionSummary(state,period);
  assert.equal(q.total,15);
  assert.ok(q.dataQuality.some(x=>/incompatível/.test(x)));
});

test('simulado já lançado no Banco não duplica e vínculo explícito exclui', () => {
  const state={questionLogs:[{id:'q1',date:'2026-07-10',total:10,correct:7,wrong:3,blank:0,linkedSimuladoId:'m1'}],simulados:[{id:'m1',date:'2026-07-10',total:10,correct:7,wrong:3,blank:0},{id:'m2',date:'2026-07-11',total:10,correct:8,wrong:2,blank:0,alreadyInQuestionBank:true}]};
  const q=engine.calculateQuestionSummary(state,period);
  assert.equal(q.total,10); assert.equal(q.excludedMockExams.length,2);
});

test('maturidade usa total consolidado limitado a 200 pontos', () => {
  const analysis=engine.buildStrategicAnalysis({studies:[],questionLogs:[{date:'2026-07-01',total:30,correct:20,wrong:10}],simulados:[{date:'2026-07-02',total:240,correct:180,wrong:60}]},'custom',{start:'2026-07-01',end:'2026-07-31'},{today:'2026-07-31'});
  assert.equal(analysis.summary.questionsTotal,270);
  assert.equal(analysis.dataMaturity.components.questions.value,270);
  assert.equal(analysis.dataMaturity.components.questions.points,35);
});

test('disciplina recebe apenas simulados detalhados e banca não Cebraspe não soma líquido Cebraspe', () => {
  const state={simulados:[{date:'2026-07-10',board:'FGV',total:10,correct:8,wrong:2,blank:0},{date:'2026-07-11',board:'FGV',disciplines:[{discipline:'Admin',total:10,correct:6,wrong:4,blank:0}]}]};
  assert.equal(engine.calculateCebraspeStats(state,period).net,0);
  const d=engine.calculateDisciplinePerformance(state,period);
  assert.equal(d.find(x=>x.discipline==='Admin').questions,10);
  assert.ok(!d.find(x=>x.discipline==='Simulado — sem detalhamento por disciplina'));
});

test('normalização não altera state e registros antigos seguem legíveis', () => {
  const state={simulados:[{id:'old',data:'2026-07-10',nome:'Antigo',banca:'Cespe',acertos:1,erros:1,brancos:0}]};
  const before=JSON.stringify(state);
  const rows=engine.normalizeMockExamQuestionRows(state,period);
  assert.equal(rows[0].total,2);
  assert.equal(JSON.stringify(state),before);
});
