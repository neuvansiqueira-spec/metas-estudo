const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("release possui época de cache explícita e centralizada", () => {
  const metadata = JSON.parse(read("package.json"));
  assert.equal(typeof metadata.aldusCacheVersion, "string");
  assert.match(metadata.aldusCacheVersion, /v\d+$/);
  assert.match(metadata.scripts.build, /sync-release-integrity\.mjs/);
});

test("sincronizador cobre bootstrap ativo, proteção e workers legados", () => {
  const sync = read("sync-release-integrity.mjs");
  for (const expected of [
    "bootstrap-integrity-loader-v345-core.js",
    "bootstrap-integrity-loader-v258-core.js",
    "bootstrap-integrity-loader-v275.js",
    "catastrophic-state-guard-v275.js",
    "service-worker.js",
    '"v168"',
    '"v169"',
    '"v332"'
  ]) assert.match(sync, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("service worker exige renovação de época porque cache estático ignora query string", () => {
  const metadata = JSON.parse(read("package.json"));
  const cacheVersion = metadata.aldusCacheVersion;
  const worker = read("service-worker.js");
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${cacheVersion}"`));
  assert.match(worker, /const CACHE_NAME = `metas-estudo-\$\{CURRENT_VERSION\}/);
  assert.match(worker, /caches\.match\(request, \{ ignoreSearch: true \}\)/);
  assert.match(worker, /async function cacheFirstStatic/);
});

test("bootstrap normal entrega V348 e mantém V345 concorrência inerte", () => {
  const metadata = JSON.parse(read("package.json"));
  const cacheVersion = metadata.aldusCacheVersion;
  const core = read("bootstrap-integrity-loader-v345-core.js");
  const concurrency = read("storage-concurrency-v345.js");
  assert.match(core, new RegExp(`const VERSION = "${cacheVersion}"`));
  assert.match(core, /sync-save-performance-v348\.js/);
  assert.ok(concurrency.indexOf("return;") < concurrency.indexOf("const VERSION"));
});
