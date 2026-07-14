const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const style = fs.readFileSync('style.css', 'utf8');
const forbiddenLeiRecorteText = ['Se não houver', 'trabalhe a lei amplamente'].join(', ');
const requiredLeiRecorteText = 'RECORTE: trabalhe somente os artigos e temas expressamente indicados. Se o recorte não estiver cadastrado ou estiver impreciso, interrompa a geração e solicite confirmação. Somente trabalhe a lei integralmente quando houver autorização expressa do usuário.';

function projectFiles(dir = '.') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = dir === '.' ? entry.name : `${dir}/${entry.name}`;
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    if (entry.isDirectory()) return projectFiles(path);
    return [path];
  });
}


test('Aplicar incidências lê textarea, atualiza somente edital existente e renderiza relatório', () => {
  assert.match(html, /id="incidenceTableInput"/);
  assert.match(html, /id="applyIncidenceTableButton"[^>]*type="button"/);
  assert.match(script, /function applyIncidenceTable\(rawText\)/);
  assert.match(script, /if \(!state\.syllabusItems\.length\) \{/);
  assert.match(script, /Não há edital verticalizado importado\. Importe o edital antes de aplicar incidências\./);
  assert.match(script, /existingSyllabusDisciplinesForIncoming\(disciplinaRaw\)/);
  assert.doesNotMatch(script, /existingDisciplinesForIncoming\(disciplinaRaw\)/);
  assert.match(script, /item\.weight = normalizeSubjectIncidence\(valor\)/);
  assert.match(script, /item\.priority = normalizeImportedPriority\(prioridadeRaw\)/);
  assert.match(script, /Incidências aplicadas: \$\{report\.assuntosAtualizados\.length\} assuntos atualizados; \$\{report\.disciplinasAtualizadas\.length\} disciplinas atualizadas; \$\{notFound\.length\} não encontrados\./);
  assert.match(script, /const report = applyIncidenceTable\(elements\.incidenceTableInput\.value\);[\s\S]*saveData\(\);[\s\S]*render\(\);[\s\S]*renderIncidenceReport\(report\);/);
  assert.match(script, /elements\.applyIncidenceTableButton\?\.addEventListener\("click", handleApplyIncidenceTable\)/);
  assert.match(script, /const allowed = \["Altíssima", "Muito alta", "Alta", "Média", "Baixa", "Baixíssima"\]/);
  assert.match(script, /itemSubjectKey === subjectKey \|\| itemSubjectKey\.includes\(subjectKey\) \|\| subjectKey\.includes\(itemSubjectKey\)/);
});


test('Aplicar incidências atualiza assuntos por correspondência parcial e mantém prioridades máximas', () => {
  const logicStart = script.indexOf('function normalizeText(value)');
  const logicEnd = script.indexOf('function normalizeImportedDomain(value)');
  assert.notEqual(logicStart, -1);
  assert.notEqual(logicEnd, -1);
  const state = {
    disciplineWeights: {},
    syllabusItems: [
      { discipline: 'Direito Processual Penal', subject: '2.1 Princípios Fundamentais do Processo Penal', weight: 1, priority: 'Média' },
      { discipline: 'Direito Processual Penal', subject: '2.2 Inquérito Policial', weight: 1, priority: 'Média' },
      { discipline: 'Direito Penal', subject: '1.1 Teoria Geral do Crime', weight: 1, priority: 'Média' },
    ],
  };
  const makeLogic = new Function('state', `${script.slice(logicStart, logicEnd)}; return { applyIncidenceTable, renderIncidenceReport, normalizeImportedPriority };`);
  const { applyIncidenceTable, normalizeImportedPriority } = makeLogic(state);

  const report = applyIncidenceTable(`TIPO;DISCIPLINA;ASSUNTO;VALOR;PRIORIDADE
ASSUNTO;Direito Processual Penal;Princípios Fundamentais do Processo Penal;4;Alta
ASSUNTO;Direito Processual Penal;Inquérito Policial;5;Muito alta
ASSUNTO;Direito Penal;Teoria Geral do Crime;5;Altíssima`);

  assert.equal(report.assuntosAtualizados.length, 3);
  assert.equal(report.assuntosNaoEncontrados.length, 0);
  assert.equal(state.syllabusItems[0].weight, 4);
  assert.equal(state.syllabusItems[1].weight, 5);
  assert.equal(state.syllabusItems[2].weight, 5);
  assert.equal(state.syllabusItems[1].priority, 'Muito alta');
  assert.equal(state.syllabusItems[2].priority, 'Altíssima');
  assert.equal(normalizeImportedPriority('Baixíssima'), 'Baixíssima');
});

test('Calendário de Metas usa incidências novas e duração mínima/máxima de metas', () => {
  assert.match(script, /\{ value: 18, label: "Altíssima" \}/);
  assert.match(script, /\{ value: 14, label: "Peças" \}/);
  assert.match(script, /\{ value: 12, label: "Muito alta" \}/);
  assert.match(script, /\{ value: 7, label: "Alta" \}/);
  assert.match(script, /\{ value: 3, label: "Média" \}/);
  assert.match(script, /\["direito penal"\], weight: 18/);
  assert.match(script, /\["peça para delegado de polícia civil", "peca para delegado de policia civil"\], weight: 14/);
  assert.match(script, /\["direito constitucional"\], weight: 12/);
  assert.match(script, /\["direito administrativo"\], weight: 7/);
  assert.match(script, /state\.disciplineWeights\[d\]=normalizeDisciplineWeight\(event\.target\.value, d\)/);
  assert.match(script, /"Estudo novo": 60, "Questões": 45, "Revisão": 30, "Reforço": 45/);
  assert.match(script, /Math\.max\(30, Math\.round\(baseMinutes \* factor\)\)/);
  assert.match(script, /dayType === "folga" \|\| dayType === "estudo forte" \? 90 : Infinity/);
});

test('Plano do Dia separa tempo de estudo e questões sem concluir automaticamente', () => {
  assert.match(script, /function normalizeGoalTimeFields\(goal\)/);
  assert.match(script, /goal\.studyActualMinutes = hasStudyActual \? Number\(goal\.studyActualMinutes\) \|\| 0 : legacyActual/);
  assert.match(script, /goal\.questionActualMinutes = hasQuestionActual \? Number\(goal\.questionActualMinutes\) \|\| 0 : 0/);
  assert.match(script, /goal\.actualMinutes = goal\.studyActualMinutes \+ goal\.questionActualMinutes/);
  assert.match(script, /Registrar estudo/);
  assert.match(script, /Tempo de questões/);
  assert.match(script, /Estudo realizado: \$\{Number\(goal\.studyActualMinutes\|\|0\)\} min/);
  assert.match(script, /Questões realizadas: \$\{Number\(goal\.questionActualMinutes\|\|0\)\} min/);
  assert.match(script, /Total realizado: \$\{Number\(goal\.actualMinutes\|\|0\)\} min/);
  assert.match(script, /registerGoalTime\(goal, "study"\)/);
  assert.match(script, /registerGoalTime\(goal, "questions"\)/);
  assert.doesNotMatch(script, /Deseja concluir esta meta agora/);
});

test('Prompt completo do módulo Lei exige recorte expresso e não autoriza lei ampla sem confirmação', () => {
  assert.match(script, new RegExp(requiredLeiRecorteText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(docsScript, new RegExp(requiredLeiRecorteText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const filesWithForbiddenText = projectFiles()
    .filter((path) => fs.statSync(path).isFile())
    .filter((path) => fs.readFileSync(path, 'utf8').includes(forbiddenLeiRecorteText));
  assert.deepEqual(filesWithForbiddenText, []);
});

test('Exportação de desempenho possui arquitetura, UI acessível e paridade raiz/docs', () => {
  assert.match(html, /id="performanceExportButton"[^>]*>Exportar/);
  assert.match(html, /id="performanceExportDialog"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /data-performance-export="pdf"/);
  assert.match(html, /data-performance-export="png"/);
  assert.match(html, /data-performance-export="csv"/);
  assert.match(script, /function buildPerformanceExportPayload\(dashboard, filters/);
  assert.match(script, /function buildPerformanceCsv\(payload\)/);
  assert.match(script, /function buildChartSvg\(chartType, data, metadata/);
  assert.match(script, /function svgToPngBlob\(svg, options/);
  assert.match(script, /function downloadGeneratedFile\(blob, filename\)/);
  assert.match(script, /function shareGeneratedFile\(blob, filename, mimeType\)/);
  assert.match(script, /function openPerformancePrintView\(payload\)/);
  assert.match(script, /function formatExportDuration\(minutes/);
  assert.match(script, /function sanitizeExportFilename\(value\)/);
  assert.match(docsScript, /function buildPerformanceExportPayload\(dashboard, filters/);
});

test('Exportação respeita filtros e preserva dados consolidados sem duplicar ou alterar estado', () => {
  const start = script.indexOf('function formatExportDuration(minutes');
  const end = script.indexOf('function setPerformanceExportStatus');
  const makeLogic = new Function('formatDateBR', 'escapeHTML', `${script.slice(start, end)}; return { buildPerformanceExportPayload, buildPerformanceCsv, buildChartSvg, formatExportDuration, sanitizeExportFilename };`);
  const logic = makeLogic((d) => `BR:${d}`, (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;'));
  const dashboard = { summary: { timeLabel: '55 min', questions: 3 }, comparison: {}, daily: [{ date: '2026-07-14', minutes: 55, questions: 3 }], questions: { correct: 2, wrong: 1, blank: 0, cebraspeNet: 1 }, disciplines: [{ discipline: 'Direito Processual Penal com Nome Muito Longo', minutes: 55, questions: 3, correct: 2, wrong: 1, blank: 0, net: 1 }], mockExams: [], plannedVsActual: [{ date: '2026-07-14', plannedMinutes: 80, actualMinutes: 55, plannedGoals: 2, completedGoals: 1 }], insights: ['Amostra insuficiente'] };
  const before = JSON.stringify(dashboard);
  const payload = logic.buildPerformanceExportPayload(dashboard, { mode: '30d', discipline: 'Direito Processual Penal', origin: 'questões' }, { dataMaturity: { label: 'Inicial' } });
  assert.equal(payload.filters.mode, '30d');
  assert.equal(payload.filters.discipline, 'Direito Processual Penal');
  assert.equal(payload.filters.origin, 'questões');
  assert.equal(payload.summary.questions, 3);
  assert.equal(payload.daily.length, 1);
  assert.equal(JSON.stringify(dashboard), before);
  const csv = logic.buildPerformanceCsv(payload);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /TIPO_DE_REGISTRO;CAMPO_1/);
  assert.match(csv, /DISCIPLINA;Direito Processual Penal/);
  assert.match(csv, /55 min/);
  assert.doesNotMatch(csv, /0\.92/);
});

test('CSV, nomes, duração, SVG e rótulos longos seguem requisitos de exportação', () => {
  const start = script.indexOf('function formatExportDuration(minutes');
  const end = script.indexOf('function setPerformanceExportStatus');
  const logic = new Function('formatDateBR', 'escapeHTML', `${script.slice(start, end)}; return { buildPerformanceCsv, buildChartSvg, formatExportDuration, sanitizeExportFilename };`)((d) => d, (v) => String(v));
  assert.equal(logic.formatExportDuration(55), '55 min');
  assert.equal(logic.formatExportDuration(80), '1h 20min');
  assert.equal(logic.sanitizeExportFilename('Direito Processual Penal: 30 dias?.csv'), 'direito-processual-penal-30-dias.csv');
  const csv = logic.buildPerformanceCsv({ summary: { observacao: 'acentuação "ok"\nlinha' }, daily: [], disciplines: [], questions: {}, mockExams: [], plannedVsActual: [] });
  assert.match(csv, /acentuação/);
  assert.match(csv, /"acentuação ""ok""\nlinha"/);
  const svg = logic.buildChartSvg('daily', [{ date: '2026-07-14', minutes: 55 }], { title: 'Evolução diária', period: '30d', discipline: 'Todas', origin: 'Consolidado' });
  assert.match(svg, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(svg, /<svg[^>]*viewBox=/);
  assert.match(svg, /fill="#fff"/);
  assert.match(svg, /Evolução diária/);
  assert.match(svg, /Legenda:/);
  assert.match(style, /overflow-wrap: break-word/);
  assert.match(style, /word-break: normal/);
});

test('Exportação cobre gráficos individuais, PDF, compartilhamento, clique duplicado e responsividade', () => {
  ['daily','questions','disciplines','mocks','planned','hours','net'].forEach((type) => assert.match(script, new RegExp(`data-chart-export="${type}"|chartRowsForType[\\s\\S]*${type}`)));
  assert.match(script, /aria-label="Exportar gráfico Evolução diária"/);
  assert.match(script, /navigator\.canShare\?\.\(\{ files:/);
  assert.match(script, /downloadGeneratedFile\(blob, filename\)/);
  assert.match(script, /if \(button\?\.disabled\) return/);
  assert.match(script, /Preparando arquivo…/);
  assert.match(script, /Arquivo preparado\./);
  assert.match(script, /window\.print\(\)/);
  assert.match(style, /@media print/);
  assert.match(style, /break-inside: avoid/);
  assert.match(style, /header, nav, \.mobile-quick-nav, \.floating-timer/);
  assert.match(style, /@media \(max-width: 760px\)/);
  assert.match(style, /env\(safe-area-inset-bottom\)/);
  const exportArea = script.slice(script.indexOf('20260714-exportacao-desempenho-v1'), script.indexOf('let advisorConversation'));
  assert.equal(exportArea.includes('alert('), false);
  assert.equal(exportArea.includes('prompt('), false);
  assert.equal(exportArea.includes('confirm('), false);
});
