import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const VERSION = "20260805-dashboard-today-time-sync-v253";
const FILE = "dashboard-today-time-sync-v253.js";
const source = fs.readFileSync(FILE, "utf8");
const read = (path) => fs.readFileSync(path, "utf8");

function api() {
  const context = { console, Math, Number, String, Array, Object, Date, JSON, Set };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.__ALDUS_DASHBOARD_TODAY_TIME_SYNC_V253__;
}

test("raiz e docs publicam o mesmo módulo", () => {
  assert.equal(source, read(`docs/${FILE}`));
});

test("confirma a causa: o Dashboard antigo soma somente state.studies", () => {
  const app = read("app-v236.js");
  assert.match(app, /const todayMinutes = state\.studies\.filter/);
  assert.match(app, /elements\.todayHours\.textContent = formatHours\(todayMinutes\)/);
  assert.match(app, /function getStudyTimeLogs\(\)/);
  assert.match(app, /goalUnloggedActualMinutes\(goal\)/);
});

test("soma registros, minutos não registrados das metas e questões sem duplicar sessão", () => {
  const runtime = api();
  const data = {
    studies: [
      { id: "s1", timerSessionId: "a", goalId: "g1", origin: "timer", updatesGoal: true, date: "2026-08-05", minutes: 60 },
      { id: "s2", timerSessionId: "a", goalId: "g1", origin: "timer", updatesGoal: true, date: "2026-08-05", minutes: 60 },
      { id: "m1", origin: "manual", date: "2026-08-05", minutes: 20 },
      { id: "old", origin: "manual", date: "2026-08-04", minutes: 500 }
    ],
    dailyGoals: [
      { id: "g1", date: "2026-08-05", studyActualMinutes: 75, questionActualMinutes: 15, actualMinutes: 90 }
    ],
    questionLogs: [{ id: "q1", date: "2026-08-05", minutes: 15 }]
  };
  assert.equal(runtime.uniqueStudyMinutes(data.studies, "2026-08-05"), 80);
  assert.equal(runtime.linkedTimerMinutes(data.dailyGoals[0], data.studies), 60);
  assert.equal(runtime.calculateTodayMinutes(data, "2026-08-05"), 125);
  assert.equal(runtime.formatDurationMinutes(125), "2h 5min");
});

test("usa os alvos reais e reage a alterações", () => {
  assert.match(source, /#todayHours/);
  assert.match(source, /#dailyGoalsSummary \.daily-goals-summary > \.realized-today-stat > strong/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /addEventListener\("storage"/);
  assert.match(source, /addEventListener\("focus"/);
  assert.match(source, /visibilitychange/);
});

test("HTML carrega V253 diretamente depois da V243", () => {
  for (const path of ["index.html", "docs/index.html"]) {
    const html = read(path);
    assert.ok(html.indexOf("aldusDashboardTodayTimeSyncV253") > html.indexOf("aldusDailySummaryTimeFormatV243Direct"));
    assert.match(html, new RegExp(`dashboard-today-time-sync-v253\\.js\\?v=${VERSION}&hotfix=dashboard-today-time-sync-hotfix1`));
    assert.equal((html.match(/aldusDashboardTodayTimeSyncV253/g) || []).length, 1);
  }
});

test("service worker renova cache e inclui V253", () => {
  const worker = read("service-worker-v236.js");
  assert.match(worker, /dashboard-today-time-sync-v253/);
  assert.match(worker, /DASHBOARD_TODAY_TIME_SYNC_SCRIPT,/);
  assert.match(worker, /id="aldusDashboardTodayTimeSyncV253"/);
  assert.match(worker, /x-aldus-dashboard-today-time-sync/);
  assert.equal(worker, read("docs/service-worker-v236.js"));
});
