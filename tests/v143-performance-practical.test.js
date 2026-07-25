const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const rootSource = fs.readFileSync('performance-practical-v143.js', 'utf8');
const docsSource = fs.readFileSync('docs/performance-practical-v143.js', 'utf8');
const loader = fs.readFileSync('daily-collapsibles-closed-v140.js', 'utf8');
const docsLoader = fs.readFileSync('docs/daily-collapsibles-closed-v140.js', 'utf8');
const practical = require('../performance-practical-v143.js');

const payload = {
  filters: { periodLabel: 'Últimos 30 dias', discipline: 'all' },
  summary: { minutes: 600, timeLabel: '10h', activeDays: 8, sessions: 20, questions: 60, goalsCompleted: 12 },
  questions: { correct: 42, wrong: 12, blank: 6, accuracyPct: 70 },
  disciplines: [
    { discipline: 'Direito Penal', minutes: 240, questions: 30, correct: 24, wrong: 6, blank: 0, accuracyPct: 80 },
    { discipline: 'Direito Constitucional', minutes: 120, questions: 30, correct: 18, wrong: 10, blank: 2, accuracyPct: 60 }
  ],
  plannedVsActual: [{ plannedMinutes: 900, actualMinutes: 600 }],
  daily: [{ date: '2026-07-24', minutes: 90 }, { date: '2026-07-25', minutes: 60 }],
  mockExams: []
};

test('arquivos da análise didática possuem sintaxe JavaScript válida', () => {
  assert.doesNotThrow(() => new Function(rootSource));
  assert.doesNotThrow(() => new Function(docsSource));
});

test('diagnóstico identifica avanço, atenção e próxima ação com amostra suficiente', () => {
  const result = practical.buildPracticalDiagnosis(payload);
  assert.match(result.advance, /Direito Penal/);
  assert.match(result.attention, /Direito Constitucional/);
  assert.match(result.nextAction, /revisão|questões/i);
  assert.equal(result.questionTotal, 60);
  assert.ok(result.executionPct > 66 && result.executionPct < 67);
});

test('relatório visual contém leitura prática e metodologia transparente', () => {
  const svg = practical.buildPracticalReportSvg(payload, { period: 'Últimos 30 dias' });
  assert.match(svg, /Diagnóstico em 30 segundos/);
  assert.match(svg, /Principal avanço/);
  assert.match(svg, /Principal atenção/);
  assert.match(svg, /Plano prático/);
  assert.match(svg, /Saldo A−E/);
  assert.match(svg, /pontuação oficial depende do edital/i);
  assert.match(svg, /viewBox="0 0 1600 \d+"/);
});

test('níveis de amostra são graduais e não conclusivos', () => {
  assert.equal(practical.sampleLabel(0), 'Sem amostra');
  assert.equal(practical.sampleLabel(10), 'Amostra inicial');
  assert.equal(practical.sampleLabel(30), 'Amostra em formação');
  assert.equal(practical.sampleLabel(60), 'Amostra mais consistente');
});

test('rótulos deixam de presumir que todo resultado é líquido Cebraspe', () => {
  assert.equal(practical.saferLabels('Líquido Cebraspe'), 'Saldo A−E (comparativo)');
  assert.equal(practical.saferLabels('Questões e desempenho Cebraspe'), 'Questões e desempenho');
  assert.match(practical.enhanceCsv('Líquido Cebraspe;Líquido;'), /Saldo A-E/);
});

test('implementação não altera persistência, sincronização ou registros', () => {
  assert.doesNotMatch(rootSource, /localStorage|indexedDB|saveData\s*\(|autoSyncAfterSave|replaceState/i);
  assert.doesNotMatch(docsSource, /localStorage|indexedDB|saveData\s*\(|autoSyncAfterSave|replaceState/i);
});

test('carregadores raiz e docs usam a mesma versão com cache separado', () => {
  const expected = /performance-practical-v143\.js\?v=20260725-analise-didatica-pratica-v143/;
  assert.match(loader, expected);
  assert.match(docsLoader, expected);
  assert.equal(loader, docsLoader);
});