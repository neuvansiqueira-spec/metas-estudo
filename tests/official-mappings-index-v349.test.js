const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");

// Carrega apenas o módulo PCPR/PCMA de app-v345.js, que é onde vivem
// officialMappingsForItem/isItemEnabledForPlanning. O arquivo inteiro depende
// do DOM, então isolamos o IIFE pelo marcador de origem.
function loadPcprModule() {
  const source = fs.readFileSync("app-v345.js", "utf8");
  const startMarker = "/* Aldus source: pcpr-pcma-2026-migration.js */";
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, "módulo pcpr-pcma-2026-migration não encontrado");
  const endMarker = "/* Aldus source: qconcursos-pdf-import-v181.js */";
  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, "fim do módulo pcpr-pcma-2026-migration não encontrado");

  const context = { console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  return context;
}

// Reimplementação literal do comportamento anterior à otimização, usada como
// referência de equivalência.
function legacyMappingsForItem(targetState = {}, syllabusItemId = "") {
  return (targetState.contestSyllabusMap || []).filter((mapping) => mapping.syllabusItemId === syllabusItemId);
}

// O array devolvido nasce dentro do vm e carrega o Array.prototype daquele
// realm, o que faz deepStrictEqual falhar por protótipo mesmo com conteúdo
// idêntico. Normalizamos para um array deste realm antes de comparar.
function plain(value) {
  return [...value];
}

function buildMap(size) {
  const out = [];
  for (let i = 0; i < size; i += 1) {
    out.push({
      id: `m${i}`,
      syllabusItemId: `item-${i % 40}`,
      contestId: i % 2 ? "pcpr-2026-delegado" : "pcma-2026-delegado",
      code: `C${i}`,
      classification: "A"
    });
  }
  return out;
}

test("índice devolve exatamente o mesmo resultado da varredura anterior", () => {
  const { officialMappingsForItem } = loadPcprModule();
  const state = { contestSyllabusMap: buildMap(300) };
  const ids = [...new Set(state.contestSyllabusMap.map((m) => m.syllabusItemId))];

  for (const id of [...ids, "inexistente", ""]) {
    assert.deepEqual(
      plain(officialMappingsForItem(state, id)),
      legacyMappingsForItem(state, id),
      `divergência para syllabusItemId=${id}`
    );
  }
});

test("resultado acompanha inclusão via push (mergeArrays muta no lugar)", () => {
  const { officialMappingsForItem } = loadPcprModule();
  const state = { contestSyllabusMap: buildMap(50) };

  assert.equal(officialMappingsForItem(state, "item-novo").length, 0);
  state.contestSyllabusMap.push({ id: "novo", syllabusItemId: "item-novo", contestId: "pcpr-2026-delegado", code: "X", classification: "A" });
  assert.deepEqual(plain(officialMappingsForItem(state, "item-novo")), legacyMappingsForItem(state, "item-novo"));
});

test("resultado acompanha troca do array (upsertSystemRecords devolve novo)", () => {
  const { officialMappingsForItem } = loadPcprModule();
  const state = { contestSyllabusMap: buildMap(50) };
  officialMappingsForItem(state, "item-1");

  state.contestSyllabusMap = [{ id: "z", syllabusItemId: "item-1", contestId: "pcpr-2026-delegado", code: "Z", classification: "B" }];
  assert.deepEqual(plain(officialMappingsForItem(state, "item-1")), legacyMappingsForItem(state, "item-1"));
  assert.equal(officialMappingsForItem(state, "item-2").length, 0);
});

test("array vazio e coleção ausente continuam devolvendo lista vazia", () => {
  const { officialMappingsForItem } = loadPcprModule();
  assert.deepEqual(plain(officialMappingsForItem({ contestSyllabusMap: [] }, "x")), []);
  assert.deepEqual(plain(officialMappingsForItem({}, "x")), []);
});

test("mutar o retorno não corrompe o índice", () => {
  const { officialMappingsForItem } = loadPcprModule();
  const state = { contestSyllabusMap: buildMap(50) };

  const first = officialMappingsForItem(state, "item-3");
  const originalLength = first.length;
  assert.ok(originalLength > 0);
  first.push({ id: "intruso" });
  first.pop();
  first.length = 0;

  assert.equal(officialMappingsForItem(state, "item-3").length, originalLength);
});

