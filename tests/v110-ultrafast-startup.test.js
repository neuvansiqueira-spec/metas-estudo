const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(file, "utf8");
const version = JSON.parse(read("package.json")).version;
const html = read("index.html");
const worker = read("service-worker.js");
const cssBundle = read("app.bundle.css");
const jsBundle = read("app.bundle.js");

test("V110 reduz a entrada a um CSS e um JavaScript locais", () => {
  const stylesheetRequests = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((match) => match[1]);
  const localScriptRequests = [...html.matchAll(/<script[^>]+src="(?!https?:\/\/)([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(stylesheetRequests, [`app.bundle.css?v=${version}`]);
  assert.deepEqual(localScriptRequests, [`app.bundle.js?v=${version}`]);
  assert.doesNotMatch(html, /<script[^>]+src="https:\/\/accounts\.google\.com\/gsi\/client/);
});

test("Google Identity Services é carregado apenas na ação de conexão", () => {
  const script = read("script.js");
  assert.match(script, /function loadGoogleIdentityServices\(\)/);
  assert.match(script, /loader\.src = "https:\/\/accounts\.google\.com\/gsi\/client"/);
  assert.match(script, /async function getAccessToken[\s\S]*await loadGoogleIdentityServices\(\)/);
});

test("bundle preserva ordem, integridade e paridade de publicação", () => {
  assert.ok(cssBundle.indexOf("Aldus source: style.css") < cssBundle.indexOf("Aldus source: aldus-premium-theme.css"));
  assert.ok(jsBundle.indexOf("Aldus source: sync-integral-time-protection.js") < jsBundle.indexOf("Aldus source: script.js"));
  assert.ok(jsBundle.indexOf("Aldus source: script.js") < jsBundle.indexOf("Aldus source: side-nav-collapse-v91.js"));
  assert.doesNotThrow(() => new vm.Script(jsBundle));
  assert.equal(cssBundle, read("docs/app.bundle.css"));
  assert.equal(jsBundle, read("docs/app.bundle.js"));
});

test("instalação guarda apenas o shell consolidado", () => {
  const cacheList = worker.match(/const FILES_TO_CACHE = \[[\s\S]*?\n\];/)?.[0] || "";
  assert.match(cacheList, /app\.bundle\.css/);
  assert.match(cacheList, /app\.bundle\.js/);
  assert.doesNotMatch(cacheList, /analytics-engine\.js|aldus-premium-theme\.css|sync-integral-core\.js/);
  assert.match(cacheList, /CURRENT_VERSION/);
});

test("navegação usa o shell salvo e atualiza a rede em segundo plano", () => {
  const navigation = worker.match(/async function cacheFirstNavigation[\s\S]*?\n\}/)?.[0] || "";
  assert.ok(navigation.indexOf("caches.match(request") < navigation.indexOf("await networkPromise"));
  assert.match(worker, /event\.waitUntil\(freshNavigation/);
});

test("V110 mantém versão e espelhos sincronizados", () => {
  assert.equal(version, "20260721-inicializacao-ultrarrapida-v110");
  assert.match(read("script.js"), new RegExp(`APP_VERSION = "${version}"`));
  assert.match(worker, new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260721-carregamento-rapido-v109"/);
  for (const file of ["index.html", "script.js", "service-worker.js", "header-brand-fix.js", "question-history-pie.js"]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
});
