const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");

function loadRecovery({ state, storage = new Map() }) {
  const context = {
    console,
    state,
    saves: 0,
    setTimeout: () => 0,
    clearTimeout: () => {},
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    },
    saveData() { context.saves += 1; return true; },
    renderQuestionBank() {},
    renderQuestionHistory() {}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("simulado-recovery-v319.js", "utf8"), context);
  return { context, api: context.__ALDUS_SIMULADO_RECOVERY_V319__ };
}

test("V319 recupera questão por ID exato a partir de backup local", async () => {
  const storage = new Map();
  storage.set("metasConcursoData", JSON.stringify({
    questionBank: [{
      id: "simulado-abc-q001",
      disciplina: "Direito Penal",
      enunciado: "Questão completa",
      alternativas: { A: "a", B: "b" },
      gabarito: "A"
    }]
  }));
  const state = {
    questionBank: [],
    questionBankSessions: [{
      id: "simulado-interativo:simulado-abc",
      source: "simulado-interativo",
      items: [{ id: "simulado-abc-q001" }]
    }],
    simulados: []
  };

  const { context, api } = loadRecovery({ state, storage });
  const first = await api.run("test");
  assert.equal(state.questionBank.length, 1);
  assert.equal(state.questionBank[0].id, "simulado-abc-q001");
  assert.equal(first.repairedFromBackup, 1);
  assert.equal(first.missingAfter, 0);
  assert.equal(context.saves, 1);

  const second = await api.run("test-repeat");
  assert.equal(state.questionBank.length, 1);
  assert.equal(second.repairedFromBackup, 0);
  assert.equal(context.saves, 1);
});

test("V319 informa ausência de estado sem destruir os simulados locais", async () => {
  const storage = new Map();
  storage.set("aldusSimuladosInterativosV313", JSON.stringify({
    exams: [{ status: "completed", questions: [{ id: "simulado-x-q001" }] }]
  }));
  const context = {
    console,
    setTimeout: () => 0,
    localStorage: { getItem: (key) => storage.get(key) ?? null }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("simulado-recovery-v319.js", "utf8"), context);
  const report = await context.__ALDUS_SIMULADO_RECOVERY_V319__.run("pre-state");
  assert.equal(report.stateAvailable, false);
  assert.equal(report.localExams, 1);
  assert.equal(report.localQuestions, 1);
});

test("entrada principal carrega a V319 depois do shell", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.match(html, /simulado-recovery-v319\.js/);
  assert.match(html, /SIMULADO_RECOVERY_VERSION/);
});
