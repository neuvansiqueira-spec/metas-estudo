const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const version = JSON.parse(read("package.json")).version;

test("app-version é a única rotina pública que escreve no rodapé", () => {
  const canonical = read("app-version.js");
  assert.match(canonical, new RegExp(`const VERSION = "${version}";`));
  assert.match(canonical, /querySelectorAll\("\.app-version"\)/);

  const possibleWriters = [
    "script.js", "aldus-meta-branding.js", "analytics-accordion-fix-v148.js",
    "analytics-header-arrow-v149.js", "analytics-single-arrow-v150.js",
    "contest-countdown-v151.js", "daily-goal-methodology-v117.js",
    "daily-goal-replenishment-v116.js", "factory-lei-prompt-v119.js",
    "factory-lei-prompt-v120.js", "factory-lei-prompt-v121.js",
    "factory-lei-prompt-v122.js"
  ];
  for (const file of possibleWriters) {
    assert.doesNotMatch(read(file), /querySelector(All)?\([^)]*app-version|aldusReleaseVersion\s*=/, file);
  }
});

test("módulos v149 e v150 preservam identificação interna sem assumir versão global", () => {
  for (const file of ["analytics-header-arrow-v149.js", "analytics-single-arrow-v150.js"]) {
    const source = read(file);
    assert.match(source, /const VERSION = "20260725-/);
    assert.doesNotMatch(source, /Versão:|app-version|aldusReleaseVersion/);
  }
});

test("service worker remove somente caches estáticos do aplicativo", () => {
  const source = read("service-worker.js");
  assert.match(source, /cacheName\.startsWith\("metas-estudo-"\)/);
  assert.doesNotMatch(source, /localStorage\.(?:clear|removeItem)|indexedDB\.deleteDatabase|sessionStorage\.(?:clear|removeItem)/);
  assert.match(source, /app-version\.js/);
});

test("ativação preserva caches externos ao aplicativo", async () => {
  const listeners = {};
  const deleted = [];
  const currentCache = `metas-estudo-${version}-startup-v29`;
  const context = {
    self: {
      __ALDUS_APP_RELEASE__: { version, suffix: "v154" },
      addEventListener: (name, callback) => { listeners[name] = callback; },
      skipWaiting() {},
      clients: { claim() {} },
      registration: { scope: "https://aldus.local/" }
    },
    importScripts() {},
    caches: {
      keys: async () => ["metas-estudo-versao-antiga", currentCache, "outro-aplicativo-cache"],
      delete: async (name) => { deleted.push(name); return true; },
      open: async () => ({ addAll: async () => {}, put: async () => {} }),
      match: async () => null
    },
    fetch: async () => ({ ok: false }),
    Headers,
    Response,
    Request,
    URL,
    console
  };
  context.globalThis = context;
  vm.runInNewContext(read("service-worker.js"), context);
  let activation;
  listeners.activate({ waitUntil: (promise) => { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, ["metas-estudo-versao-antiga"]);
});

test("fonte canônica restaura o texto após tentativa de sobrescrita antiga", async () => {
  const label = { textContent: "" };
  const html = { dataset: {} };
  let callback = null;
  const context = {
    globalThis: null,
    document: {
      documentElement: html,
      readyState: "complete",
      querySelectorAll: () => [label],
      addEventListener: () => {}
    },
    MutationObserver: class {
      constructor(fn) { callback = fn; }
      observe() {}
    },
    queueMicrotask,
    Object
  };
  context.globalThis = context;
  vm.runInNewContext(read("app-version.js"), context);
  assert.equal(label.textContent, `Versão: ${version}`);

  label.textContent = "Versão: 20260725-analise-estrategica-cabecalho-fixo-v149";
  callback([{ type: "characterData", target: {} }]);
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.equal(label.textContent, `Versão: ${version}`);
});

test("raiz e docs são idênticos nos arquivos responsáveis pela versão e pelo cache", () => {
  for (const file of [
    "index.html", "app-version.js", "service-worker.js", "factory-visibility-v122.css",
    "analytics-header-arrow-v149.js", "analytics-single-arrow-v150.js"
  ]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
});
