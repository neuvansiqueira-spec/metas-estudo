const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const bridge = fs.readFileSync("service-worker-v402.js", "utf8");
const docsBridge = fs.readFileSync("docs/service-worker-v402.js", "utf8");
const canonical = fs.readFileSync("service-worker.js", "utf8");

const V408 = "20260830-planning-integrity-cache-v408";

test("V408 invalida apenas o cache antigo da integridade do planejamento", () => {
  assert.match(bridge, new RegExp(`const CACHE_FIX_VERSION = "${V408}"`));
  assert.match(bridge, /planning-integrity-v235\.js/);
  assert.match(bridge, /planning-integrity-loader-v235\.js/);
  assert.match(bridge, /name\.startsWith\("metas-estudo-"\)/);
  assert.match(bridge, /PLANNING_INTEGRITY_PATHS\.has\(new URL\(request\.url\)\.pathname\)/);
  assert.match(bridge, /cache\.delete\(request\)/);
  assert.doesNotMatch(bridge, /caches\.delete\(name\)/);
});

test("V408 preserva cache-first e não adiciona trabalho permanente", () => {
  assert.ok(bridge.includes("importScripts(`service-worker.js?v=${CACHE_FIX_VERSION}`);"));
  assert.match(canonical, /async function cacheFirstStatic\(request\)/);
  assert.match(canonical, /caches\.match\(request, \{ ignoreSearch: true \}\)/);
  assert.doesNotMatch(bridge, /addEventListener\("fetch"/);
  assert.doesNotMatch(bridge, /setTimeout|setInterval|MutationObserver|requestAnimationFrame|requestIdleCallback/);
});

test("V409 mantém o contrato V395 sem colidir com CACHE_NAME do worker canônico", () => {
  assert.match(bridge, /\{\s*const CACHE_NAME = `metas-estudo-v408-active-bridge`;\s*\}/);
  const deployPattern = /(const CACHE_NAME = `[^`\n]+)(`;)/;
  assert.equal(deployPattern.test(bridge), true);
  assert.doesNotMatch(bridge, /caches\.open\(CACHE_NAME\)/);

  const inlineCanonical = bridge.replace(
    /importScripts\(`service-worker\.js\?v=\$\{CACHE_FIX_VERSION\}`\);/,
    canonical
  );
  assert.doesNotThrow(() => new vm.Script(inlineCanonical));
});

test("V408 executa a limpeza apenas na ativação do novo worker", () => {
  assert.match(bridge, /self\.addEventListener\("activate", \(event\) => \{/);
  assert.match(bridge, /event\.waitUntil\(invalidatePlanningIntegrityCacheV408\(\)\)/);
  assert.equal((bridge.match(/invalidatePlanningIntegrityCacheV408\(\)/g) || []).length, 2);
});

test("worker V402 publicado permanece sincronizado entre raiz e docs", () => {
  assert.equal(bridge, docsBridge);
});
