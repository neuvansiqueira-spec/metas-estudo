const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const logicSource = fs.readFileSync(path.join(__dirname, "..", "factory-destination-recursive-v230.js"), "utf8");
const ROOT = "1fBp2Ibx4_acuP4fvIK26SKkVtLJmEcOJ";

function folder(id, name, parent) {
  return { id, name, parents: parent ? [parent] : [] };
}

function makeContext(items = []) {
  const state = { factoryAgenda: items, factoryItems: items, migrations: {} };
  const localValues = new Map();
  const context = vm.createContext({
    console,
    Date,
    Map,
    Set,
    URLSearchParams,
    queueMicrotask,
    setTimeout,
    clearTimeout,
    state,
    location: { hash: "#fabrica-resumos" },
    localStorage: {
      getItem: (key) => localValues.get(key) || null,
      setItem: (key, value) => localValues.set(key, String(value)),
      removeItem: (key) => localValues.delete(key)
    },
    ensureFactoryAgenda: () => state.factoryAgenda,
    saveData: () => { context.saved = (context.saved || 0) + 1; },
    renderFactory: () => { context.rendered = (context.rendered || 0) + 1; }
  });
  vm.runInContext(logicSource, context, { filename: "factory-destination-recursive-v230.js" });
  return context;
}

function destinationFolders() {
  return [
    folder(ROOT, "PASTAS_DE_DESTINO", null),
    folder("proc", "02_DIREITO_PROCESSUAL_PENAL", ROOT),
    folder("inquerito", "2_3_INQUERITO_POLICIAL", "proc"),
    folder("arquivamento", "2_3_7_ARQUIVAMENTO", "inquerito"),
    folder("admin", "14_DIREITO_ADMINISTRATIVO", ROOT),
    folder("admin-gestao", "05_DIREITO_ADMINISTRATIVO_E_GESTAO_PUBLICA", ROOT),
    folder("atos-admin", "9_3_ATOS_ADMINISTRATIVOS", "admin"),
    folder("atos-gestao", "5_4_ATOS_ADMINISTRATIVOS", "admin-gestao"),
    folder("fora", "02_DIREITO_PROCESSUAL_PENAL", "outra-raiz"),
    folder("arquivamento-fora", "2_3_7_ARQUIVAMENTO", "fora")
  ];
}

test("percorre os níveis até a pasta específica do tema", () => {
  const item = {
    disciplina: "Direito Processual Penal",
    tema: "Arquivamento",
    editalLink: { groupKey: "2.3.7" }
  };
  const context = makeContext([item]);
  const tree = context.__buildFactoryDestinationTreeV230(destinationFolders(), ROOT);
  const result = context.__applyFactoryDestinationToItemV230(item, tree);

  assert.equal(result.status, "topic");
  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/arquivamento");
  assert.equal(item.factoryDestinationFolderMatchId, "arquivamento");
  assert.match(item.factoryDestinationFolderMatchPath, /2_3_INQUERITO_POLICIAL.*2_3_7_ARQUIVAMENTO/);
});

test("considera apenas descendentes da pasta principal informada", () => {
  const context = makeContext();
  const tree = context.__buildFactoryDestinationTreeV230(destinationFolders(), ROOT);
  const ids = new Set(tree.nodes.map((node) => node.id));

  assert.equal(ids.has("arquivamento"), true);
  assert.equal(ids.has("arquivamento-fora"), false);
  assert.equal(ids.has("fora"), false);
});

test("remove o fallback amplo da disciplina quando não existe correspondência segura", () => {
  const item = {
    disciplina: "Direito Processual Penal",
    tema: "Tema sem pasta correspondente",
    factoryDestinationFolder: "https://drive.google.com/drive/folders/proc",
    factoryDestinationFolderCatalogVersion: "20260803-pastas-destino-fabrica-v222",
    factoryDestinationFolderMatchType: "discipline-fallback"
  };
  const context = makeContext([item]);
  const tree = context.__buildFactoryDestinationTreeV230(destinationFolders(), ROOT);
  const result = context.__applyFactoryDestinationToItemV230(item, tree);

  assert.equal(result.status, "managed-cleared");
  assert.equal(item.factoryDestinationFolder, undefined);
  assert.equal(item.factoryDestinationFolderMatchType, undefined);
});

test("preserva link preenchido manualmente", () => {
  const manual = "https://drive.google.com/drive/folders/manual";
  const item = { disciplina: "Direito Processual Penal", tema: "Arquivamento", factoryDestinationFolder: manual };
  const context = makeContext([item]);
  const tree = context.__buildFactoryDestinationTreeV230(destinationFolders(), ROOT);
  const result = context.__applyFactoryDestinationToItemV230(item, tree);

  assert.equal(result.status, "manual-preserved");
  assert.equal(item.factoryDestinationFolder, manual);
  assert.equal(item.factoryDestinationFolderCatalogVersion, undefined);
});

test("distingue Direito Administrativo da disciplina combinada com Gestão Pública", () => {
  const pure = { disciplina: "Direito Administrativo", tema: "9.3 Atos administrativos" };
  const combined = { disciplina: "Direito Administrativo e Gestão Pública", tema: "5.4 Atos administrativos" };
  const context = makeContext([pure, combined]);
  const tree = context.__buildFactoryDestinationTreeV230(destinationFolders(), ROOT);

  context.__applyFactoryDestinationToItemV230(pure, tree);
  context.__applyFactoryDestinationToItemV230(combined, tree);

  assert.equal(pure.factoryDestinationFolder, "https://drive.google.com/drive/folders/atos-admin");
  assert.equal(combined.factoryDestinationFolder, "https://drive.google.com/drive/folders/atos-gestao");
});

test("é idempotente após gravar a pasta recursiva correta", () => {
  const item = { disciplina: "Direito Processual Penal", tema: "2.3.7 Arquivamento" };
  const context = makeContext([item]);
  const tree = context.__buildFactoryDestinationTreeV230(destinationFolders(), ROOT);

  const first = context.__applyFactoryDestinationToItemV230(item, tree);
  const second = context.__applyFactoryDestinationToItemV230(item, tree);

  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.equal(second.status, "topic");
});
