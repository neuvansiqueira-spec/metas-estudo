"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const SOURCE = fs.readFileSync(path.join(ROOT, "edital-pcma-delegado-v664.js"), "utf8");

function load() {
  let originalCalls = 0;
  const context = {
    console,
    setTimeout,
    applyPcprPcma2026Migration(target) {
      originalCalls += 1;
      target.syllabusItems.push({ id: "catalogo-antigo", discipline: "DIREITO PENAL", subject: "Volta do catálogo" });
      return { changed: true };
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(SOURCE, context);
  return { context, api: context.__ALDUS_EDITAL_PCMA_V664__, calls: () => originalCalls };
}

function realState() {
  const syllabusItems = [];
  for (let i = 0; i < 220; i += 1) syllabusItems.push({ id: `old-${i}`, discipline: "DIREITO PENAL", subject: `Antigo ${i}` });
  syllabusItems.push({ id: "peca-1", discipline: "PEÇA PARA DELEGADO DE POLÍCIA CIVIL", subject: "Representação por Busca e Apreensão" });
  const dailyGoals = [];
  for (let i = 0; i < 60; i += 1) dailyGoals.push({ id: `pend-${i}`, status: "Pendente", syllabusItemId: `old-${i}` });
  dailyGoals.push({ id: "feita", status: "Concluída", syllabusItemId: "old-1", actualMinutes: 50 });
  dailyGoals.push({ id: "andamento-com-tempo", status: "Em andamento", syllabusItemId: "old-2", actualMinutes: 30 });
  dailyGoals.push({ id: "andamento-sem-tempo", status: "Em andamento", syllabusItemId: "old-3" });
  return {
    syllabusItems, dailyGoals, schedulableSettings: { "old-1": { availability: "Agendável" } },
    studies: [{ id: "s1" }], questionBank: [{ id: "q1" }], factoryAgenda: [{ id: "f1" }],
    migrations: { disciplineUnificationV426: { completed: true } }
  };
}

test("V664 troca o edital, guarda o que saiu e mantém registros e peças", () => {
  const { context, api } = load();
  const state = realState();
  const result = context.applyPcprPcma2026Migration(state);
  assert.equal(result.v664, "migrated");
  assert.equal(api.items.length, 257);
  assert.equal(state.syllabusItems.length, 257 + 1);
  assert.ok(state.syllabusItems.some((item) => item.id === "peca-1"));
  assert.deepEqual(state.dailyGoals.map((goal) => goal.id).sort(), ["andamento-com-tempo", "feita"]);
  assert.equal(state.legacyArchiveV664.syllabusItems.length, 220);
  assert.equal(state.legacyArchiveV664.dailyGoals.length, 61);
  assert.equal(state.studies.length, 1);
  assert.equal(state.schedulableSettings["old-1"], undefined);
  assert.equal(state.schedulableSettings["pcma-delegado-v664-001"].availability, "Agendável");
  assert.ok(state.syllabusItems.filter((item) => item.importMeta?.v664).every((item) => item.status === "Não iniciado"));
});

test("V664 não deixa o catálogo antigo nem abas antigas devolverem o que saiu", () => {
  const { context, calls } = load();
  const state = realState();
  context.applyPcprPcma2026Migration(state);
  const oldTab = realState();
  state.syllabusItems.push(...oldTab.syllabusItems.slice(0, 10));
  state.dailyGoals.push(...oldTab.dailyGoals.slice(0, 5), { id: "nova-de-aba-antiga", status: "Pendente", syllabusItemId: "old-9" });
  state.dailyGoals.push({ id: "nova-meta-dele", status: "Pendente", syllabusItemId: "pcma-delegado-v664-010" });
  const result = context.applyPcprPcma2026Migration(state);
  assert.equal(result.v664, "reapplied");
  assert.equal(calls(), 0, "o catálogo antigo não roda depois da V664");
  assert.ok(!state.syllabusItems.some((item) => String(item.id).startsWith("old-")));
  assert.ok(!state.dailyGoals.some((goal) => goal.id === "nova-de-aba-antiga"));
  assert.ok(state.dailyGoals.some((goal) => goal.id === "nova-meta-dele"));
});

test("V664 tira só a disciplina do edital antigo que ficou vazia e sem estudo", () => {
  const { context } = load();
  const state = realState();
  state.syllabusItems.push({ id: "old-cf", discipline: "CIÊNCIAS FORENSES", subject: "Antigo" }, { id: "old-delta", discipline: "DEDICAÇÃO DELTA", subject: "Semana" });
  state.subjects = [
    { id: "sub-cf", name: "CIÊNCIAS FORENSES", importedFromSyllabus: true },
    { id: "sub-delta", name: "DEDICAÇÃO DELTA", importedFromSyllabus: true },
    { id: "sub-penal", name: "DIREITO PENAL", importedFromSyllabus: true },
    { id: "sub-manual", name: "CIÊNCIAS FORENSES", importedFromSyllabus: false }
  ];
  state.studies = [{ id: "s1", subjectId: "sub-delta" }];
  context.applyPcprPcma2026Migration(state);
  assert.deepEqual(state.subjects.map((subject) => subject.id).sort(), ["sub-delta", "sub-manual", "sub-penal"]);
  assert.equal(JSON.stringify(state.legacyArchiveV664.subjects.map((subject) => subject.id)), JSON.stringify(["sub-cf"]));
});

test("V664: registros antigos não contam como estudo dos assuntos novos", () => {
  const { context, api } = load();
  const state = realState();
  state.studies = [{ id: "estudo-antigo", topic: "Perícia médico-legal", minutes: 23 }];
  context.applyPcprPcma2026Migration(state);
  context.state = state;
  vm.runInContext("var state = globalThis.state;", context);
  context.studiesForItem = () => [...state.studies];
  api.wrapLookup("studiesForItem");
  state.studies.push({ id: "estudo-novo", minutes: 40 });
  const novo = state.syllabusItems.find((item) => item.id === "pcma-delegado-v664-129");
  const peca = state.syllabusItems.find((item) => item.id === "peca-1");
  assert.equal(JSON.stringify(context.studiesForItem(novo).map((study) => study.id)), JSON.stringify(["estudo-novo"]));
  assert.equal(context.studiesForItem(peca).length, 2, "assunto que não é da V664 continua igual");
});

test("V664 não age sobre estado vazio ou incompleto", () => {
  const { context, calls } = load();
  const empty = { syllabusItems: [], dailyGoals: [] };
  const result = context.applyPcprPcma2026Migration(empty);
  assert.notEqual(result.v664, "migrated");
  assert.equal(calls(), 1);
  assert.equal(empty.migrations, undefined);
});

test("V664 não recoloca assunto novo excluído por ele depois", () => {
  const { context } = load();
  const state = realState();
  context.applyPcprPcma2026Migration(state);
  state.syllabusItems = state.syllabusItems.filter((item) => item.id !== "pcma-delegado-v664-005");
  context.applyPcprPcma2026Migration(state);
  assert.ok(!state.syllabusItems.some((item) => item.id === "pcma-delegado-v664-005"));
});

test("V664 está no bundle e espelhada em docs/", () => {
  assert.equal(fs.readFileSync(path.join(ROOT, "docs", "edital-pcma-delegado-v664.js"), "utf8"), SOURCE);
  const build = fs.readFileSync(path.join(ROOT, "build-bundles.mjs"), "utf8");
  assert.ok(build.indexOf('"edital-pcma-delegado-v664.js"') > build.indexOf('"pcpr-pcma-2026-migration.js"'));
  assert.ok(fs.readFileSync(path.join(ROOT, "docs", "app.bundle.js"), "utf8").includes("edital-pcma-delegado-v664"));
});
