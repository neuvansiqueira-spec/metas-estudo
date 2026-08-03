import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../factory-destination-recursive-v232.js", import.meta.url), "utf8");

function runtime() {
  const context = { console, URLSearchParams, setTimeout: () => 0, clearTimeout, queueMicrotask, globalThis: null };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test("substitui link antigo da disciplina pelo link exato do tema em subpasta", () => {
  const api = runtime();
  const rootId = api.__FACTORY_DESTINATION_ROOT_V232__;
  const tree = api.__buildFactoryDestinationTreeV232([
    { id: "disciplina-dpp", name: "02_DIREITO_PROCESSUAL_PENAL", parents: [rootId] },
    { id: "grupo-investigacao", name: "2.3_INVESTIGACAO_CRIMINAL", parents: ["disciplina-dpp"] },
    { id: "tema-arquivamento", name: "2.3.7_ARQUIVAMENTO", parents: ["grupo-investigacao"] }
  ], rootId);
  const item = {
    discipline: "DIREITO PROCESSUAL PENAL",
    subject: "2.3.7 Arquivamento",
    factoryDestinationFolder: "https://drive.google.com/drive/folders/disciplina-dpp"
  };
  const result = api.__applyFactoryDestinationToItemV232(item, tree);
  assert.equal(result.status, "topic");
  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/tema-arquivamento");
  assert.equal(item.factoryDestinationFolderPreviousUrl, "https://drive.google.com/drive/folders/disciplina-dpp");
  assert.match(item.factoryDestinationFolderMatchPath, /ARQUIVAMENTO/);
});

test("somente preserva link antigo quando isso for solicitado explicitamente", () => {
  const api = runtime();
  const rootId = api.__FACTORY_DESTINATION_ROOT_V232__;
  const tree = api.__buildFactoryDestinationTreeV232([
    { id: "disciplina-dpp", name: "02_DIREITO_PROCESSUAL_PENAL", parents: [rootId] },
    { id: "tema-arquivamento", name: "2.3.7_ARQUIVAMENTO", parents: ["disciplina-dpp"] }
  ], rootId);
  const item = { discipline: "DIREITO PROCESSUAL PENAL", subject: "2.3.7 Arquivamento", factoryDestinationFolder: "https://drive.google.com/drive/folders/antigo" };
  const result = api.__applyFactoryDestinationToItemV232(item, tree, { preserveExisting: true });
  assert.equal(result.status, "manual-preserved");
  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/antigo");
});
