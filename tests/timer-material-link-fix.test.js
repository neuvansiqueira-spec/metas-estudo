const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const rootSource = fs.readFileSync("timer-material-link-fix.js", "utf8");
const docsSource = fs.readFileSync("docs/timer-material-link-fix.js", "utf8");
const rootServiceWorker = fs.readFileSync("service-worker.js", "utf8");
const docsServiceWorker = fs.readFileSync("docs/service-worker.js", "utf8");
const rootSyncDeletions = fs.readFileSync("sync-integral-deletions.js", "utf8");
const docsSyncDeletions = fs.readFileSync("docs/sync-integral-deletions.js", "utf8");

function createRuntime() {
  const modal = { hidden: false };
  const discipline = { value: "DIREITO PENAL" };
  const subject = { value: "Teoria Geral do Crime" };
  const materialSelect = {
    value: "",
    options: [],
    dataset: {},
    replaceChildren(...options) {
      this.options = options;
    }
  };
  const elements = {
    timerStudyModal: modal,
    timerStudyDiscipline: discipline,
    timerStudySubject: subject,
    timerStudyMaterial: materialSelect
  };
  const listeners = {};

  function Option(label, value) {
    this.label = label;
    this.textContent = label;
    this.value = value;
    this.dataset = {};
  }

  const context = {
    console,
    Option,
    clearTimeout() {},
    setTimeout(callback) { callback(); return 1; },
    document: {
      readyState: "complete",
      getElementById(id) { return elements[id] || null; },
      addEventListener(type, callback) { listeners[type] = callback; }
    },
    state: {
      dailyGoals: [{ id: "goal-1", discipline: "DIREITO PENAL", subject: "Teoria Geral do Crime", syllabusItemId: "item-1" }],
      syllabusItems: [{ id: "item-1", discipline: "DIREITO PENAL", subject: "Teoria Geral do Crime" }],
      materials: []
    },
    floatingTimer: { goalId: "goal-1", material: "" },
    floatingTimerGoal() { return context.state.dailyGoals[0]; },
    dailyGoalMaterialIdentity(material) { return material.id; },
    resolveAvailableMaterials(criteria) {
      assert.deepEqual(criteria, {
        discipline: "DIREITO PENAL",
        subject: "Teoria Geral do Crime",
        syllabusItemId: "item-1"
      });
      return [{
        id: "factory-material-1",
        title: "Resumo/Aula — Teoria Geral do Crime",
        source: "factory",
        discipline: "DIREITO PENAL",
        subject: "Teoria Geral do Crime",
        usefulPages: 37
      }];
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(rootSource, context, { filename: "timer-material-link-fix.js" });
  return { context, materialSelect };
}

test("cronômetro usa a fonte central e seleciona material da Fábrica", () => {
  const { context, materialSelect } = createRuntime();
  const count = context.MetasTimerMaterialLinkFix.populateTimerMaterialOptions();
  assert.equal(count, 1);
  assert.equal(materialSelect.options.length, 2);
  assert.equal(materialSelect.options[0].value, "");
  assert.equal(materialSelect.options[1].value, "factory-material-1");
  assert.match(materialSelect.options[1].textContent, /Fábrica de Resumos/);
  assert.equal(materialSelect.value, "factory-material-1");
  assert.equal(materialSelect.dataset.timerMaterialCount, "1");
});

test("runtime observa abertura, salvamento e troca de conteúdo", () => {
  assert.match(rootSource, /resolveAvailableMaterials/);
  assert.match(rootSource, /data-timer-action=\\"save\\"/);
  assert.match(rootSource, /timerStudyDiscipline/);
  assert.match(rootSource, /timerStudySubject/);
  assert.match(rootSource, /MutationObserver/);
});

test("site e app publicam exatamente a mesma correção", () => {
  assert.equal(rootSource, docsSource);
  assert.equal(rootServiceWorker, docsServiceWorker);
  assert.equal(rootSyncDeletions, docsSyncDeletions);
});

test("v40 renova cache e carrega o corretor diretamente", () => {
  assert.match(rootServiceWorker, /20260717-material-cronometro-v40/);
  assert.match(rootServiceWorker, /startup-v14/);
  assert.match(rootServiceWorker, /timer-material-link-fix\.js/);
  assert.match(rootServiceWorker, /data-timer-material-link-fix=\\"v40\\"/);
  assert.match(rootSyncDeletions, /installTimerMaterialLinkFixAsset/);
});
