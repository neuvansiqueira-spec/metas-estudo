const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');
const docsCss = fs.readFileSync('docs/style.css', 'utf8');

test('cronometro abre modal proprio sem prompt alert confirm no fluxo de salvar', () => {
  const flow = script.slice(script.indexOf('function restoreFloatingTimerSession()'), script.indexOf('function openDailyDisciplines()'));
  assert.match(flow, /function saveFloatingTimerTime\(\) \{ openTimerStudyModal\(\); \}/);
  assert.doesNotMatch(flow, /\bprompt\s*\(/);
  assert.doesNotMatch(flow, /\balert\s*\(/);
  assert.doesNotMatch(flow, /\bconfirm\s*\(/);
});

test('modal registra estudo com tempo automatico bloqueado e historico da sessao', () => {
  assert.match(html, /id="timerStudyModal"/);
  assert.match(html, /id="timerStudyMinutes" type="text" readonly aria-readonly="true"/);
  assert.match(html, /id="timerStudyStartedAt"/);
  assert.match(html, /id="timerStudyEndedAt"/);
  assert.match(html, /id="timerStudySessionTime"/);
  assert.match(html, /id="timerStudySessionMode"/);
  assert.match(script, /const draft = timerSessionDraft\(\)/);
  assert.match(script, /elements\.timerStudyMinutes\.value = `\$\{draft\.minutes\} min`/);
});

test('salvar sessao alimenta estudos metas dashboard analise e conselheiro sem reload', () => {
  assert.match(script, /state\.studies\.push\(\{[\s\S]*origin: "timer"/);
  assert.match(script, /timerKind: draft\.kind/);
  assert.match(script, /updatesGoal: elements\.timerStudyUpdateGoal\.checked/);
  assert.match(script, /date: draft\.goalDate \|\| goal\.date \|\| goal\.data \|\| todayISO\(\)/);
  assert.match(script, /goal\[field\] = \(Number\(goal\[field\]\) \|\| 0\) \+ minutes/);
  assert.match(script, /render\(\);\n  showDailyGoalMessage/);
  assert.match(script, /autoSyncAfterSave\("timer-save"\)/);
  assert.match(script, /feedAnalytics: elements\.timerStudyFeedAnalytics\.checked/);
  assert.match(script, /feedAdvisor: elements\.timerStudyFeedAdvisor\.checked/);
  assert.match(script, /goalUnloggedActualMinutes\(goal\)/);
  assert.match(script, /timerFeedState\("feedAnalytics"\)/);
  assert.match(script, /timerFeedState\("feedAdvisor"\)/);
  assert.doesNotMatch(script, /location\.reload\(\)/);
});

test('lancamento manual continua usando fluxo separado', () => {
  assert.match(script, /elements\.addManualTime\?\.addEventListener\("click", addManualTime\)/);
  assert.match(script, /function addManualTime/);
});

test('modal responsivo para mobile e desktop', () => {
  assert.match(css, /width: min\(560px, 100%\)/);
  assert.match(css, /overflow-x: hidden/);
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /max-height: calc\(100dvh - 96px\)/);
});

test('raiz e docs permanecem identicos nos arquivos publicados', () => {
  assert.equal(script, docsScript);
  assert.equal(html, docsHtml);
  assert.equal(css, docsCss);
});

test('Plano do Dia reconcilia disciplinas por dia sem repetir enquanto houver elegiveis', () => {
  assert.match(script, /function reconcileDailyGoalsWithPlanning\(targetState = state, date = todayISO\(\), opts = \{\}\)/);
  assert.match(script, /const expected = Math\.max\(0, Number\(targetState\.planning\?\.config\?\.disciplinesPerDay\)/);
  assert.match(script, /selectableDisciplineGoalsForDate/);
  assert.match(script, /if \(usedDisciplines\.has\(canonical\(goal\.discipline\)\)\) continue/);
  assert.match(script, /new Set\(\(targetState\.dailyGoals \|\| \[\]\)\.filter/);
  assert.match(script, /Planejamento prevê \$\{expected\} disciplinas, mas existem apenas \$\{disciplines\.size\} disciplinas elegíveis/);
});

test('Assuntos por dia nao reduz quantidade de disciplinas e excedentes sao removidos com seguranca', () => {
  assert.match(script, /topicLimit: Math\.max\(Number\(planningConfig\(\)\.topicsPerDay\) \|\| 1, Number\(planningConfig\(\)\.disciplinesPerDay\) \|\| 1\)/);
  assert.match(script, /function isProtectedDailyGoal\(goal\).*isManualDailyGoal\(goal\).*isGoalDone\(goal\).*isGoalInProgress\(goal\).*goalTotalActualMinutes\(goal\) > 0/s);
  assert.match(script, /function isAutomaticIntactDailyGoal\(goal\) \{ return !isProtectedDailyGoal\(goal\); \}/);
  assert.match(script, /report\.removed\.push\(goal\.id\)/);
});

test('Salvar Planejamento atualiza Plano do Dia e botao manual tambem reconcilia', () => {
  assert.match(script, /const report = reconcileDailyGoalsWithPlanning\(state, elements\.goalDate\?\.value \|\| todayISO\(\)\)/);
  assert.match(script, /Planejamento salvo e Plano do Dia atualizado/);
  assert.match(script, /const report = reconcileDailyGoalsWithPlanning\(state, date, \{ manual: availabilityForDate\(date\)\.type === "indisponível" \}\)/);
  assert.doesNotMatch(script, /location\.reload\(\)/);
});

test('Cronometro carrega contexto do cartao, usa minutos automaticos e bloqueia duplicidade', () => {
  assert.match(script, /floatingTimer = \{ sessionId: createId\(\), goalId: goal\.id, goalDate: goal\.date \|\| goal\.data, discipline: goal\.discipline, subject: goal\.subject/);
  assert.match(script, /elements\.timerStudyMinutes\.value = `\$\{draft\.minutes\} min`/);
  assert.match(html, /readonly aria-readonly="true"/);
  assert.match(script, /state\.studies\.some\(\(study\) => study\.timerSessionId === draft\.sessionId\)/);
  assert.match(script, /timerSessionId: draft\.sessionId/);
  assert.doesNotMatch(script.slice(script.indexOf('function openTimerStudyModal()'), script.indexOf('function submitTimerStudyModal')), /prompt\s*\(/);
});
