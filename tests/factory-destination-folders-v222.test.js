const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const logicSource = fs.readFileSync(path.join(__dirname, "..", "factory-destination-folders-v222.js"), "utf8");

function folder(id, title) {
  return { id, title, url: `https://drive.google.com/drive/folders/${id}` };
}

function makeContext(items = []) {
  const catalog = {
    version: "20260803-pastas-destino-fabrica-v222",
    disciplines: [
      {
        key: "direito-administrativo",
        folder: folder("admin", "14_DIREITO_ADMINISTRATIVO"),
        aliases: ["DIREITO ADMINISTRATIVO"],
        topics: [folder("admin-lgpd", "4_LEI_NO_13_709_2018"), folder("admin-atos", "9_3_ATOS_ADMINISTRATIVOS")]
      },
      {
        key: "administrativo-gestao",
        folder: folder("gestao", "05_DIREITO_ADMINISTRATIVO_E_GESTAO_PUBLICA"),
        aliases: ["DIREITO ADMINISTRATIVO E GESTAO PUBLICA"],
        topics: [folder("gestao-atos", "5_4_ATOS_ADMINISTRATIVOS")]
      },
      {
        key: "constitucional",
        folder: folder("const", "04_DIREITO_CONSTITUCIONAL"),
        aliases: ["DIREITO CONSTITUCIONAL"],
        topics: [folder("const-poder", "02_PODER_CONSTITUINTE_E_REFORMA"), folder("const-principios", "04_PRINCIPIOS_FUNDAMENTAIS")]
      }
    ]
  };
  const state = { factoryAgenda: items, factoryItems: items, migrations: {} };
  const context = vm.createContext({
    console,
    Date,
    queueMicrotask,
    setTimeout,
    clearTimeout,
    state,
    __FACTORY_DESTINATION_CATALOG_V222__: catalog,
    ensureFactoryAgenda: () => state.factoryAgenda,
    saveData: () => { context.saved = (context.saved || 0) + 1; }
  });
  vm.runInContext(logicSource, context, { filename: "factory-destination-folders-v222.js" });
  return context;
}

test("vincula assunto pelo código do edital", () => {
  const item = { disciplina: "Direito Constitucional", tema: "2. Poder constituinte e reforma" };
  const context = makeContext([item]);
  const report = context.__applyFactoryDestinationFoldersV222();
  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/const-poder");
  assert.equal(item.factoryDestinationFolderMatchType, "topic");
  assert.equal(report.topic, 1);
});

test("usa o número da lei para localizar a pasta do assunto", () => {
  const item = { disciplina: "Direito Administrativo", tema: "Lei n.º 13.709/2018 — LGPD" };
  const context = makeContext([item]);
  context.__applyFactoryDestinationFoldersV222();
  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/admin-lgpd");
  assert.equal(item.factoryDestinationFolderMatchType, "topic");
});

test("preserva link preenchido manualmente", () => {
  const manual = "https://drive.google.com/drive/folders/manual";
  const item = { disciplina: "Direito Constitucional", tema: "Princípios fundamentais", factoryDestinationFolder: manual };
  const context = makeContext([item]);
  const report = context.__applyFactoryDestinationFoldersV222();
  assert.equal(item.factoryDestinationFolder, manual);
  assert.equal(item.factoryDestinationFolderCatalogVersion, undefined);
  assert.equal(report.manualPreserved, 1);
});

test("usa a pasta da disciplina quando não há correspondência segura", () => {
  const item = { disciplina: "Direito Constitucional", tema: "Assunto ainda sem pasta específica" };
  const context = makeContext([item]);
  const report = context.__applyFactoryDestinationFoldersV222();
  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/const");
  assert.equal(item.factoryDestinationFolderMatchType, "discipline-fallback");
  assert.equal(report.disciplineFallback, 1);
});

test("distingue Direito Administrativo de Direito Administrativo e Gestão Pública", () => {
  const pure = { disciplina: "Direito Administrativo", tema: "Atos administrativos" };
  const combined = { disciplina: "Direito Administrativo e Gestão Pública", tema: "Atos administrativos" };
  const context = makeContext([pure, combined]);
  context.__applyFactoryDestinationFoldersV222();
  assert.equal(pure.factoryDestinationFolder, "https://drive.google.com/drive/folders/admin-atos");
  assert.equal(combined.factoryDestinationFolder, "https://drive.google.com/drive/folders/gestao-atos");
});

test("não inventa vínculo quando a disciplina não existe no catálogo", () => {
  const item = { disciplina: "Disciplina inexistente", tema: "Assunto qualquer" };
  const context = makeContext([item]);
  const report = context.__applyFactoryDestinationFoldersV222();
  assert.equal(item.factoryDestinationFolder, undefined);
  assert.equal(report.unmatched, 1);
});

test("é idempotente e não salva novamente sem alteração", () => {
  const item = { disciplina: "Direito Constitucional", tema: "Princípios fundamentais" };
  const context = makeContext([item]);
  const first = context.__applyFactoryDestinationFoldersV222();
  const savesAfterFirst = context.saved;
  const second = context.__applyFactoryDestinationFoldersV222();
  assert.equal(first.changed, 1);
  assert.equal(second.changed, 0);
  assert.equal(context.saved, savesAfterFirst);
});
