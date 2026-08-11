const assert = require("node:assert/strict");
const fs = require("node:fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function hrefs(html, tag, attribute) {
  const pattern = new RegExp(`<${tag}\\b[^>]*\\b${attribute}="([^"]+)"`, "g");
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function assertUnique(values, message) {
  assert.equal(new Set(values).size, values.length, message);
}

function assertCurrentReleaseContract() {
  const version = JSON.parse(read("package.json")).version;
  const suffix = version.match(/v\d+$/)?.[0];
  assert.ok(suffix, "A versão pública deve terminar em vNNN.");

  const entryHtml = read("index.html");
  const html = read("docs/index.html");
  const worker = read("service-worker.js");
  const appVersion = read("app-version.js");
  const script = read("script.js");
  const jsBundle = read("app.bundle.js");
  const cssBundle = read("app.bundle.css");
  const bootstrapCore = read("bootstrap-integrity-loader-v258-core.js");

  for (const file of [
    "script.js",
    "service-worker.js",
    "app-version.js",
    "app.bundle.js",
    "app.bundle.css",
    "bootstrap-integrity-loader-v258-core.js"
  ]) {
    assert.equal(read(file), read(`docs/${file}`), `${file} deve ser idêntico em docs`);
  }

  if (entryHtml !== html) {
    assert.match(entryHtml, /aldus-entry-bootstrap-v309/,
      "uma entrada diferente do shell publicado deve identificar a barreira V309");
    assert.match(entryHtml, /docs\/index\.html\?aldusEntry=/,
      "a barreira V309 deve buscar explicitamente o shell publicado em docs");
    assert.match(entryHtml, /duplicate-diagnostics-v309\.js/,
      "a barreira V309 deve fixar o núcleo atual do diagnóstico");
    assert.match(entryHtml, /duplicate-diagnostics-batch-v305\.js/,
      "a barreira V309 deve fixar o executor autoritativo do lote");
  } else {
    assert.equal(entryHtml, html, "index.html deve ser idêntico em docs");
  }

  assert.match(html, new RegExp(`app-${suffix}\\.css\\?v=${version}`));
  assert.match(html, new RegExp(`app-${suffix}\\.js\\?v=${version}`));
  assert.doesNotMatch(html, /app-version\.js/);

  const externalScripts = hrefs(html, "script", "src");
  const externalStylesheets = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
  assertUnique(externalScripts, "Scripts auxiliares não podem ser carregados em duplicidade.");
  assertUnique(externalStylesheets, "Folhas de estilo não podem ser carregadas em duplicidade.");
  assert.ok(
    externalScripts.some((src) => /bootstrap-integrity-loader-v(?:258|275)\.js/.test(src))
      || externalScripts.some((src) => src === `app-${suffix}.js?v=${version}`),
    "O HTML deve iniciar pelo carregador protegido ou pelo bundle público atual."
  );
  assert.ok(
    externalStylesheets.some((href) => href === `app-${suffix}.css?v=${version}`),
    "A folha de estilo principal da versão atual deve estar ligada ao HTML."
  );

  assert.match(bootstrapCore, new RegExp(`app-${suffix}\\.js\\?v=${version}`));
  assert.match(bootstrapCore, /const SCRIPT_CHAIN = \[/);
  assert.match(appVersion, new RegExp(`const VERSION = "${version}";`));
  assert.doesNotMatch(appVersion, /MutationObserver/);
  assert.match(script, /const APP_VERSION = globalThis\.__ALDUS_APP_RELEASE__\?\.version/);
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(worker, /installProtectedBootstrapV275/);
  assert.match(worker, /BOOTSTRAP_CORE/);
  assert.doesNotMatch(worker, /importScripts|patchHtmlSource|transformAppScriptResponse|replaceVersion/);

  assert.ok(fs.existsSync(`app-${suffix}.js`));
  assert.ok(fs.existsSync(`app-${suffix}.css`));
  assert.ok(fs.existsSync(`service-worker-${suffix}.js`));
  assert.equal(read(`app-${suffix}.js`), read(`docs/app-${suffix}.js`));
  assert.equal(read(`app-${suffix}.css`), read(`docs/app-${suffix}.css`));
  assert.equal(read(`service-worker-${suffix}.js`), read(`docs/service-worker-${suffix}.js`));

  assert.match(jsBundle, /Aldus source: pcpr-pcma-2026-catalog\.js/);
  assert.match(jsBundle, /Aldus source: pcpr-pcma-2026-migration\.js/);
  assert.match(jsBundle, /Aldus source: sync-integral-time-protection\.js/);
  assert.match(jsBundle, /Aldus source: app-version\.js/);
  assert.match(jsBundle, /Aldus source: qconcursos-crosswalk\.js/);
  assert.match(jsBundle, /Aldus source: question-bank-filters-v225\.js/);
  assert.match(jsBundle, /Aldus source: factory-plan-day-v159\.js/);
  assert.match(jsBundle, /Aldus source: timer-motivation-v161\.js/);
  assert.match(jsBundle, /Aldus source: question-register-simple-v162\.js/);
  assert.match(jsBundle, /Aldus source: factory-simple-v163\.js/);
  assert.match(jsBundle, /Aldus source: factory-polish-v164\.js/);
  assert.match(jsBundle, /Aldus source: update-flow-v169\.js/);
  assert.match(cssBundle, /Aldus source: aldus-completed-visibility-v76\.css/);
  assert.match(cssBundle, /Aldus source: factory-visibility-v122\.css/);
}

module.exports = { assertCurrentReleaseContract };
