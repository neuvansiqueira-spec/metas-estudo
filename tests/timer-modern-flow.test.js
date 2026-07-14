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
  assert.match(script, /goal\[field\] = \(Number\(goal\[field\]\) \|\| 0\) \+ minutes/);
  assert.match(script, /render\(\);\n  showDailyGoalMessage/);
  assert.match(script, /autoSyncAfterSave\("timer-save"\)/);
  assert.match(script, /feedAnalytics: elements\.timerStudyFeedAnalytics\.checked/);
  assert.match(script, /feedAdvisor: elements\.timerStudyFeedAdvisor\.checked/);
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
