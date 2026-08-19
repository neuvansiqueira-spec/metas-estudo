const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "planning-piece-rotation-v358.js"), "utf8");

function makeContext(route = "#metas-do-dia") {
  const listeners = new Map();
  let idleCallback = null;
  const context = {
    console,
    Date,
    Map,
    Set,
    Object,
    String,
    Number,
    Array,
    Boolean,
    Math,
    JSON,
    location: { hash: route },
    performance: { now: (() => { let value = 0; return () => ++value; })() },
    requestIdleCallback(callback) { idleCallback = callback; return 1; },
    setTimeout(callback) { callback(); return 1; },
    queueMicrotask(callback) { callback(); },
    addEventListener(type, listener) {
      const entries = listeners.get(type) || [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) listener(event);
    }
  };
  context.window = context;
  context.globalThis = context;
  context.flushIdle = () => { const callback = idleCallback; idleCallback = null; callback?.(); };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "planning-piece-rotation-v358.js" });
  return context;
}

function pieceGoal(id, date, subject, extra = {}) {
  return {
    id,
    date,
    discipline: "PEÇA PARA DELEGADO DE POLÍCIA CIVIL",
    subject,
    assunto: subject,
    baseSubject: subject,
    type: "Estudo novo",
    origin: "planejamento peça diária",
    status: "Pendente",
    fixedDailyPieceV183: true,
    ...extra
  };
}

test("V358 transforma a sequência futura repetida em rodízio real dos 11 tipos", () => {
  const context = makeContext();
  context.todayISO = () => "2026-08-19";
  const repeated = "Representação por Quebra de Sigilo Bancário";
  const futureDates = Array.from({ length: 13 }, (_, index) => `2026-08-${String(19 + index).padStart(2, "0")}`);
  context.state = {
    dailyGoals: [
      pieceGoal("past", "2026-08-18", repeated),
      ...futureDates.map((date, index) => pieceGoal(`future-${index}`, date, repeated))
    ]
  };
  let saves = 0;
  context.saveData = () => { saves += 1; };
  context.render = () => {};
  context.autoSyncAfterSave = () => {};

  context.dispatchEvent({ type: "aldus:bootstrap-ready" });
  context.flushIdle();

  const future = context.state.dailyGoals.filter((goal) => goal.date >= "2026-08-19");
  const firstCycle = future.slice(0, 11).map((goal) => goal.subject);
  assert.equal(new Set(firstCycle).size, 11);
  assert.equal(firstCycle.includes(repeated), true);
  assert.notEqual(future[0].subject, repeated);
  assert.equal(future.every((goal) => /^v357-piece:/.test(goal.pieceCatalogKeyV357)), true);
  assert.equal(future.every((goal) => goal.syllabusItemId === ""), true);
  assert.equal(saves, 1);
  assert.equal(context.__aldusPieceRotationRepairV358.getLastAudit().reassigned, 13);
});

test("V358 preserva Peças históricas, manuais e executadas", () => {
  const context = makeContext();
  context.todayISO = () => "2026-08-19";
  const repeated = "Representação por Quebra de Sigilo Bancário";
  context.state = {
    dailyGoals: [
      pieceGoal("past", "2026-08-18", repeated),
      pieceGoal("manual", "2026-08-19", "Representação por Prisão Preventiva", { origin: "manual" }),
      pieceGoal("executed", "2026-08-20", "Representação por Busca e Apreensão", { actualMinutes: 20, status: "Em andamento" }),
      pieceGoal("auto", "2026-08-21", repeated)
    ]
  };
  context.saveData = () => {};
  context.render = () => {};
  context.autoSyncAfterSave = () => {};
  context.dispatchEvent({ type: "aldus:bootstrap-ready" });
  context.flushIdle();

  assert.equal(context.state.dailyGoals.find((goal) => goal.id === "past").subject, repeated);
  assert.equal(context.state.dailyGoals.find((goal) => goal.id === "manual").subject, "Representação por Prisão Preventiva");
  assert.equal(context.state.dailyGoals.find((goal) => goal.id === "executed").subject, "Representação por Busca e Apreensão");
  assert.notEqual(context.state.dailyGoals.find((goal) => goal.id === "auto").subject, repeated);
});

