const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const script = fs.readFileSync('script.js', 'utf8');

function planningContextFor(state) {
  const start = script.indexOf('function planningDisciplineSubjectKey');
  const end = script.indexOf('function goalTypeForPlanningItem', start);
  const source = script.slice(start, end);
  return new Function('state', 'canonical', 'materialAvailable', 'validEstimatedMinutes', 'goalTotalActualMinutes', 'completedStatus', `${source}; return buildPlanningScoreContext(state);`)(
    state,
    (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(),
    (material) => material && material.available !== false,
    (value) => Number(value) > 0 ? Math.round(Number(value)) : 0,
    (goal) => Number(goal.actualMinutes || 0),
    (item) => ['Concluído', 'Estudado', 'Dominado'].includes(item.status)
  );
}

test('contexto de pontuação indexa fixture grande uma vez e não altera state', () => {
  const syllabusItems = Array.from({ length: 500 }, (_, i) => ({ id: `i${i}`, discipline: `D${i % 20}`, subject: `S${i}`, status: 'Não iniciado', domain: 'Médio' }));
  const state = { subjects: [], syllabusItems, studies: Array.from({ length: 1000 }, (_, i) => ({ id: `s${i}`, syllabusItemId: `i${i % 500}`, minutes: 30 })), dailyGoals: Array.from({ length: 300 }, (_, i) => ({ id: `g${i}`, syllabusItemId: `i${i % 500}`, actualMinutes: 10 })), questionLogs: Array.from({ length: 2000 }, (_, i) => ({ id: `q${i}`, syllabusItemId: `i${i % 500}`, total: 2, correct: 1, wrong: 1 })), materials: Array.from({ length: 800 }, (_, i) => ({ id: `m${i}`, syllabusItemId: `i${i % 500}`, estimatedMinutes: 60 })) };
  const before = JSON.stringify(state);
  const context = planningContextFor(state);
  assert.deepEqual(context.indexPasses, { studies: 1000, goals: 300, questionLogs: 2000, materials: 800 });
  assert.equal(context.itemMetricsById.size, 500);
  assert.equal(context.materialEstimateBySyllabusItemId.size, 500);
  assert.equal(JSON.stringify(state), before);
});