test("isItemEnabledForPlanning permanece consistente com o índice", () => {
  const context = loadPcprModule();
  const { isItemEnabledForPlanning } = context;
  const state = {
    syllabusItems: [
      { id: "item-0" },
      { id: "item-1", hiddenFromCatalog: true },
      { id: "sem-mapeamento" }
    ],
    contestSyllabusMap: buildMap(80),
    planningMode: "joint",
    contestPlanningProfiles: {
      joint: { contestIds: ["pcpr-2026-delegado", "pcma-2026-delegado"], categories: { A: 1 }, examDate: "2026-10-11" }
    }
  };

  // item sem mapeamento oficial é sempre planejável
  assert.equal(isItemEnabledForPlanning(state, "sem-mapeamento", "2026-08-17"), true);
  // item oculto do catálogo nunca é planejável
  assert.equal(isItemEnabledForPlanning(state, "item-1", "2026-08-17"), false);
  // item mapeado em concurso/categoria ativos é planejável
  assert.equal(isItemEnabledForPlanning(state, "item-0", "2026-08-17"), true);
});

// O planejamento consulta clones do estado alternadamente com o estado vivo.
// Com um cache único isso reconstruiria o índice a cada chamada, ficando mais
// lento que a varredura original — exatamente a regressão que o WeakMap evita.
test("alternar entre estado vivo e clones não degrada nem corrompe o resultado", () => {
  const { officialMappingsForItem } = loadPcprModule();
  const live = { contestSyllabusMap: buildMap(2000) };
  const clone = { contestSyllabusMap: live.contestSyllabusMap.map((m) => ({ ...m })) };
  const ids = [...new Set(live.contestSyllabusMap.map((m) => m.syllabusItemId))];

  // correção: alternar não pode mudar o resultado de nenhum dos dois
  for (const id of ids) {
    assert.deepEqual(plain(officialMappingsForItem(live, id)), legacyMappingsForItem(live, id));
    assert.deepEqual(plain(officialMappingsForItem(clone, id)), legacyMappingsForItem(clone, id));
  }

  const alternating = process.hrtime.bigint();
  for (let round = 0; round < 20; round += 1) {
    ids.forEach((id) => { officialMappingsForItem(live, id); officialMappingsForItem(clone, id); });
  }
  const alternatingNs = Number(process.hrtime.bigint() - alternating);

  const legacy = process.hrtime.bigint();
  for (let round = 0; round < 20; round += 1) {
    ids.forEach((id) => { legacyMappingsForItem(live, id); legacyMappingsForItem(clone, id); });
  }
  const legacyNs = Number(process.hrtime.bigint() - legacy);

  assert.ok(
    alternatingNs * 4 < legacyNs,
    `alternância não pode anular o ganho; alternado=${(alternatingNs / 1e6).toFixed(1)}ms legado=${(legacyNs / 1e6).toFixed(1)}ms`
  );
});

test("índice é assintoticamente melhor que a varredura linear", () => {
  const { officialMappingsForItem } = loadPcprModule();
  const state = { contestSyllabusMap: buildMap(4000) };
  const ids = [...new Set(state.contestSyllabusMap.map((m) => m.syllabusItemId))];

  const indexed = process.hrtime.bigint();
  for (let round = 0; round < 40; round += 1) ids.forEach((id) => officialMappingsForItem(state, id));
  const indexedNs = Number(process.hrtime.bigint() - indexed);

  const legacy = process.hrtime.bigint();
  for (let round = 0; round < 40; round += 1) ids.forEach((id) => legacyMappingsForItem(state, id));
  const legacyNs = Number(process.hrtime.bigint() - legacy);

  assert.ok(
    indexedNs * 4 < legacyNs,
    `esperava ganho expressivo; indexado=${(indexedNs / 1e6).toFixed(1)}ms legado=${(legacyNs / 1e6).toFixed(1)}ms`
  );
});
