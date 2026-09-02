const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("script.js", "utf8");
const start = source.indexOf("function factorySyncLinkTokens(item = {}) {");
const end = source.indexOf("function reopenFactoryTheme(id) {", start);
assert.ok(start >= 0 && end > start, "trecho de sincronização da Fábrica não localizado");
const syncSource = source.slice(start, end);

function runtime(count = 112, withCreatedDuplicates = false) {
  const groups = Array.from({ length: count }, (_, index) => ({
    key: `edital:ciencias forenses|tema ${index}`,
    discipline: "CIÊNCIAS FORENSES",
    subject: `Tema ${index}`,
    itemIds: [`syllabus-${index}`],
    itemKeys: [`id:syllabus-${index}`],
    subtopics: [], references: [], topics: []
  }));
  const oldItems = groups.map((group, index) => ({
    id: `factory-old-${index}`,
    disciplina: "MEDICINA LEGAL",
    tema: group.subject,
    createdAt: "2026-08-01T00:00:00.000Z",
    syllabusItemId: group.itemIds[0],
    syllabusItemIds: [...group.itemIds],
    editalLink: { groupKey: `edital:medicina legal|tema ${index}`, itemIds: [...group.itemIds], itemKeys: [...group.itemKeys] },
    modules: { resumo: { status: index === 0 ? "Aprovado" : "Não iniciado" } }
  }));
  const agenda = withCreatedDuplicates ? oldItems.flatMap((old, index) => [old, {
    id: `factory-new-${index}`,
    disciplina: "CIÊNCIAS FORENSES",
    tema: old.tema,
    createdAt: "2026-09-01T00:00:00.000Z",
    syllabusItemId: old.syllabusItemId,
    syllabusItemIds: [...old.syllabusItemIds],
    editalLink: { groupKey: groups[index].key, itemIds: [...old.syllabusItemIds], itemKeys: [...groups[index].itemKeys] },
    modules: { resumo: { status: "Não iniciado" } }
  }]) : oldItems;
  const state = { factoryAgenda: agenda, factoryItems: agenda };
  let ids = 0;
  const context = {
    state,
    canonical(value) { return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR"); },
    ensureFactoryAgenda() { return state.factoryAgenda; },
    factoryActiveEditalGroups() { return groups; },
    normalizeFactoryItem(item) { return JSON.parse(JSON.stringify(item)); },
    createId() { return `created-${++ids}`; },
    Date, JSON, Map, Set
  };
  vm.createContext(context);
  vm.runInContext(syncSource, context);
  return { context, state };
}

test("renomear MEDICINA LEGAL para CIÊNCIAS FORENSES reutiliza os 112 itens vinculados", () => {
  const { context, state } = runtime(112, false);
  const first = context.syncFactoryWithActiveEdital();
  assert.equal(first.created, 0);
  assert.equal(first.mergedDuplicates, 0);
  assert.equal(state.factoryAgenda.length, 112);
  assert.ok(state.factoryAgenda.every((item) => item.disciplina === "CIÊNCIAS FORENSES"));
  assert.ok(state.factoryAgenda.every((item, index) => item.editalLink.groupKey === `edital:ciencias forenses|tema ${index}`));
  const second = context.syncFactoryWithActiveEdital();
  assert.equal(second.created, 0);
  assert.equal(second.mergedDuplicates, 0);
  assert.equal(state.factoryAgenda.length, 112);
});

test("duplicatas já criadas pela troca de groupKey são consolidadas sem perder progresso", () => {
  const { context, state } = runtime(112, true);
  const result = context.syncFactoryWithActiveEdital();
  assert.equal(result.created, 0);
  assert.equal(result.mergedDuplicates, 112);
  assert.equal(state.factoryAgenda.length, 112);
  assert.equal(state.factoryAgenda[0].modules.resumo.status, "Aprovado");
  assert.ok(state.factoryAgenda[0].duplicateFactoryItemIds.includes("factory-old-0"));
  assert.ok(state.factoryAgenda[0].duplicateFactoryItemIds.includes("factory-new-0"));
});
