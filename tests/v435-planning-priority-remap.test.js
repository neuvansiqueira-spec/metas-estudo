const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const api = require(path.join(root, 'planning-priority-remap-v435.js'));

const SOURCE = 'simulado-informado-2026-07-26';
const semente = (syllabusItemId) => ({ syllabusItemId, label: 'x', wrong: 1, correct: 0, source: SOURCE });

function baseState(overrides = {}) {
  return {
    planning: {
      topicPrioritySignalsV155: {
        // Estado real do usuário: os quatro sinais existem e apontam errado.
        'law-9605-environmental': semente('drogas-1'),
        'law-14133-procurement': semente('adm-contratos'),
        'police-inquiry-archiving': semente('inquerito-1'),
        'human-rights-global-system': semente('interamericano-1'),
        ...(overrides.signals || {})
      }
    },
    syllabusItems: [
      { id: 'amb-1', discipline: 'DIREITO AMBIENTAL', subject: 'Crimes e infrações administrativas contra o meio ambiente (Lei nº 9.605/1998)' },
      { id: 'adm-1', discipline: 'DIREITO ADMINISTRATIVO', subject: 'Licitações: modalidades e procedimentos' },
      { id: 'adm-contratos', discipline: 'DIREITO ADMINISTRATIVO', subject: 'Licitações e Contratos Administrativos' },
      { id: 'drogas-1', discipline: 'LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL', subject: 'Lei nº 11.343/2006' },
      { id: 'inquerito-1', discipline: 'DIREITO PROCESSUAL PENAL', subject: 'Inquérito Policial' },
      { id: 'interamericano-1', discipline: 'DIREITOS HUMANOS', subject: 'Sistema interamericano de proteção dos Direitos Humanos' },
      ...(overrides.items || [])
    ]
  };
}

test('V435 reaponta a prioridade da 9.605, que apontava para a lei de drogas', () => {
  const state = baseState();
  const result = api.apply(state);
  const signal = state.planning.topicPrioritySignalsV155['law-9605-environmental'];
  assert.equal(signal.syllabusItemId, 'amb-1');
  assert.equal(signal.previousSyllabusItemId, 'drogas-1', 'guarda de onde veio, para auditoria');
  assert.ok(result.report.repointed.some((entry) => entry.key === 'law-9605-environmental'));
});

test('V435 reaponta a 14.133 para o assunto escolhido pelo usuário', () => {
  const state = baseState();
  api.apply(state);
  assert.equal(state.planning.topicPrioritySignalsV155['law-14133-procurement'].syllabusItemId, 'adm-1',
    'modalidades e procedimentos, não o de contratos');
});

test('V435 remove a prioridade do arquivamento do inquérito', () => {
  const state = baseState();
  const result = api.apply(state);
  assert.equal(state.planning.topicPrioritySignalsV155['police-inquiry-archiving'], undefined);
  assert.ok(result.report.removed.some((entry) => entry.key === 'police-inquiry-archiving'));
});

test('V435 remove o sistema global, que duplicava o peso do interamericano', () => {
  const state = baseState({
    signals: { 'human-rights-interamerican-system': semente('interamericano-1') }
  });
  api.apply(state);
  const signals = state.planning.topicPrioritySignalsV155;
  assert.equal(signals['human-rights-global-system'], undefined);
  assert.ok(signals['human-rights-interamerican-system'], 'o interamericano permanece, contado uma vez');
  const apontando = Object.values(signals).filter((s) => s.syllabusItemId === 'interamericano-1');
  assert.equal(apontando.length, 1, 'dois sinais no mesmo assunto dobravam o peso');
});

