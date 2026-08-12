const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

test("V315 carrega o recuperador por nome novo antes do bootstrap legado", () => {
  const html = read("docs/index.html");
  const visibility = html.indexOf('id="aldusFactorySimuladoVisibilityV315"');
  const bootstrap = html.indexOf('id="aldusBootstrapIntegrityLoaderV258"');
  assert.ok(visibility > 0);
  assert.ok(visibility < bootstrap);
  assert.match(html, /factory-simulado-visibility-v315\.js\?v=20260812-gerador-simulados-visibilidade-v315/);
});

test("V315 aguarda a Fábrica e remonta o gerador se uma renderização o remover", () => {
  const loader = read("factory-simulado-visibility-v315.js");
  assert.match(loader, /typeof globalThis\.renderFactory === "function"/);
  assert.match(loader, /factorySimuladoBuilderV310/);
  assert.match(loader, /MutationObserver/);
  assert.match(loader, /__ALDUS_FACTORY_SIMULADO_V310_BROWSER__/);
  assert.doesNotMatch(loader, /localStorage|indexedDB|saveData|state\s*=/);
});

test("V315 integra o arquivo novo à cadeia e ao cache essencial", () => {
  const bootstrap = read("bootstrap-integrity-loader-v258-core.js");
  const worker = read("service-worker.js");
  assert.ok(bootstrap.indexOf('"aldusAppBundleScript"') < bootstrap.indexOf('"aldusFactorySimuladoVisibilityV315"'));
  assert.ok(bootstrap.indexOf('"aldusFactorySimuladoVisibilityV315"') < bootstrap.indexOf('"aldusFactorySimuladoPromptV310"'));
  assert.match(worker, /FACTORY_SIMULADO_VISIBILITY_LOADER/);
  assert.match(worker, /factory-simulado-visibility-v315/);
});

test("V315 mantém paridade entre raiz e docs", () => {
  for (const file of [
    "factory-simulado-visibility-v315.js",
    "bootstrap-integrity-loader-v258.js",
    "bootstrap-integrity-loader-v258-core.js",
    "bootstrap-integrity-loader-v275.js",
    "service-worker.js"
  ]) {
    assert.equal(read(file), read(`docs/${file}`), `${file} deve ser idêntico em docs`);
  }
});