test("V358 mantém no máximo uma Peça automática futura por dia e pede recomposição", () => {
  const context = makeContext();
  context.todayISO = () => "2026-08-19";
  const repeated = "Representação por Quebra de Sigilo Bancário";
  context.state = {
    dailyGoals: [
      pieceGoal("past", "2026-08-18", repeated),
      pieceGoal("a", "2026-08-19", repeated),
      pieceGoal("b", "2026-08-19", repeated)
    ]
  };
  let reconciledDates = [];
  context.reconcilePlanningDates = (_state, dates) => { reconciledDates = dates; return { added: [] }; };
  context.saveData = () => {};
  context.render = () => {};
  context.autoSyncAfterSave = () => {};
  context.dispatchEvent({ type: "aldus:bootstrap-ready" });
  context.flushIdle();

  const piecesOnDay = context.state.dailyGoals.filter((goal) => goal.date === "2026-08-19");
  assert.equal(piecesOnDay.length, 1);
  assert.deepEqual(Array.from(reconciledDates), ["2026-08-19"]);
  assert.equal(context.__aldusPieceRotationRepairV358.getLastAudit().removedDuplicates, 1);
});

test("V359 não encerra auditoria com cronograma vazio e roda após o pós-bootstrap", () => {
  const context = makeContext();
  context.todayISO = () => "2026-08-19";
  context.state = { dailyGoals: [] };
  let saves = 0;
  context.saveData = () => { saves += 1; };
  context.render = () => {};
  context.autoSyncAfterSave = () => {};

  context.dispatchEvent({ type: "aldus:bootstrap-ready" });
  context.flushIdle();
  const waiting = context.__aldusPieceRotationRepairV358.getLastAudit();
  assert.equal(waiting.waitingForGoals, true);
  assert.equal(waiting.futureDates, 0);
  assert.match(waiting.version, /v359$/);

  const repeated = "Representação por Quebra de Sigilo Bancário";
  const futureDates = Array.from({ length: 13 }, (_, index) => `2026-08-${String(19 + index).padStart(2, "0")}`);
  context.state.dailyGoals = [
    pieceGoal("past", "2026-08-18", repeated),
    ...futureDates.map((date, index) => pieceGoal(`loaded-${index}`, date, repeated))
  ];

  context.dispatchEvent({ type: "aldus:post-bootstrap-maintenance-complete" });
  context.flushIdle();

  const future = context.state.dailyGoals.filter((goal) => goal.date >= "2026-08-19");
  assert.equal(new Set(future.slice(0, 11).map((goal) => goal.subject)).size, 11);
  assert.equal(context.__aldusPieceRotationRepairV358.getLastAudit().waitingForGoals, false);
  assert.equal(context.__aldusPieceRotationRepairV358.getLastAudit().reassigned, 13);
  assert.equal(saves, 1);
  assert.equal(context.__aldusPieceRotationTimingV359.version, context.__aldusPieceRotationRepairV358.version);
});

test("V358 fica inerte fora das rotas de planejamento", () => {
  const context = makeContext("#fabrica-resumos");
  context.todayISO = () => "2026-08-19";
  context.state = { dailyGoals: [pieceGoal("a", "2026-08-19", "Representação por Quebra de Sigilo Bancário")] };
  context.dispatchEvent({ type: "aldus:bootstrap-ready" });
  context.flushIdle();
  assert.equal(context.state.dailyGoals[0].subject, "Representação por Quebra de Sigilo Bancário");
  assert.equal(context.__aldusPieceRotationRepairV358.getLastAudit(), null);
});

test("V359 não cria hot path nem acesso direto ao armazenamento", () => {
  assert.match(source, /requestIdleCallback/);
  assert.match(source, /aldus:post-bootstrap-maintenance-complete/);
  assert.match(source, /waitingForGoals/);
  assert.match(source, /PLANNING_ROUTES/);
  assert.doesNotMatch(source, /MutationObserver|setInterval|localStorage|indexedDB|syncStableSerialize|cloneData|structuredClone/);
  const pagesWorkflow = fs.readFileSync(path.join(root, ".github", "workflows", "pages.yml"), "utf8");
  assert.match(pagesWorkflow, /planning-piece-rotation-v358\.js/);
  assert.match(pagesWorkflow, /aldusPieceRotationRepairV358/);
});
