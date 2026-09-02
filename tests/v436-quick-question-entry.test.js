const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const api = require(path.join(root, 'quick-question-entry-v436.js'));

const HOJE = (() => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
})();

test('V436 calcula erradas, taxas e líquido a partir de total e acertos', () => {
  const { log } = api.buildLog({ discipline: 'DIREITO PENAL', subject: 'Dolo', total: 20, correct: 14, blank: 0 }, HOJE);
  assert.equal(log.total, 20);
  assert.equal(log.correct, 14);
  assert.equal(log.wrong, 6);
  assert.equal(log.accuracyRate, 70);
  assert.equal(log.errorRate, 30);
  assert.equal(log.cebraspeNet, 8, 'certas menos erradas, como o restante do app');
});

test('V436 desconta as em branco do total, sem contá-las como erro', () => {
  const { log } = api.buildLog({ subject: 'x', total: 10, correct: 6, blank: 2 }, HOJE);
  assert.equal(log.wrong, 2);
  assert.equal(log.blank, 2);
  assert.equal(log.blankRate, 20);
  assert.equal(log.cebraspeNet, 4);
});

test('V436 recusa lançamento incoerente em vez de gravar número errado', () => {
  assert.equal(api.buildLog({ subject: 'x', total: 0, correct: 0 }, HOJE).error, 'total-invalido');
  assert.equal(api.buildLog({ subject: 'x', total: 10, correct: 11 }, HOJE).error, 'acertos-acima-do-total');
  assert.equal(api.buildLog({ subject: 'x', total: 10, correct: 8, blank: 5 }, HOJE).error, 'acertos-acima-do-total');
});

test('V436 grava no formato que o app já usa em questionLogs', () => {
  const { log } = api.buildLog({ discipline: 'D', subject: 'S', total: 4, correct: 2 }, HOJE);
  for (const campo of ['id', 'date', 'discipline', 'subject', 'syllabusItemId', 'total', 'correct',
    'wrong', 'blank', 'accuracyRate', 'errorRate', 'blankRate', 'cebraspeNet', 'trainingType', 'origin']) {
    assert.ok(Object.prototype.hasOwnProperty.call(log, campo), `falta ${campo}`);
  }
  assert.equal(log.origin, 'lancamento_rapido_v436');
  assert.equal(log.date, HOJE);
});

test('V436 acrescenta ao histórico sem tocar no que já existe', () => {
  const state = { questionLogs: [{ id: 'antigo', total: 1, correct: 1 }] };
  const result = api.record(state, { subject: 'S', total: 5, correct: 3 });
  assert.equal(result.saved, true);
  assert.equal(state.questionLogs.length, 2);
  assert.equal(state.questionLogs[0].id, 'antigo', 'registro anterior intacto');
});

test('V436 cria a coleção quando ela ainda não existe', () => {
  const state = {};
  api.record(state, { subject: 'S', total: 2, correct: 2 });
  assert.equal(state.questionLogs.length, 1);
});

test('V436 não grava nada quando o lançamento é inválido', () => {
  const state = { questionLogs: [] };
  const result = api.record(state, { subject: 'S', total: 3, correct: 9 });
  assert.equal(result.saved, false);
  assert.equal(state.questionLogs.length, 0);
});

test('V436 oferece os assuntos do dia, sem repetir e sem os de outras datas', () => {
  const state = {
    dailyGoals: [
      { date: HOJE, discipline: 'D1', subject: 'Assunto A', syllabusItemId: 'a' },
      { date: HOJE, discipline: 'D1', subject: 'Assunto A', syllabusItemId: 'a' },
      { date: HOJE, discipline: 'D2', subject: 'Assunto B' },
      { date: '2020-01-01', discipline: 'D3', subject: 'Assunto antigo' },
      { date: HOJE, discipline: 'D4' }
    ]
  };
  const subjects = api.todaySubjects(state);
  assert.equal(subjects.length, 2);
  assert.deepEqual(subjects.map((entry) => entry.subject), ['Assunto A', 'Assunto B']);
  assert.equal(subjects[0].syllabusItemId, 'a', 'leva o vínculo do edital quando existe');
});

test('V436 não inventa identidade de questão', () => {
  const source = read('quick-question-entry-v436.js');
  const { log } = api.buildLog({ subject: 'S', total: 3, correct: 1 }, HOJE);
  assert.equal(log.notes, '', 'não fabrica observação');
  assert.equal(log.board, '', 'não adivinha a banca');
  assert.doesNotMatch(source, /questionBank\.push|questionErrorNotebook\.push/,
    'sem link ou enunciado não há como alimentar o caderno de erros; fabricar seria dado falso');
});

test('V436 não altera arquivos protegidos nem o bundle', () => {
  const script = read('script.js');
  assert.doesNotMatch(script, /quickQuestionEntryV436/);
  const source = read('quick-question-entry-v436.js');
  const codigo = source.split('\n').filter((linha) => !linha.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(codigo, /setInterval|MutationObserver|requestAnimationFrame/);
  assert.doesNotMatch(codigo, /localStorage|indexedDB/);
});

test('V436 mantém paridade raiz/docs e é publicado com cache-bust', () => {
  assert.equal(read('quick-question-entry-v436.js'), read('docs/quick-question-entry-v436.js'));
  const loader = read('performance-emergency-v350.js');
  assert.match(loader, /quick-question-entry-v436\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.equal(loader, read('docs/performance-emergency-v350.js'));
});
