const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');
const style = fs.readFileSync('style.css', 'utf8');

test('calendário possui seções recolhíveis independentes para dia, semana e mês', () => {
  for (const mode of ['daily', 'weekly', 'monthly']) assert.match(html, new RegExp(`data-goal-calendar-section="${mode}"`));
  assert.match(html, /<strong>Calendário do dia<\/strong>/);
  assert.match(html, /<strong>Calendário semanal<\/strong>/);
  assert.match(html, /<strong>Calendário mensal<\/strong>/);
  assert.match(html, /Configurações do calendário/);
  assert.match(script, /goalCalendarPeriod\(date, "daily"\)/);
  assert.match(script, /goalCalendarPeriod\(date, "weekly"\)/);
  assert.match(script, /goalCalendarPeriod\(date, "monthly"\)/);
  assert.match(style, /\.goal-calendar-section\[open\] > summary::after/);
});

test('calendário didático exporta PDF, Excel e imagem com os três períodos', () => {
  for (const id of ['exportGoalCalendarPdf', 'exportGoalCalendarExcel', 'exportGoalCalendarImage']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(script, /function buildGoalCalendarExportPayload/);
  assert.match(script, /function buildGoalCalendarCsv/);
  assert.match(script, /function buildGoalCalendarSvg/);
  assert.match(script, /function buildGoalCalendarPrintHTML/);
  assert.match(html, /id="goalCalendarExportScope"/);
  for (const option of ['Somente dia', 'Somente semana', 'Somente mês', 'Dia + semana + mês']) assert.ok(html.includes(option));
  assert.match(script, /downloadGeneratedExcel\(buildGoalCalendarCsv\(payload, scope\)/);
  assert.match(script, /buildScopedGoalCalendarSvg\(payload, scope\)/);
  assert.match(script, /calendario-\$\{goalCalendarScopeLabel\(scope\)\}-\$\{payload\.referenceDate\}\.xlsx/);
  assert.match(script, /calendario-\$\{goalCalendarScopeLabel\(scope\)\}-\$\{payload\.referenceDate\}\.png/);
  assert.match(script, /window\.print\(\)/);
  assert.match(script, /DIA.*SEMANA.*MÊS/s);
  assert.match(style, /body\.calendar-print-mode > :not\(#goalCalendarPrintableReport\)/);
});

test('geração de metas é separada para dia, semana e mês', () => {
  assert.match(html, /id="goalGenerationScope"/);
  assert.match(html, /id="generateCalendarGoals"/);
  assert.equal((html.match(/id="generateCalendarGoals"/g) || []).length, 1);
  assert.doesNotMatch(html, /id="generate(?:Day|Week|Month)Goals"/);
  assert.match(script, /function generateDayGoals\(\)/);
  assert.match(script, /Pré-visualização diária/);
  assert.match(script, /function generateCalendarGoals\(\)/);
  assert.match(script, /daily: generateDayGoals, weekly: generateWeekGoals, monthly: generateMonthGoals/);
  assert.match(script, /elements\.generateCalendarGoals\?\.addEventListener\("click", generateCalendarGoals\)/);
  assert.match(script, /function generateWeekGoals\(\)/);
  assert.match(script, /function generateMonthGoals\(\)/);
});

test('exportação do calendário é derivada dos dados e não altera o estado', () => {
  const block = script.match(/function buildGoalCalendarExportPayload[\s\S]*?function calendarCsvCell/)[0];
  assert.match(block, /state\.dailyGoals\.filter/);
  assert.doesNotMatch(block, /state\.dailyGoals\.(?:push|splice)|saveData\(|autoSyncAfterSave\(/);
  assert.match(script, /handleGoalCalendarClick/);
  assert.match(script, /goalCalendarWeeklyContent/);
  assert.match(script, /goalCalendarMonthlyContent/);
});
