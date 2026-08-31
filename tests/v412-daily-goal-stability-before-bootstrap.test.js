const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync("index.html", "utf8");
const docsIndex = fs.readFileSync("docs/index.html", "utf8");
const stability = fs.readFileSync("startup-planning-stability-v387.js", "utf8");
const worker = fs.readFileSync("service-worker-v402.js", "utf8");
const docsWorker = fs.readFileSync("docs/service-worker-v402.js", "utf8");

test("V412 instala a proteção de estabilidade antes do bootstrap do aplicativo", () => {
  const stabilityIndex = index.indexOf('id="aldusStartupPlanningStabilityV387"');
  const securityIndex = index.indexOf('id="aldusSecurityObservabilityV318"');
  const bootstrapIndex = index.indexOf('id="aldusBootstrapIntegrityLoaderV258"');

  assert.ok(stabilityIndex >= 0);
  assert.ok(stabilityIndex < securityIndex);
  assert.ok(stabilityIndex < bootstrapIndex);
  assert.match(index, /startup-planning-stability-v387\.js\?v=20260831-estabilidade-metas-antes-bootstrap-v412/);
  assert.equal(index, docsIndex);
});

test("V412 bloqueia reconstrução automática e mantém a atualização explicitamente solicitada", () => {
  assert.match(stability, /function wrapDailyPlanAlignment\(\)/);
  assert.match(stability, /if \(explicitMutationAllowed\(options\)\) return current\.apply\(this, arguments\)/);
  assert.match(stability, /changed: false/);
  assert.match(stability, /skipped: VERSION/);
});

test("V412 renova somente os arquivos necessários sem trabalho permanente", () => {
  assert.match(worker, /DAILY_GOAL_STABILITY_CACHE_VERSION_V412/);
  assert.match(worker, /startup-planning-stability-v387\.js/);
  assert.match(worker, /new URL\("index\.html", self\.registration\.scope\)\.pathname/);
  assert.doesNotMatch(worker, /addEventListener\("fetch"/);
  assert.doesNotMatch(worker, /setTimeout|setInterval|MutationObserver|requestAnimationFrame|requestIdleCallback/);
  assert.equal(worker, docsWorker);
});
