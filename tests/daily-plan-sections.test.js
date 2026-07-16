const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const style = fs.readFileSync('style.css', 'utf8');
const docsStyle = fs.readFileSync('docs/style.css', 'utf8');

test('Plano do Dia usa details/summary nas seções principais e estados iniciais corretos', () => {
  assert.match(script, /dailyPlanSectionAttrs\("summary", true\)/);
  assert.match(script, /dailyPlanSummaryHTML\("Resumo de hoje"/);
  assert.match(script, /dailyPlanSummaryHTML\("Próxima atividade"/);
  assert.match(script, /dailyPlanQuestionsSection\(date, dayContent, questionProgress\)/);
  assert.match(script, /dayContent\.mode === "questions_only"/);
  assert.match(script, /Metas de estudo/);
  assert.match(script, /dailyPlanSectionAttrs\("goals", rememberedDailyPlanSection\(date\) === "goals"\)/);
  assert.match(script, /dailyPlanSectionAttrs\("review", rememberedDailyPlanSection\(date\) === "review"\)/);
  assert.match(script, /Pendências e histórico/);
});

test('Cada meta possui details/summary, conclusão fechada e andamento pode abrir', () => {
  assert.match(script, /<details class="daily-goal-section/);
  assert.match(script, /class="daily-goal-summary"/);
  assert.match(script, /data-daily-goal-details="\$\{goal\.id\}"/);
  assert.match(script, /const inProgress = !isGoalDone\(goal\).*goalTotalActualMinutes\(goal\) > 0/);
  assert.match(script, /const hydrated = remembered \|\| inProgress/);
});

test('Materiais iniciam recolhidos e ações secundárias ficam em Mais ações', () => {
  assert.match(script, /<details class="daily-goal-materials"><summary>Materiais disponíveis <span>\$\{materialState\.count\} materiais/);
  assert.match(script, /<details class="daily-goal-more-actions"><summary>Mais ações<\/summary>/);
  assert.match(script, /Cronômetro estudo/);
  assert.match(script, /Cronômetro questões/);
  assert.match(script, /Concluir meta/);
  assert.match(script, /Registrar estudo manualmente/);
  assert.match(script, /Registrar tempo de questões/);
  assert.match(script, /Registrar questões/);
  assert.match(script, /Ver histórico/);
  assert.match(script, /Reagendar ou adiar/);
});

test('Mobile abre somente uma seção e uma meta; desktop permite múltiplas', () => {
  assert.match(script, /function isDailyPlanMobile\(\).*max-width: 768px/);
  assert.match(script, /details\[data-daily-plan-section\]\[open\]/);
  assert.match(script, /details\[data-daily-goal-details\]\[open\]/);
  assert.match(script, /if \(isDailyPlanMobile\(\)\)/);
  assert.doesNotMatch(script.match(/function handleDailyPlanToggle[\s\S]*?elements\.dailyGoalsSummary/s)[0], /saveData\(|autoSyncAfterSave\(/);
});

test('SessionStorage mantém seção/meta após ações sem usar persistência principal', () => {
  assert.match(script, /sessionStorage\.setItem\(dailyPlanStorageKey\("section"/);
  assert.match(script, /sessionStorage\.setItem\(dailyPlanStorageKey\("goal"/);
  assert.match(script, /function registerGoalTime\(goal, kind = "study"\) \{\n  rememberDailyPlanSection\("goals", goal\.date\);\n  rememberDailyPlanGoal\(goal\.id, goal\.date\);/);
  assert.match(script, /function fillQuestionForDate\(date\) \{ rememberDailyPlanSection\("questions"/);
  assert.match(script, /function fillQuestionFromGoal\(goalId\).*rememberDailyPlanGoal\(goal\.id, goal\.date\)/s);
  assert.doesNotMatch(script, /localStorage\.setItem\(dailyPlanStorageKey/);
});

test('Botões e fluxos preservados, cronômetro na meta e conclusão sem prompt de minutos', () => {
  assert.match(script, /startFloatingTimer\(goal, timerButton\.dataset\.goalTimer\)/);
  assert.match(script, /data-goal-timer="study"/);
  assert.match(script, /data-goal-timer="questions"/);
  assert.match(script, /openGoalCompletionModal\(goal\.id, action\)/);
  assert.doesNotMatch(script, /Quantos minutos de estudo teórico foram feitos\?/);
  assert.doesNotMatch(script, /prompt\("Quantos minutos de estudo teórico/);
});

test('CSS do Plano do Dia evita quebra indevida, coluna única e espaço inferior', () => {
  assert.match(style, /\.daily-plan-section/);
  assert.match(style, /\.daily-plan-summary/);
  assert.match(style, /\.daily-plan-heading/);
  assert.match(style, /\.daily-plan-title/);
  assert.match(style, /\.daily-plan-resume/);
  assert.match(style, /\.daily-plan-content/);
  assert.match(style, /\.daily-goal-section/);
  assert.match(style, /\.daily-goal-summary/);
  assert.match(style, /\.daily-goal-content/);
  assert.match(style, /#view-metas-do-dia \{\n  padding-bottom: calc\(140px \+ env\(safe-area-inset-bottom, 0px\)\);/);
  assert.match(style, /word-break: normal;/);
  assert.match(style, /overflow-wrap: break-word;/);
  assert.match(style, /hyphens: none;/);
  assert.match(style, /daily-goals-board \{ grid-template-columns: 1fr; \}/);
});

test('Raiz e docs permanecem iguais', () => {
  assert.equal(script, docsScript);
  assert.equal(style, docsStyle);
});
