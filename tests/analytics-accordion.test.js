const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const engine = require('../analytics-engine.js');

const script = fs.readFileSync('script.js','utf8');
const html = fs.readFileSync('index.html','utf8');
const style = fs.readFileSync('style.css','utf8');
const sw = fs.readFileSync('service-worker.js','utf8');
const version = '20260716-sync-inicial-sem-dados-antigos-v1';

function logic(){
  const start = script.indexOf('function formatExportDuration(minutes');
  const end = script.indexOf('let performanceExportEventsInitialized');
  return new Function('formatDateBR','escapeHTML','sessionStorage','matchMedia', `${script.slice(start,end)}; return {traduzirRotuloAnalise, renderAnalyticsSummary, renderRhythmSection, renderQuestionsSection, renderDisciplinePerformancePanel, renderMockEvolutionChart, renderPlannedVsActualChart, renderDetailedDiagnosis, renderAnalyticsQualityDetails, renderAnalyticsHeader, renderAnalyticsComparison, sortedDisciplines};`)(d=>String(d).split('-').reverse().join('/'), v=>String(v).replace(/[&<>]/g,''), {getItem(){return ''},setItem(){}}, ()=>({matches:false}));
}
function visibleText(markup){ return markup.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<style[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }
const dashboard = {
  summary:{timeLabel:'3h 20min', minutes:200, activeDays:5, sessions:4, questions:80, accuracyLabel:'74%', accuracyPct:74, cebraspeNet:72, goalsCompleted:3, mockExams:2},
  comparison:{minutes:{current:200, previous:160, delta:40}, accuracyPct:{current:74, previous:71, delta:3}},
  daily:[{date:'2026-07-13', minutes:80, questions:20},{date:'2026-07-14', minutes:120, questions:30}],
  questions:{correct:60, wrong:10, blank:10, accuracyPct:85.7, cebraspeNet:50},
  disciplines:[{discipline:'Zeta', minutes:30, questions:10, correct:8, wrong:2, blank:0, accuracyPct:80, net:6},{discipline:'Alfa', minutes:90, questions:40, correct:30, wrong:8, blank:2, accuracyPct:78.9, net:22}],
  mockExams:[{date:'2026-07-10', name:'S1', net:10},{date:'2026-07-14', name:'S2', net:20}],
  plannedVsActual:[{plannedMinutes:120, actualMinutes:90, plannedGoals:2, completedGoals:1}]
};
const maturity = {score:42,label:'Base em desenvolvimento',explanation:'Sinais iniciais.',nextMilestones:['registrar mais 35 questões.']};
const analysis = {overallSituation:{classification:'Sinais iniciais', explanation:'A regularidade melhorou, mas a amostra ainda pede cautela.'}, strongDisciplines:[], criticalDisciplines:[], neglectedSubjects:[], efficiency:{warning:'Eficiência é complementar.'}, recommendations:{highPriority:['Priorize constância.'], prioritySubjects:[], maintenance:[]}, dataQuality:{disciplinesWithoutEntries:[],questionsWithoutDiscipline:0,mockExamsWithoutResult:0}};

test('acordeão renderizado abre resumo geral e fecha demais seções principais', () => {
  const l=logic();
  const out = [l.renderAnalyticsSummary(dashboard,maturity), l.renderRhythmSection(dashboard), l.renderQuestionsSection(dashboard), l.renderDisciplinePerformancePanel(dashboard.disciplines), l.renderMockEvolutionChart(dashboard.mockExams), l.renderPlannedVsActualChart(dashboard.plannedVsActual), l.renderDetailedDiagnosis(analysis), l.renderAnalyticsQualityDetails(analysis)].join('');
  assert.match(out, /<details class="analytics-section"[^>]+data-analytics-section="resumo"[^>]+open/);
  assert.match(out, /<summary class="analytics-section-summary"><span class="analytics-section-heading"><strong class="analytics-section-title">Ritmo e constância<\/strong><small class="analytics-section-resume">5 dias ativos • 3h 20min<\/small><\/span><span class="analytics-section-chevron" aria-hidden="true">›<\/span><\/summary>/);
  assert.equal((out.match(/<details class="analytics-section"/g)||[]).length, 8);
  assert.equal((out.match(/data-analytics-section="(?!resumo)[^"]+"[^>]* open/g)||[]).length, 0);
});

test('filtros são details e datas personalizadas ficam escondidas fora de personalizado', () => {
  assert.match(html, /<details class="analytics-filters-section"><summary>Filtros da análise<\/summary><form id="analyticsPeriodForm"/);
  assert.match(html, /data-analytics-custom-date hidden>Início/);
  assert.match(script, /value==='custom'/);
});

test('português visível, origem consolidada traduzida e chaves internas não vazam', () => {
  const l=logic();
  assert.equal(l.traduzirRotuloAnalise('consolidated'), 'Consolidado');
  const text = visibleText(l.renderAnalyticsHeader({periodLabel:'15/06/2026 a 14/07/2026', filters:{discipline:'all', origin:'consolidated'}}) + l.renderAnalyticsSummary(dashboard,maturity));
  assert.match(text, /Origem: Consolidado/);
  for (const forbidden of ['consolidated','minutes','sessions','activeDays','accuracyPct','cebraspeNet','goalsCompleted','current','previous','delta','trend','undefined','null','NaN','Infinity']) assert.doesNotMatch(text, new RegExp(`\\b${forbidden}\\b`));
});

test('comparação usa minutes e accuracyPct e ausência de base não vira estabilidade', () => {
  const l=logic();
  const out = l.renderAnalyticsComparison({ minutes:{current:200, previous:160, delta:40}, accuracyPct:{current:74, previous:71, delta:3}, questions:{current:10} });
  assert.match(out, /Tempo estudado/);
  assert.match(out, /Aumento de 40 min/);
  assert.match(out, /Percentual de acerto/);
  assert.match(out, /Aumento de 3% pontos percentuais/);
  assert.match(out, /Não há dados suficientes no período anterior/);
  assert.doesNotMatch(out, /estabilidade/i);
});

test('ordenação funcional por questões, tempo, líquido e alfabética', () => {
  const l=logic(), rows=dashboard.disciplines;
  assert.equal(l.sortedDisciplines(rows,'questions-desc')[0].discipline, 'Alfa');
  assert.equal(l.sortedDisciplines(rows,'minutes-desc')[0].discipline, 'Alfa');
  assert.equal(l.sortedDisciplines(rows,'net-desc')[0].discipline, 'Alfa');
  assert.equal(l.sortedDisciplines(rows,'alphabetical')[0].discipline, 'Alfa');
});

test('gráfico novo usa SVG real e gráfico antigo com botões foi removido da análise', () => {
  const out = logic().renderRhythmSection(dashboard);
  assert.match(out, /<svg class="analytics-svg-chart" viewBox=/);
  assert.match(out, /<(path|polyline) /);
  assert.doesNotMatch(out, /<button[^>]+class="performance-line-point"/);
  assert.doesNotMatch(style, /\.performance-line-point/);
});

test('mês atual e todo o histórico são respeitados pelo motor', () => {
  const state={subjects:[], studies:[{date:'2026-06-01',minutes:30},{date:'2026-07-01',minutes:60}], questionLogs:[], dailyGoals:[], syllabusItems:[], smartReviews:[], simulados:[]};
  const month=engine.buildStrategicAnalysis(state,'month',{}, {today:'2026-07-14', state});
  const all=engine.buildStrategicAnalysis(state,'all',{}, {today:'2026-07-14', state});
  assert.equal(month.period.start, '2026-07-01');
  assert.equal(all.period.start, '2026-06-01');
});

test('exportar gráfico escolhe somente um formato', () => {
  const body = script.slice(script.indexOf('async function handleChartExportAction'), script.indexOf('function setupPerformanceExportControls'));
  assert.match(body, /data-chart-format="png"/);
  assert.match(body, /data-chart-format="svg"/);
  assert.match(body, /data-chart-format="csv"/);
  assert.match(body, /if \(format === 'svg'\)/);
  assert.match(body, /if \(format === 'png'\)/);
  assert.match(body, /if \(format === 'csv'\)/);
});

test('versão, cache, raiz e docs sincronizados', () => {
  assert.match(fs.readFileSync('package.json','utf8'), new RegExp(version));
  assert.match(html, new RegExp(`style\\.css\\?v=${version}`));
  assert.match(html, new RegExp(`script\\.js\\?v=${version}`));
  assert.match(sw, new RegExp(`CACHE_NAME = "metas-estudo-${version}"`));
  for (const f of ['script.js','style.css','analytics-engine.js','index.html','service-worker.js']) assert.equal(fs.readFileSync(f,'utf8'), fs.readFileSync('docs/'+f,'utf8'));
});

test('celular fecha outras seções principais e preserva sessão visual sem state', () => {
  assert.match(script, /matchMedia\('\(max-width: 767px\)'\)\.matches/);
  assert.match(script, /sessionStorage\.setItem\('analytics-open-sections'/);
  assert.doesNotMatch(script, /state\.analytics-open-sections|state\.analyticsSections/);
});


test('hotfix mobile mantém acordeões da análise em coluna única e textos legíveis', () => {
  const out = logic().renderQuestionsSection(dashboard);
  assert.match(out, /<summary class="analytics-section-summary"><span class="analytics-section-heading"><strong class="analytics-section-title">Questões e desempenho Cebraspe<\/strong><small class="analytics-section-resume">80 questões • líquido 50<\/small><\/span><span class="analytics-section-chevron" aria-hidden="true">›<\/span><\/summary>/);
  assert.match(style, /#analyticsContent,[\s\S]*?#view-analise-estrategica \.strategic-analysis-grid \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);[\s\S]*?width: 100%;[\s\S]*?max-width: 100%;/);
  assert.match(style, /#view-analise-estrategica \.analytics-section \{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?width: 100%;/);
  assert.match(style, /\.analytics-section-heading \{[\s\S]*?display: grid;[\s\S]*?gap: 4px;/);
  assert.match(style, /\.analytics-section-title \{[\s\S]*?word-break: normal;[\s\S]*?overflow-wrap: normal;[\s\S]*?hyphens: none;/);
  assert.doesNotMatch(style, /\.analytics-section-title \{[\s\S]*?overflow-wrap: anywhere;[\s\S]*?\}/);
  assert.match(style, /@media \(max-width: 768px\) \{[\s\S]*?#analyticsContent \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) !important;[\s\S]*?gap: 10px;/);
  assert.match(style, /footer \{[\s\S]*?padding-bottom: calc\(110px \+ env\(safe-area-inset-bottom, 0px\)\);/);
});

test('hotfix mobile possui paridade entre raiz e docs', () => {
  for (const f of ['script.js','style.css','index.html','service-worker.js']) assert.equal(fs.readFileSync(f,'utf8'), fs.readFileSync('docs/'+f,'utf8'));
});
