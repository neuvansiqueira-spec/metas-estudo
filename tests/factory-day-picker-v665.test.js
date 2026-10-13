"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const SOURCE = fs.readFileSync(path.join(ROOT, "factory-day-picker-v665.js"), "utf8");

function load() {
  const goals = [
    { id: "a", date: "2026-10-13" },
    { id: "b", date: "2026-10-14" },
    { id: "c", date: "2026-10-14" }
  ];
  const context = {
    console,
    sessionStorage: { getItem: () => null, setItem() {} },
    window: {},
    setTimeout: (fn) => fn,
    todayISO: () => "2026-10-13",
    factoryProductionScope: "day",
    ensureFactoryAgenda: () => [{ id: "x" }],
    factoryQueueForDate: (date) => goals.filter((goal) => goal.date === date).map((goal) => ({ item: { id: goal.id } })),
    factoryResumoAulaPending: () => true,
    factoryUnlockedDayDate: () => "2026-10-13",
    factoryScopeDates: (scope) => (scope === "week" ? ["semana"] : ["2026-10-13"]),
    factoryDoNowQueue: () => [{ item: { id: "a" }, sourceDate: "2026-10-13" }],
    renderFactory: () => "desenhado",
    __ALDUS_FACTORY_PLAN_DAY_V159__: true
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(SOURCE, context);
  return context;
}

test("V665: sem escolha, o Plano do Dia da Fábrica continua em hoje", () => {
  const c = load();
  assert.equal(c.factoryUnlockedDayDate(), "2026-10-13");
  assert.equal(c.factoryDoNowQueue().length, 1);
});

test("V665: dia escolhido troca a fila, a data e o recorte só no Plano do Dia", () => {
  const c = load();
  c.__ALDUS_FACTORY_DAY_PICKER_V665__.setDate("2026-10-14");
  assert.equal(c.factoryUnlockedDayDate(), "2026-10-14");
  assert.equal(JSON.stringify(c.factoryScopeDates()), JSON.stringify(["2026-10-14"]));
  assert.equal(JSON.stringify(c.factoryDoNowQueue().map((entry) => entry.item.id)), JSON.stringify(["b", "c"]));
  assert.equal(JSON.stringify(c.factoryScopeDates("week")), JSON.stringify(["semana"]));
  c.factoryProductionScope = "week";
  vm.runInContext("1", c);
});

test("V665: data passada volta para hoje", () => {
  const c = load();
  c.__ALDUS_FACTORY_DAY_PICKER_V665__.setDate("2026-10-01");
  assert.equal(c.factoryUnlockedDayDate(), "2026-10-13");
});

test("V665 está no pacote logo depois da V159", () => {
  const build = fs.readFileSync(path.join(ROOT, "build-bundles.mjs"), "utf8");
  assert.ok(build.indexOf('"factory-day-picker-v665.js"') > build.indexOf('"factory-plan-day-v159.js"'));
  assert.ok(fs.readFileSync(path.join(ROOT, "docs", "app.bundle.js"), "utf8").includes("fabrica-escolher-dia-v665"));
});
