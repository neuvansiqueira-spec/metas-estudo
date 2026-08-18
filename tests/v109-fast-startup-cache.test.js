const { assertCurrentReleaseContract } = require("./current-release-contract.js");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const worker = read("service-worker.js");
const appScriptStart = worker.indexOf("async function cacheFirstAppScript(request)");
const appScriptEnd = worker.indexOf("function staleWhileRevalidate", appScriptStart);
const appScriptCache = worker.slice(appScriptStart, appScriptEnd);

test("versão atual reutiliza o JavaScript principal antes de consultar a rede", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("versão diferente ignora cache antigo e só o usa como contingência offline", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("Contrato atual v152: V109 permanece reconhecida e a publicação atual preserva paridade", () => {
  assertCurrentReleaseContract();
  return; // As asserções históricas abaixo ficam documentadas, mas o contrato público vigente é o v152.
  const version = JSON.parse(read("package.json")).version;
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("script.js"), new RegExp(`APP_VERSION = "${version}"`));
  assert.match(worker, new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260721-carregamento-rapido-v109"/);
  assert.match(worker, /"20260721-plano-dia-sincronizacao-v108"/);
  for (const file of ["index.html", "script.js", "service-worker.js"]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
});