test('V435 nunca toca em sinal que o usuário movimentou', () => {
  const state = baseState({
    signals: {
      'law-9605-environmental': { syllabusItemId: 'drogas-1', label: 'x', wrong: 5, correct: 2, source: SOURCE },
      'police-inquiry-archiving': { syllabusItemId: 'inquerito-1', label: 'x', wrong: 3, correct: 1, source: SOURCE }
    }
  });
  const result = api.apply(state);
  assert.equal(state.planning.topicPrioritySignalsV155['law-9605-environmental'].wrong, 5);
  assert.ok(state.planning.topicPrioritySignalsV155['police-inquiry-archiving'], 'não remove o que virou dado do usuário');
  assert.ok(result.report.preserved.includes('law-9605-environmental'));
  assert.ok(result.report.preserved.includes('police-inquiry-archiving'));
});

test('V435 reconhece semente intocada apenas com source e contagem originais', () => {
  assert.equal(api.isUntouchedSeed({ source: SOURCE, wrong: 1, correct: 0 }), true);
  assert.equal(api.isUntouchedSeed({ source: SOURCE, wrong: 2, correct: 0 }), false);
  assert.equal(api.isUntouchedSeed({ source: 'outro', wrong: 1, correct: 0 }), false);
  assert.equal(api.isUntouchedSeed(null), false);
});

test('V435 não reaponta quando há mais de um candidato', () => {
  const state = baseState({
    items: [{ id: 'adm-2', discipline: 'DIREITO ADMINISTRATIVO', subject: 'Licitações: modalidades e procedimentos (revisão)' }]
  });
  const result = api.apply(state);
  assert.ok(result.report.ambiguous.includes('law-14133-procurement'));
  assert.equal(state.planning.topicPrioritySignalsV155['law-14133-procurement'].syllabusItemId, 'adm-contratos',
    'na dúvida, não mexe: apontar para o errado é o defeito que este módulo corrige');
});

test('V435 vincula por disciplina e assunto, sem id embutido', () => {
  const source = read('planning-priority-remap-v435.js');
  assert.doesNotMatch(source, /525303c0|c477cffe|4b03d2d4|ba2e8e43/, 'ids do usuário não podem estar no código');
  const state = baseState();
  state.syllabusItems[0].id = 'id-trocado';
  api.apply(state);
  assert.equal(state.planning.topicPrioritySignalsV155['law-9605-environmental'].syllabusItemId, 'id-trocado');
});

test('V435 é idempotente', () => {
  const state = baseState();
  api.apply(state);
  const snapshot = JSON.stringify(state.planning.topicPrioritySignalsV155);
  const again = api.apply(state);
  assert.equal(again.repeated, true);
  assert.equal(JSON.stringify(state.planning.topicPrioritySignalsV155), snapshot);
});

test('V435 registra no código o motivo de cada exclusão', () => {
  const source = read('planning-priority-remap-v435.js');
  assert.match(source, /espécie de Inquérito Policial/);
  assert.match(source, /duplica o peso do sistema interamericano/);
  assert.equal(api.removals.length, 2);
  assert.equal(api.repoints.length, 2);
});

test('V435 não altera script.js, protegido pela trava de escopo', () => {
  const script = read('script.js');
  assert.doesNotMatch(script, /planningPriorityRemapV435/);
  assert.match(script, /const INITIAL_WRONG_TOPICS_V155 = Object\.freeze/);
});

test('V435 não introduz polling nem escrita fora do fluxo', () => {
  const source = read('planning-priority-remap-v435.js');
  const codigo = source.split('\n').filter((linha) => !linha.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(codigo, /setInterval|setTimeout|requestAnimationFrame|MutationObserver/);
  assert.doesNotMatch(codigo, /localStorage|indexedDB/);
  assert.equal((codigo.match(/saveData\(\)/g) || []).length, 1);
});

test('V435 mantém paridade raiz/docs e é publicado com cache-bust', () => {
  assert.equal(read('planning-priority-remap-v435.js'), read('docs/planning-priority-remap-v435.js'));
  const loader = read('performance-emergency-v350.js');
  assert.match(loader, /planning-priority-remap-v435\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.equal(loader, read('docs/performance-emergency-v350.js'));
});
