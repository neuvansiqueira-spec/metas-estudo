"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const zlib = require("node:zlib");

const read = (file) => fs.readFileSync(file, "utf8");
const version = JSON.parse(read("package.json")).version;
const suffix = version.match(/v\d+$/)?.[0];

test("V339 retira o catálogo pesado do caminho crítico e mantém a migração", () => {
  const app = read(`app-${suffix}.js`);
  const compact = read("pcpr-pcma-2026-catalog-v3.min.js");
  assert.doesNotMatch(app, /Aldus source: pcpr-pcma-2026-catalog\.js/);
  assert.match(app, /Aldus source: pcpr-pcma-2026-migration\.js/);
  assert.match(compact, /globalThis\.PCPR_PCMA_2026_CATALOG=/);
  assert.ok(Buffer.byteLength(compact) < fs.statSync("pcpr-pcma-2026-catalog.js").size * 0.85);
});

test("V339 mostra a interface antes de executar o catálogo e os aprimoramentos", () => {
  const bootstrap = read("bootstrap-integrity-loader-v258-core.js");
  assert.match(bootstrap, /const interactive = waitForCoreInteractive\(\)/);
  assert.ok(bootstrap.indexOf("await interactive") < bootstrap.indexOf("await loadScript(...CONTEST_CATALOG)"));
  assert.ok(bootstrap.indexOf("await waitForIdleAfterInteractive()") < bootstrap.indexOf("await loadScript(...CONTEST_CATALOG)"));
  assert.ok(bootstrap.indexOf("await loadScript(...CONTEST_CATALOG)") < bootstrap.indexOf("Promise.all(enhancements.map"));
  assert.match(bootstrap, /aldus:contest-catalog-ready-v339/);
});

test("V339 reaproveita o estado já validado sem segunda leitura obrigatória", () => {
  const bootstrap = read("bootstrap-integrity-loader-v258-core.js");
  const script = read("script.js");
  assert.match(bootstrap, /globalThis\.__ALDUS_BOOTSTRAP_STATE_V339__ = finalRecord\.data/);
  assert.match(script, /const protectedBootstrapState = globalThis\.__ALDUS_BOOTSTRAP_STATE_V339__/);
  assert.ok(script.indexOf("stateHasUserData(protectedBootstrapState)") < script.indexOf("loadPrimaryStateFromIndexedDB()", script.indexOf("async function bootstrapApplication")));
  assert.match(script, /aldus:contest-catalog-applied-v339/);
});

test("V339 consolida as folhas complementares e respeita o orçamento crítico", () => {
  const html = read("index.html");
  const styles = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"/g)];
  const app = fs.readFileSync(`app-${suffix}.js`);
  const css = fs.readFileSync(`app-${suffix}.css`);
  assert.equal(styles.length, 2);
  assert.ok(app.length <= 2_200_000, `${app.length} bytes`);
  assert.ok(zlib.gzipSync(app, { level: 9 }).length <= 520_000);
  assert.ok(css.length <= 500_000, `${css.length} bytes`);
  assert.ok(zlib.gzipSync(css, { level: 9 }).length <= 80_000);
});

test("V339 mantém raiz e publicação idênticas", () => {
  for (const file of [
    "index.html",
    `app-${suffix}.js`,
    `app-${suffix}.css`,
    "pcpr-pcma-2026-catalog-v3.min.js",
    "script.js",
    "service-worker.js",
    "bootstrap-integrity-loader-v258-core.js"
  ]) assert.equal(read(file), read(`docs/${file}`), file);
});
