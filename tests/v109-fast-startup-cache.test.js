const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const worker = read("service-worker.js");
const appScriptStart = worker.indexOf("async function cacheFirstAppScript(request)");
const appScriptEnd = worker.indexOf("function staleWhileRevalidate", appScriptStart);
const appScriptCache = worker.slice(appScriptStart, appScriptEnd);

test("versão atual reutiliza o JavaScript principal antes de consultar a rede", () => {
  const currentGuard = appScriptCache.indexOf("if (targetsCurrentVersion)");
  const exactCache = appScriptCache.indexOf("const exact = await caches.match(request)");
  const installedCache = appScriptCache.indexOf("const cachedCurrent = await caches.match(request, { ignoreSearch: true })");
  const network = appScriptCache.indexOf('fetch(request, { cache: "no-store" })');

  assert.ok(currentGuard >= 0);
  assert.ok(currentGuard < exactCache);
  assert.ok(exactCache < installedCache);
  assert.ok(installedCache < network);
});

test("versão diferente ignora cache antigo e só o usa como contingência offline", () => {
  const network = appScriptCache.indexOf('fetch(request, { cache: "no-store" })');
  const offlineFallback = appScriptCache.indexOf("const offlineFallback = await caches.match(request, { ignoreSearch: true })");
  assert.ok(network >= 0);
  assert.ok(network < offlineFallback);
  assert.match(appScriptCache, /const targetsCurrentVersion = requestTargetsCurrentVersion\(request\)/);
});

test("V109 preserva atualização segura e paridade da publicação", () => {
  const version = "20260721-carregamento-rapido-v109";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("script.js"), new RegExp(`APP_VERSION = "${version}"`));
  assert.match(worker, new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260721-plano-dia-sincronizacao-v108"/);
  for (const file of ["index.html", "script.js", "service-worker.js"]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
});
