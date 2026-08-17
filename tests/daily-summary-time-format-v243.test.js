const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("daily-summary-time-format-v243.js", "utf8");

function runtime() {
  const context = { console, Math, Number, String, Array, Object, Date };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.__ALDUS_DAILY_SUMMARY_TIME_FORMAT_V243__;
}

test("publica a versão V243 e o hotfix de horas e minutos", () => {
  assert.match(source, /20260805-daily-summary-hours-minutes-v243/);
  assert.match(source, /daily-summary-time-format-hotfix4/);
  assert.match(source, /__ALDUS_DAILY_SUMMARY_TIME_FORMAT_V243__/);
});

test("formata 6,4 horas como 6h 24min", () => {
  const api = runtime();
  assert.equal(api.formatDurationMinutes(6.4 * 60), "6h 24min");
});

test("formata 1,8 hora como 1h 48min", () => {
  const api = runtime();
  assert.equal(api.formatDurationMinutes(1.8 * 60), "1h 48min");
});

test("tempo inferior a uma hora mostra somente minutos", () => {
  const api = runtime();
  assert.equal(api.formatDurationMinutes(45), "45min");
  assert.equal(api.formatDurationMinutes(0), "0min");
});

test("hora exata não acrescenta zero minutos", () => {
  const api = runtime();
  assert.equal(api.formatDurationMinutes(120), "2h");
});

test("usa minutos exatos das metas em vez do decimal arredondado", () => {
  const api = runtime();
  const goals = [
    { date: "2026-08-05", minutes: 200, studyActualMinutes: 61 },
    { date: "2026-08-05", minutes: 185, studyActualMinutes: 47 },
    { date: "2026-08-06", minutes: 600, studyActualMinutes: 600 }
  ];
  const summary = api.calculateSummaryMinutes(goals, "2026-08-05", { hours: 8 });
  assert.deepEqual(
    { target: summary.target, done: summary.done, planned: summary.planned, count: summary.count },
    { target: 385, done: 108, planned: 385, count: 2 }
  );
  assert.equal(api.formatDurationMinutes(summary.target), "6h 25min");
  assert.equal(api.formatDurationMinutes(summary.done), "1h 48min");
});

test("usa a disponibilidade quando não há metas planejadas", () => {
  const api = runtime();
  const summary = api.calculateSummaryMinutes([], "2026-08-05", { hours: 6.5 });
  assert.equal(summary.target, 390);
  assert.equal(api.formatDurationMinutes(summary.target), "6h 30min");
});

test("soma os minutos registrados dentro da semana sem arredondar para horas inteiras", () => {
  const api = runtime();
  const logs = [
    { date: "2026-08-03", minutes: 61 },
    { date: "2026-08-09", minutes: 47 },
    { date: "2026-08-10", minutes: 600 }
  ];
  const minutes = api.calculateRegisteredMinutesBetween(logs, "2026-08-03", "2026-08-09");
  assert.equal(minutes, 108);
  assert.equal(api.formatDurationMinutes(minutes), "1h 48min");
});

test("mantém o resumo diário e acrescenta horas e minutos ao indicador semanal", () => {
  assert.match(source, /\.planned-today-stat > strong/);
  assert.match(source, /\.realized-today-stat > strong/);
  assert.match(source, /#weeklyGoalStatus/);
  assert.match(source, /formatDurationMinutes\(minutes\).*registradas/s);
  assert.doesNotMatch(source, /historical-time-stat > strong/);
});

test("reaplica após renderização e mudança de data", () => {
  assert.match(source, /new MutationObserver\(\(records\) => \{\s*if \(mutacaoRelevante\(records\)\) scheduleApply\(\);/);
  assert.match(source, /event\.target\?\.id === "goalDate"/);
  assert.match(source, /window\.addEventListener\("hashchange", scheduleApply\)/);
});

test("não reconsolida a semana a cada mutação irrelevante da página", () => {
  // O observador alcança document.documentElement inteiro, então sem filtro
  // qualquer escrita de outro módulo — o cronômetro flutuante e o relógio
  // reescrevem texto a cada segundo — agendava uma consolidação completa. Isso
  // mantinha o main thread ocupado sem parar.
  assert.match(source, /function mutacaoRelevante\(records\)/);
  assert.match(source, /alvo === node \|\| alvo\.contains\(node\)/);
  assert.match(
    source,
    /observer\.observe\(document\.documentElement/,
    'o alcance amplo é intencional: os alvos são recriados quando o painel é redesenhado'
  );
});

test("consolida a semana no máximo uma vez por execução e só com o alvo na tela", () => {
  // currentWeekRegisteredMinutes percorre estudos, metas e registros de questões.
  // Era chamada duas vezes por apply(), e o segundo resultado era descartado.
  const corpoApply = source.slice(source.indexOf('function apply()'), source.indexOf('const api = Object.freeze'));
  const chamadas = corpoApply.match(/currentWeekRegisteredMinutes\(\)/g) || [];
  assert.equal(chamadas.length, 1, 'apply() deve consolidar a semana uma única vez');
  assert.match(corpoApply, /weeklyElement \? currentWeekRegisteredMinutes\(\) : null/);
});

test("raiz e docs publicam exatamente o mesmo módulo", () => {
  assert.equal(source, fs.readFileSync("docs/daily-summary-time-format-v243.js", "utf8"));
});

test("loader e service worker carregam e renovam a V243", () => {
  const loader = fs.readFileSync("planning-integrity-loader-v235.js", "utf8");
  const worker = fs.readFileSync("service-worker.js", "utf8");
  assert.match(loader, /daily-summary-time-format-v243\.js/);
  assert.match(loader, /__ALDUS_DAILY_SUMMARY_TIME_FORMAT_V243__/);
  assert.match(loader, /daily-summary-time-format-hotfix4/);
  assert.match(worker, /daily-summary-time-format-v243\.js/);
  assert.match(worker, /daily-summary-direct-v244-hotfix2/);
  assert.match(worker, /daily-summary-time-format-hotfix4/);
  assert.match(worker, /weekly-registered-minutes-hotfix4/);
  assert.equal(loader, fs.readFileSync("docs/planning-integrity-loader-v235.js", "utf8"));
  assert.equal(worker, fs.readFileSync("docs/service-worker.js", "utf8"));
});