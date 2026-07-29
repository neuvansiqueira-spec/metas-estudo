const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

function linkageRuntime() {
  const start = script.indexOf("function materialAvailable");
  const end = script.indexOf("function materialTitleById");
  assert.ok(start >= 0 && end > start);
  const source = script.slice(start, end);
  return new Function(`
    const state = {};
    function materialPhysicalFileIdentity(material = {}) { return material.id || material.link || "material"; }
    ${source}
    return {
      canonicalStudyDescriptor,
      buildCrossAreaLinkageReportV173,
      dailyPlanSubjectsCompatible,
      materialMatchesAssociation,
      buildDailyPlanProjection
    };
  `)();
}

test("descrição canônica acompanha o mesmo UUID em metas, materiais e estudos", () => {
  const runtime = linkageRuntime();
  const targetState = {
    syllabusItems: [{ id: "edital-1", discipline: "Direito Constitucional", subject: "Controle de Constitucionalidade", reference: "Item 4" }],
    dailyGoals: [{ id: "meta-1", syllabusItemId: "edital-1", discipline: "Nome antigo", subject: "Descrição antiga" }],
    materials: [{ id: "material-1", syllabusItemId: "edital-1", discipline: "Nome antigo", subject: "Descrição antiga" }],
    factoryAgenda: [],
    studies: [{ id: "estudo-1", syllabusItemId: "edital-1", discipline: "Nome antigo", topic: "Descrição antiga" }]
  };
  const descriptor = runtime.canonicalStudyDescriptor(targetState.dailyGoals[0], targetState);
  assert.equal(descriptor.discipline, "Direito Constitucional");
  assert.equal(descriptor.subject, "Controle de Constitucionalidade");
  assert.equal(descriptor.reference, "Item 4");
  assert.equal(descriptor.descriptionDrift, true);

  const report = runtime.buildCrossAreaLinkageReportV173(targetState);
  assert.equal(report.goals.exact, 1);
  assert.equal(report.materials.exact, 1);
  assert.equal(report.studies.exact, 1);
  assert.equal(report.goals.descriptionDrift, 1);
});

test("vínculos rejeitam assunto parecido e priorizam o UUID exato", () => {
  const runtime = linkageRuntime();
  assert.equal(runtime.dailyPlanSubjectsCompatible("Princípios administrativos", "Princípios administrativos e poderes"), false);
  assert.equal(runtime.dailyPlanSubjectsCompatible("Princípios Administrativos", "principios administrativos"), true);

  const wrongUuid = { syllabusItemId: "edital-2", discipline: "Administrativo", subject: "Princípios administrativos" };
  assert.equal(runtime.materialMatchesAssociation(wrongUuid, {
    syllabusItemId: "edital-1",
    discipline: "Administrativo",
    subject: "Princípios administrativos"
  }), false);

  const legacyExact = { discipline: "Administrativo", subject: "Princípios administrativos" };
  assert.equal(runtime.materialMatchesAssociation(legacyExact, {
    discipline: "Administrativo",
    subject: "principios administrativos"
  }), true);
});

test("Plano do Dia agrega apenas Fábrica e Materiais exatos", () => {
  const runtime = linkageRuntime();
  const targetState = {
    syllabusItems: [
      { id: "edital-1", discipline: "Administrativo", subject: "Princípios administrativos" },
      { id: "edital-2", discipline: "Administrativo", subject: "Princípios administrativos e poderes" }
    ],
    dailyGoals: [{ id: "meta-1", date: "2026-07-29", syllabusItemId: "edital-1", discipline: "Administrativo", subject: "Princípios administrativos" }],
    factoryAgenda: [
      { id: "fabrica-certa", syllabusItemId: "edital-1", disciplina: "Administrativo", tema: "Princípios administrativos" },
      { id: "fabrica-errada", syllabusItemId: "edital-2", disciplina: "Administrativo", tema: "Princípios administrativos e poderes" }
    ],
    materials: [
      { id: "material-certo", syllabusItemId: "edital-1", discipline: "Administrativo", subject: "Princípios administrativos" },
      { id: "material-errado", syllabusItemId: "edital-2", discipline: "Administrativo", subject: "Princípios administrativos e poderes" }
    ]
  };
  const [projection] = runtime.buildDailyPlanProjection("2026-07-29", targetState);
  assert.deepEqual(projection.factoryItems.map((item) => item.id), ["fabrica-certa"]);
  assert.deepEqual(projection.materialGroups.flatMap((group) => group.materials).map((item) => item.id), ["material-certo"]);
});

test("cronômetro e cadastro de material preservam o item exato do edital", () => {
  const timerStart = script.slice(script.indexOf("function startFloatingTimer"), script.indexOf("function pauseOrResumeFloatingTimer"));
  const timerSave = script.slice(script.indexOf("function submitTimerStudyModal"), script.indexOf("const $ ="));
  assert.match(timerStart, /canonicalStudyDescriptor\(goal\)/);
  assert.match(timerStart, /syllabusItemId: descriptor\.syllabusItemId/);
  assert.match(timerSave, /syllabusItemId: descriptor\.syllabusItemId/);
  assert.match(timerSave, /discipline: savedDiscipline/);
  assert.match(index, /id="materialSyllabusItem"/);
  assert.match(script, /data-syllabus-item-id=/);
  assert.match(script, /Existem vários itens do edital/);
});

test("Fábrica sincroniza descrição e IDs sem excluir histórico", () => {
  const block = script.slice(script.indexOf("function syncFactoryWithActiveEdital"), script.indexOf("function reopenFactoryTheme"));
  assert.match(block, /existing\.disciplina = group\.discipline/);
  assert.match(block, /existing\.tema = group\.subject/);
  assert.match(block, /existing\.syllabusItemIds = group\.itemIds/);
  assert.doesNotMatch(block, /splice\(|deleteFactoryItem|filter\(\(item\) => item\.id !==/);
});
