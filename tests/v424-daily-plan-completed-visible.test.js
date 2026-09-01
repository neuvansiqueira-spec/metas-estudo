const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const script = read('script.js');

test('V424 expõe a lista de exibição do dia, separada do filtro de acionáveis', () => {
  assert.match(script, /function dailyPlanGoalsForDisplay\(targetState = state, date = todayISO\(\)\) \{/);
  const start = script.indexOf('function dailyPlanGoalsForDisplay');
  const end = script.indexOf('\n}', start);
  const body = script.slice(start, end);
  assert.match(body, /goalDateValue\(goal\) === date/);
  assert.match(body, /isGoalDone\(goal\) \|\| isActionableDailyPlanGoal\(goal, targetState, completedRecords\)/);
});

test('V424 preserva o filtro de acionáveis para cota e próxima meta', () => {
  assert.match(script, /function isActionableDailyPlanGoal\(goal = \{\}/);
  const start = script.indexOf('function isActionableDailyPlanGoal');
  const end = script.indexOf('\n}', start);
  const body = script.slice(start, end);
  assert.match(body, /!isGoalDone\(goal\)/, 'o filtro de acionáveis continua excluindo concluídas');
});

test('V424 monta o Plano do Dia com a lista de exibição e ordena concluídas ao fim', () => {
  assert.match(script, /const dayGoals = dailyPlanGoalsForDisplay\(state, date\)\.map\(\(goal\) => cloneData\(goal\)\)/);
  assert.match(script, /Number\(isGoalDone\(a\)\) - Number\(isGoalDone\(b\)\)/);
  assert.doesNotMatch(
    script,
    /const dayGoals = actionableDailyPlanGoalsForDate\(state, date\)\.map/,
    'a lista do Plano do Dia não pode voltar a excluir metas concluídas'
  );
});

test('V424 calcula os contadores do dia sobre a lista de exibição', () => {
  const matches = script.match(/goalProgressStats\(dailyPlanGoalsForDisplay\(state, today\), av\)/g) || [];
  assert.equal(matches.length, 2, 'os dois painéis do dia devem contar sobre a lista de exibição');
  assert.doesNotMatch(
    script,
    /goalProgressStats\(dayGoals, av\)/,
    'contar sobre a lista filtrada mantinha "Metas concluídas" sempre em zero'
  );
});

test('V424 mantém a próxima meta restrita às acionáveis', () => {
  assert.match(script, /const next = dayGoals\.find\(\(g\)=>isActionableDailyPlanGoal\(g, state, completedRecords\)/);
});

test('V424 não introduz polling nem persistência na exibição', () => {
  const start = script.indexOf('function dailyPlanGoalsForDisplay');
  const end = script.indexOf('\n}', start);
  const body = script.slice(start, end);
  assert.doesNotMatch(body, /setInterval|setTimeout|requestAnimationFrame|MutationObserver|saveData|localStorage|indexedDB/i);
});

test('V424 mantém paridade raiz/docs do script', () => {
  assert.equal(read('script.js'), read('docs/script.js'));
});
