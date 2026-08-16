const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const script = read("script.js");

function functionSource(name, nextName) {
  const start = script.indexOf(`function ${name}`);
  const end = script.indexOf(`function ${nextName}`, start);
  assert.ok(start >= 0, `${name} não foi encontrada`);
  assert.ok(end > start, `${nextName} deve vir depois de ${name}`);
  return script.slice(start, end);
}

test("V341 nunca torna toda a aplicação inerte durante o bootstrap", () => {
  const show = functionSource("showBootstrapLoadingState()", "hideBootstrapLoadingState");
  const hide = functionSource("hideBootstrapLoadingState()", "safeReadLocalStorageStateForBootstrap");

  assert.doesNotMatch(show, /setAttribute\("inert"/);
  assert.match(show, /removeAttribute\("inert"\)/);
  assert.match(hide, /removeAttribute\("inert"\)/);
});

test("V341 libera a interface antes e depois da recuperação de falha", () => {
  const failure = functionSource("handleBootstrapFailure(error)", "normalizeViewId");
  const firstRelease = failure.indexOf("hideBootstrapLoadingState()");
  const recovery = failure.indexOf("replaceState({})");

  assert.ok(firstRelease >= 0 && firstRelease < recovery);
  assert.match(failure, /finally\s*\{/);
  assert.match(failure, /globalThis\.__aldusBootstrapReady = true/);
  assert.ok((failure.match(/hideBootstrapLoadingState\(\)/g) || []).length >= 2);
});

test("V341 mantém o controle de privacidade compacto", () => {
  const telemetry = read("usage-telemetry-v315.js");

  assert.match(telemetry, /right:auto/);
  assert.match(telemetry, /width:auto/);
  assert.match(telemetry, /max-width:max-content/);
});

test("release pública preserva a recuperação da V341 e sincroniza cache", () => {
  const version = JSON.parse(read("package.json")).version;
  const suffix = version.match(/v\d+$/)?.[0];

  assert.ok(suffix, "a versão pública deve terminar em vN");
  assert.match(read("service-worker.js"), new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(read("bootstrap-integrity-loader-v258-core.js"), new RegExp(`app-${suffix}\\.js\\?v=${version}`));
});
