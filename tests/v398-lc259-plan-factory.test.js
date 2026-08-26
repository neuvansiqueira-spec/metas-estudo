const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("factory-lc259-link-v398.js", "utf8");
const docsSource = fs.readFileSync("docs/factory-lc259-link-v398.js", "utf8");
const startup = fs.readFileSync("startup-planning-stability-v387.js", "utf8");

function lcGoal() {
  return {
    id: "goal-lc259",
    discipline: "LEGISLAÇÃO ESTADUAL E INSTITUCIONAL",
    subject: "Estruturação das carreiras da Polícia Civil do Estado do Paraná: Lei Complementar Estadual n.º 259, de 21 de julho de 2023, e suas alterações posteriores."
  };
}

function lcItem(overrides = {}) {
  return {
    id: "leg-259",
    discipline: "LEGISLAÇÃO ESTADUAL E INSTITUCIONAL",
    subject: "Lei Complementar Estadual n.º 259, de 21 de julho de 2023",
    ...overrides
  };
}

function run(original = () => ({ items: [], mode: "none" })) {
  const listeners = {};
  const context = {
    console,
    exactFactoryGoalMatches: original,
    window: {
      addEventListener(name, callback) { listeners[name] = callback; }
    },
    module: { exports: {} },
    exports: {},
    Object,
    Array,
    String,
    Set,
    Map
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, listeners };
}

test("V398 vincula LC 259 à Fábrica quando o ID exato falha", () => {
  const { context } = run();
  const goal = lcGoal();
  const item = lcItem();
  const result = context.exactFactoryGoalMatches(goal, [item]);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, "leg-259");
  assert.equal(result.mode, "lc259-semantic-v398");
});

test("V398 preserva vínculo exato já encontrado pelo núcleo", () => {
  const exact = { id: "exact" };
  const { context } = run(() => ({ items: [exact], mode: "id" }));
  const result = context.exactFactoryGoalMatches(lcGoal(), [lcItem()]);
  assert.equal(result.items[0].id, "exact");
  assert.equal(result.mode, "id");
});

test("V398 não inventa vínculo se houver duas LC 259 indistinguíveis", () => {
  const { context } = run();
  const result = context.exactFactoryGoalMatches(lcGoal(), [
    lcItem({ id: "leg-259-a", subject: "Lei Complementar Estadual n.º 259" }),
    lcItem({ id: "leg-259-b", subject: "Lei Complementar Estadual n.º 259" })
  ]);
  assert.equal(result.items.length, 0);
  assert.equal(result.mode, "none");
});

test("V398 não interfere em outras disciplinas", () => {
  const { context } = run();
  const result = context.exactFactoryGoalMatches(
    { discipline: "DIREITO PENAL", subject: "Teoria da Pena" },
    [{ id: "penal", discipline: "DIREITO PENAL", subject: "Teoria da Pena" }]
  );
  assert.equal(result.items.length, 0);
});

test("V398 é somente leitura e desativa reparos automáticos antigos", () => {
  for (const token of ["saveData(", "autoSyncAfterSave(", "state.dailyGoals", "dailyGoals.push(", "dailyGoals.splice("]) {
    assert.equal(source.includes(token), false, `V398 não pode escrever no planejamento: ${token}`);
  }
  assert.match(source, /readOnly: true/);
  assert.match(startup, /20260826-planning-consent-guard-v398/);
  assert.match(startup, /options\?\.explicit === true \|\| options\?\.allowRebuild === true/);
  assert.match(startup, /legacyAutomaticRepairsDisabledV398/);
  assert.doesNotMatch(startup, /\n\s*loadAuthorizedRestoreV391\(\);\n\s*loadAuthorizedCorrectionV392\(\);\n\s*loadExplicitAlignmentV393\(\);\n\s*\n\s*if \(typeof window/);
});

test("V398 mantém paridade raiz/docs", () => {
  assert.equal(source, docsSource);
});
