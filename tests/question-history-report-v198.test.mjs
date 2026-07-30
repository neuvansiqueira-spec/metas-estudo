import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = ['question-history-report-core-v198.js','question-history-report-export-v198.js','question-history-report-ui-v198.js'].map(name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8')).join('\n');
const context = { console, setTimeout, clearTimeout, globalThis: null };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context);
const api = context.AldusQuestionHistoryFilterExportV198;

const sampleState = {
  questionErrorNotebook: [{ id: 'Q2' }],
  questionBankSessions: [{
    id: 's1', createdAt: '2026-07-30T12:00:00Z', sourceType: 'qconcursos-json',
    items: [
      { id: 'Q1', disciplina: 'Direitos Humanos', assunto: 'Sistema Interamericano', banca: 'FGV', status: 'certo', enunciado: 'Questão correta', resposta_marcada: 'A', gabarito: 'A' },
      { id: 'Q2', disciplina: 'Direitos Humanos', assunto: 'Sistema Interamericano', banca: 'FGV', status: 'errado', enunciado: 'Questão errada', resposta_marcada: 'B', gabarito: 'C' },
      { id: 'Q3', disciplina: 'Direito Penal', assunto: 'Crimes', banca: 'Cebraspe', status: 'branco', enunciado: 'Questão em branco' },
      { id: 'Q4', disciplina: 'Direito Penal', assunto: 'Crimes', banca: 'Cebraspe', status: 'duvida', enunciado: 'Questão em dúvida' }
    ]
  }],
  questionLogs: [{ id: 'm1', date: '2026-07-29', discipline: 'Processo Penal', subject: 'Princípios', board: 'FGV', total: 10, correct: 7, wrong: 2, blank: 1, minutes: 20, origin: 'manual', notes: 'Sessão manual' }]
};

test('coleta questões individuais e sessões manuais sem perder totais', () => {
  const rows = api.collectRowsFromState(sampleState);
  assert.equal(rows.length, 5);
  const summary = api.summarize(rows);
  assert.deepEqual({ total: summary.total, correct: summary.correct, wrong: summary.wrong, blank: summary.blank, doubt: summary.doubt, net: summary.net }, { total: 14, correct: 8, wrong: 3, blank: 2, doubt: 1, net: 5 });
});

test('aplica filtros combinados de disciplina, resultado, banca, busca e caderno', () => {
  const rows = api.collectRowsFromState(sampleState);
  assert.equal(api.applyFilters(rows, { discipline: 'Direitos Humanos', result: 'errado', board: 'FGV', notebookOnly: true }).length, 1);
  assert.equal(api.applyFilters(rows, { query: 'em dúvida' }).length, 1);
  assert.equal(api.applyFilters(rows, { startDate: '2026-07-30', endDate: '2026-07-30' }).length, 4);
});

test('gera agrupamentos e relatório Excel em CSV estruturado', () => {
  const rows = api.collectRowsFromState(sampleState);
  const groups = api.groupRows(rows, 'discipline');
  assert.equal(groups[0].total, 10);
  const csv = api.buildCsv({ rows, filters: { board: 'FGV' }, summary: api.summarize(rows) });
  assert.match(csv, /RELATÓRIO DE DESEMPENHO/);
  assert.match(csv, /POR DISCIPLINA/);
  assert.match(csv, /QUESTÕES E SESSÕES FILTRADAS/);
  assert.match(csv, /Q2/);
});

test('gera SVG de imagem com resumo e detalhes', () => {
  const rows = api.collectRowsFromState(sampleState);
  const svg = api.buildReportSvg({ rows, filters: {}, summary: api.summarize(rows) });
  assert.match(svg, /^<svg/);
  assert.match(svg, /Relatório de Questões/);
  assert.match(svg, /DIREITOS HUMANOS|Direitos Humanos/i);
  assert.match(svg, /QUESTÕES/);
});
