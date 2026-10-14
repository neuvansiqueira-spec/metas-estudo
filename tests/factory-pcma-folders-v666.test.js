"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const SOURCE = fs.readFileSync(path.join(ROOT, "factory-pcma-folders-v666.js"), "utf8");

function load() {
  const context = { console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(SOURCE, context);
  return context.__ALDUS_PCMA_FOLDERS_V666__;
}

test("V666 tem pasta para as 13 disciplinas e os 257 temas da V664", () => {
  const api = load();
  assert.equal(api.data.disciplines.length, 13);
  assert.equal(Object.keys(api.data.topics).length, 257);
  const ids = Object.values(api.data.topics).map((topic) => topic.id);
  assert.equal(new Set(ids).size, 257);
});

test("V666 fixa a pasta do tema, limpa o carimbo antigo e respeita troca feita por ele", () => {
  const api = load();
  const item = {
    editalLink: { itemIds: ["pcma-delegado-v664-161"] },
    factoryDestinationFolder: "https://drive.google.com/drive/folders/antiga",
    factoryDestinationFolderCatalogVersion: "20260804-pastas-destino-classificacao-exata-v237",
    factoryDestinationFolderMatchType: "exact-v237-topic"
  };
  assert.equal(api.pinItem(item), true);
  assert.match(item.factoryDestinationFolder, /1QC-wPjdiNdKYVU5GPs5uQrN0V-HN7pgi$/);
  assert.equal(item.factoryDestinationFolderCatalogVersion, undefined);
  assert.equal(item.factoryDestinationFolderPreviousUrl, "https://drive.google.com/drive/folders/antiga");
  assert.equal(api.pinItem(item), false, "segunda passada não muda nada");
  item.factoryDestinationFolder = "https://drive.google.com/drive/folders/escolhida-por-ele";
  assert.equal(api.pinItem(item), false);
  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/escolhida-por-ele");
});

test("V666 desfaz troca feita por rotina automática antiga (carimbo V237)", () => {
  const api = load();
  const item = { editalLink: { itemIds: ["pcma-delegado-v664-218"] } };
  api.pinItem(item);
  const nova = item.factoryDestinationFolder;
  item.factoryDestinationFolder = "https://drive.google.com/drive/folders/antiga";
  item.factoryDestinationFolderCatalogVersion = "20260804-pastas-destino-classificacao-exata-v237";
  item.factoryDestinationFolderMatchType = "exact-v237-topic";
  assert.equal(api.pinItem(item), true);
  assert.equal(item.factoryDestinationFolder, nova);
  assert.equal(item.factoryDestinationFolderCatalogVersion, undefined);
});

test("V666 não mexe em tema fora da V664 nem em tema arquivado", () => {
  const api = load();
  const peca = { editalLink: { itemIds: ["peca-1"] }, factoryDestinationFolder: "x" };
  const arquivado = { editalActive: false, editalLink: { itemIds: ["pcma-delegado-v664-161"] } };
  assert.equal(api.pinItem(peca), false);
  assert.equal(api.pinItem(arquivado), false);
  assert.equal(peca.factoryDestinationFolder, "x");
});

test("V222, V232 e V237 não mexem em tema fixado pela V666", () => {
  for (const file of ["factory-destination-folders-v222.js", "factory-destination-recursive-v232.js", "factory-destination-integrity-v237.js"]) {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.match(source, /factoryDestinationFolderPinnedV666\) return \{ changed: false, status: "pinned-v666"/, file);
  }
  assert.equal(
    fs.readFileSync(path.join(ROOT, "factory-destination-integrity-v237.js"), "utf8"),
    fs.readFileSync(path.join(ROOT, "docs", "factory-destination-integrity-v237.js"), "utf8")
  );
  const build = fs.readFileSync(path.join(ROOT, "build-bundles.mjs"), "utf8");
  assert.ok(build.indexOf('"factory-pcma-folders-v666.js"') > build.indexOf('"factory-destination-recursive-v232.js"'));
});
