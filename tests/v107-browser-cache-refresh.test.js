const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const serviceWorker = read("service-worker.js");

test("navegação consulta a rede antes do cache", () => {
  const navigation = serviceWorker.match(/async function cacheFirstNavigation[\s\S]*?\n\}/)?.[0] || "";

  assert.ok(navigation.indexOf("await networkPromise") < navigation.indexOf("caches.match(request"));
  assert.match(navigation, /Aplicativo indisponível temporariamente/);
});

test("versões recentes podem ser migradas para a publicação atual", () => {
  for (const version of [
    "20260721-fabrica-plano-semana-v102",
    "20260721-fabrica-fonte-fila-v103",
    "20260721-fabrica-visual-resumo-v104",
    "20260721-mobile-salvar-cores-tempo-v105",
    "20260721-dashboard-central-metas-v106"
  ]) {
    assert.match(serviceWorker, new RegExp(`"${version}"`));
  }
});

test("cache do navegador mantém a publicação atual em paridade", () => {
  const version = JSON.parse(read("package.json")).version;
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("script.js"), new RegExp(`APP_VERSION = "${version}"`));
  assert.match(serviceWorker, new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(serviceWorker, /"20260721-browser-cache-atualizacao-v107"/);
  assert.match(read("index.html"), new RegExp(version));

  for (const file of ["index.html", "script.js", "service-worker.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
