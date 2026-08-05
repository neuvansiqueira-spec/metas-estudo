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

test("publica a versão V243 e o hotfix do resumo diário", () => {
  assert.match(source, /20260805-daily-summary-hours-minutes-v243/);
  assert.match(source, /daily-summary-time-format-hotfix1/);
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

test("altera somente os cartões planejado e realizado", () => {
  assert.match(source, /\.planned-today-stat > strong/);
  assert.match(source, /\.realized-today-stat > strong/);
  assert.doesNotMatch(source, /historical-time-stat > strong/);
});

test("reaplica após renderização e mudança de data", () => {
  assert.match(source, /new MutationObserver\(scheduleApply\)/);
  assert.match(source, /event\.target\?\.id === "goalDate"/);
  assert.match(source, /window\.addEventListener\("hashchange", scheduleApply\)/);
});

test("raiz e docs publicam exatamente o mesmo módulo", () => {
  assert.equal(source, fs.readFileSync("docs/daily-summary-time-format-v243.js", "utf8"));
});

test("loader e service worker carregam e renovam a V243", () => {
  const loader = fs.readFileSync("planning-integrity-loader-v235.js", "utf8");
  const worker = fs.readFileSync("service-worker.js", "utf8");
  assert.match(loader, /daily-summary-time-format-v243\.js/);
  assert.match(loader, /__ALDUS_DAILY_SUMMARY_TIME_FORMAT_V243__/);
  assert.match(loader, /daily-summary-time-format-hotfix2/);
  assert.match(worker, /daily-summary-time-format-v243\.js/);
  assert.match(worker, /daily-summary-direct-v244-hotfix2/);
  assert.match(worker, /daily-summary-time-format-hotfix2/);
  assert.equal(loader, fs.readFileSync("docs/planning-integrity-loader-v235.js", "utf8"));
  assert.equal(worker, fs.readFileSync("docs/service-worker.js", "utf8"));
});