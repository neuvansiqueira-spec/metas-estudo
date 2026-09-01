const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("factory-queue-integrity-v236.js", "utf8");

function runtimeWithAgenda(count = 112) {
  const groups = Array.from({ length: count }, (_, index) => ({
    key: `edital:direito civil|tema ${index}`,
    discipline: "DIREITO CIVIL",
    subject: `Tema ${index}`,
    itemIds: [`syllabus-${index}`],
    itemKeys: [`item-${index}`],
    subtopics: [`Subtema ${index}`],
    references: [`Referência ${index}`],
    topics: [`Tópico ${index}`]
  }));
  const agenda = groups.map((group, index) => ({
    id: `factory-existing-${index}`,
    disciplina: index % 2 ? "Direito Civil" : "DIREITO CIVIL",
    tema: index % 2 ? `TEMA ${index}` : `Tema ${index}`,
    editalSubtemas: [`Legado ${index}`],
    modules: { resumo: { status: "Não iniciado" } }
  }));
  const state = { factoryAgenda: agenda, factoryItems: agenda };
  let createdSequence = 0;

  const context = {
    console,
    state,
    globalThis: null,
    location: { hash: "" },
    document: {
      querySelector() { return null; },
      querySelectorAll() { return []; },
      getElementById() { return null; },
      addEventListener() {},
      createTreeWalker() { return { nextNode() { return null; } }; }
    },
    NodeFilter: { SHOW_TEXT: 4 },
    factoryActiveEditalGroups() { return groups; },
    ensureFactoryAgenda() {
      state.factoryAgenda ||= [];
      state.factoryItems = state.factoryAgenda;
      return state.factoryAgenda;
    },
    syncFactoryWithActiveEdital() {
      const current = context.ensureFactoryAgenda();
      const byKey = new Map(current
        .map((item) => [String(item?.editalLink?.groupKey || ""), item])
        .filter(([key]) => key));
      let created = 0;
      for (const group of groups) {
        let item = byKey.get(group.key);
        if (!item) {
          item = {
            id: `factory-created-${createdSequence++}`,
            disciplina: group.discipline,
            tema: group.subject,
            editalLink: { groupKey: group.key }
          };
          current.push(item);
          byKey.set(group.key, item);
          created += 1;
        }
        item.editalLink = { ...(item.editalLink || {}), groupKey: group.key, itemIds: [...group.itemIds] };
      }
      state.factoryAgenda = current;
      state.factoryItems = current;
      return { created, total: current.length };
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, state, groups };
}

test("Fábrica não recria os 112 itens existentes quando faltava editalLink.groupKey", () => {
  const { context, state } = runtimeWithAgenda(112);

  const first = context.syncFactoryWithActiveEdital();
  assert.equal(first.created, 0);
  assert.equal(first.existingAgendaAligned, 112);
  assert.equal(state.factoryAgenda.length, 112);
  assert.equal(new Set(state.factoryAgenda.map((item) => item.id)).size, 112);
  assert.ok(state.factoryAgenda.every((item) => item.editalLink?.groupKey));

  const second = context.syncFactoryWithActiveEdital();
  assert.equal(second.created, 0);
  assert.equal(second.existingAgendaAligned, 0);
  assert.equal(state.factoryAgenda.length, 112);
});

test("identidade de registro da Fábrica ignora caixa, acento e subtemas para não duplicar o mesmo tema", () => {
  const { context } = runtimeWithAgenda(0);
  const api = context.__ALDUS_FACTORY_QUEUE_INTEGRITY_V236__;
  const entries = [
    {
      id: "a",
      disciplina: "DIREITO ADMINISTRATIVO",
      tema: "Atos Administrativos",
      editalSubtemas: ["Conceito"],
      editalLink: { itemIds: ["s1"] },
      modules: { resumo: { status: "Não iniciado" } }
    },
    {
      id: "b",
      disciplina: "Direito administrativo",
      tema: "Atos administrativos",
      editalSubtemas: ["Atributos"],
      editalLink: { itemIds: ["s2"] },
      modules: { resumo: { status: "Em produção" } }
    }
  ];

  const sanitized = api.sanitizeFactoryAgendaEntries(entries);
  assert.equal(sanitized.length, 1);
  assert.deepEqual([...sanitized[0].editalSubtemas].sort(), ["Atributos", "Conceito"]);
  assert.deepEqual([...sanitized[0].editalLink.itemIds].sort(), ["s1", "s2"]);
  assert.deepEqual([...sanitized[0].duplicateFactoryItemIds].sort(), ["a", "b"]);
  assert.equal(api.hotfix, "factory-queue-integrity-hotfix6");
});
