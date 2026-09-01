const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(file, "utf8");
const version = JSON.parse(read("package.json")).version;
const suffix = version.match(/v\d+$/)?.[0];

test("V221 publica uma versão única no HTML, bundle e worker", () => {
  const html = read("index.html");
  const canonicalWorker = read("service-worker.js");
  const currentVersion = canonicalWorker.match(/const CURRENT_VERSION = "([^"]+)";/)?.[1] || "";
  const currentSuffix = currentVersion.match(/v\d+$/)?.[0] || "";
  assert.equal(currentVersion, version);
  assert.equal(currentSuffix, suffix);

  const app = read(`app-${currentSuffix}.js`);
  const worker = read(`service-worker-${currentSuffix}.js`);
  const fastLoader = read("bootstrap-fast-path-v351.js");
  const fallbackLoader = read("bootstrap-integrity-loader-v258-core.js");
  const currentBundle = `app-${currentSuffix}.js?v=${currentVersion}`;
  const escapedBundle = currentBundle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fastWithoutFallback = fastLoader.replace(/^\s*const FALLBACK_APPLICATION_SCRIPT = .*;\s*$/m, "");

  assert.match(html, new RegExp(`app-${currentSuffix}\\.css\\?v=${currentVersion}`));
  assert.match(html, new RegExp(escapedBundle));
  assert.match(html, new RegExp(`Versão: ${currentVersion}`));
  assert.match(app, new RegExp(`const VERSION = "${currentVersion}"`));
  assert.match(app, new RegExp(`service-worker-\\$\\{workerSuffix\\}\\.js\\?v=\\$\\{encodeURIComponent\\(APP_VERSION\\)\\}`));
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${currentVersion}"`));
  assert.match(canonicalWorker, /const CACHE_NAME = `metas-estudo-\$\{CURRENT_VERSION\}/);
  assert.match(canonicalWorker, /name\.startsWith\("metas-estudo-"\) && name !== CACHE_NAME/);
  assert.match(fastLoader, new RegExp(`FALLBACK_APPLICATION_SCRIPT = "${escapedBundle}"`));
  assert.match(fastLoader, /resolveApplicationScript\(\)/);
  assert.doesNotMatch(fastWithoutFallback, /app-v\d+\.js/);
  assert.match(fallbackLoader, new RegExp(escapedBundle));
});

test("V421 bump de release invalida a árvore estática anterior por completo", async () => {
  const worker = read("service-worker.js");
  const currentVersion = worker.match(/const CURRENT_VERSION = "([^"]+)";/)?.[1] || "";
  const cacheTemplate = worker.match(/const CACHE_NAME = `([^`]+)`;/)?.[1] || "";
  const currentCache = cacheTemplate.replace("${CURRENT_VERSION}", currentVersion);
  const previousCache = currentCache.replace(currentVersion, "20260831-daily-goals-explicit-mutation-v419");
  const listeners = {};
  const deleted = [];
  const context = {
    self: {
      registration: { scope: "https://aldus.local/" },
      location: { origin: "https://aldus.local" },
      clients: { claim: async () => {} },
      skipWaiting() {},
      addEventListener(name, callback) { listeners[name] = callback; }
    },
    caches: {
      keys: async () => [previousCache, currentCache, "cache-de-outro-aplicativo"],
      delete: async (name) => { deleted.push(name); return true; },
      open: async () => ({ addAll: async () => {}, put: async () => {} }),
      match: async () => null
    },
    fetch: async () => ({ ok: false }),
    URL,
    Response,
    Request,
    Set,
    console
  };

  vm.runInNewContext(worker, context);
  let activation;
  listeners.activate({ waitUntil(promise) { activation = promise; } });
  await activation;

  assert.deepEqual(deleted, [previousCache]);
});

test("V221 consolida os recursos recentes sem remendos no service worker", () => {
  const app = read(`app-${suffix}.js`);
  const worker = read(`service-worker-${suffix}.js`);
  for (const marker of [
    "qconcursos-capture-accuracy-v190.js",
    "question-bank-json-review-v192.js",
    "question-history-report-ui-v198.js",
    "planning-shift-disciplines-v200.js",
    "question-history-charts-v215.js",
    "question-history-tone-v216.js"
  ]) {
    assert.match(app, new RegExp(`/\\* Aldus runtime source: ${marker.replaceAll(".", "\\.")} \\*/`), marker);
  }
  assert.doesNotMatch(worker, /importScripts|runtimeAssetText|patchedApplicationResponse|replaceAll\(/);
  assert.match(worker, /async function networkFirstNavigation/);
  assert.match(worker, /await fetch\(request, \{ cache: "no-store" \}\)/);
});

test("V221 mantém raiz, docs e pontes antigas byte a byte iguais", () => {
  for (const file of [
    "index.html",
    `app-${suffix}.js`,
    `app-${suffix}.css`,
    "service-worker.js",
    `service-worker-${suffix}.js`
  ]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
  for (const legacy of ["v168", "v169"]) {
    assert.equal(read(`service-worker-${legacy}.js`), read(`service-worker-${suffix}.js`), legacy);
    assert.equal(read(`docs/service-worker-${legacy}.js`), read(`service-worker-${suffix}.js`), `docs/${legacy}`);
  }
});

test("fluxo de atualização compara qualquer sufixo atual, sem trava na V169", () => {
  const source = read("update-flow-v169.js");
  assert.match(source, /controller === visible/);
  assert.doesNotMatch(source, /visible === "v169"/);
  assert.match(source, /__ALDUS_APP_RELEASE__\?\.version/);
});
