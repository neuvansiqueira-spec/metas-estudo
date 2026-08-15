"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("V340 não inicializa o núcleo pesado em uma aba oculta", () => {
  const bootstrap = read("bootstrap-integrity-loader-v258-core.js");
  const start = bootstrap.slice(bootstrap.indexOf("async function start()"));
  assert.match(bootstrap, /function waitForForegroundStartup\(\)/);
  assert.match(bootstrap, /document\.hidden/);
  assert.ok(start.indexOf("await waitForForegroundStartup()") < start.indexOf("reconcileBeforeBootstrap()"));
  assert.ok(start.indexOf("await waitForForegroundStartup()") < start.indexOf("loadCoreApplication()"));
});

test("V340 serializa a inicialização crítica entre abas", () => {
  const bootstrap = read("bootstrap-integrity-loader-v258-core.js");
  assert.match(bootstrap, /const STARTUP_LOCK = "aldus-startup-v340"/);
  assert.match(bootstrap, /navigator\?\.locks/);
  assert.match(bootstrap, /locks\.request\(STARTUP_LOCK, \{ mode: "exclusive" \}, task\)/);
  assert.match(bootstrap, /runWithStartupLock\(async \(\) =>/);
});

test("V340 libera a interface antes dos módulos auxiliares", () => {
  const bootstrap = read("bootstrap-integrity-loader-v258-core.js");
  const core = bootstrap.slice(bootstrap.indexOf("async function loadCoreApplication()"), bootstrap.indexOf("async function start()"));
  assert.ok(core.indexOf("await loadScript(...application)") < core.indexOf("await interactive"));
  assert.ok(core.indexOf("await interactive") < core.indexOf("loadEnhancements"));
  assert.match(bootstrap, /requestIdleCallback\(resolve, \{ timeout: 800 \}\)/);
});

test("V340 renova o bootstrap e mantém raiz e publicação idênticas", () => {
  const version = "20260815-carregamento-multiplas-abas-v340";
  for (const file of [
    "index.html",
    "bootstrap-integrity-loader-v258.js",
    "bootstrap-integrity-loader-v258-core.js",
    "service-worker.js",
    "service-worker-v332.js"
  ]) assert.equal(read(file), read(`docs/${file}`), file);
  assert.match(read("index.html"), new RegExp(`performance=${version}`));
  assert.match(read("bootstrap-integrity-loader-v258.js"), new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`BOOTSTRAP_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /qconcursos-filter-v337-multitab-startup-v340/);
});
