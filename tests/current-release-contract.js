const assert = require("node:assert/strict");
const fs = require("node:fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assertCurrentReleaseContract() {
  const version = JSON.parse(read("package.json")).version;
  const suffix = version.match(/v\d+$/)?.[0];
  assert.ok(suffix, "A versão pública deve terminar em vNNN.");

  const html = read("index.html");
  const worker = read("service-worker.js");
  const script = read("script.js");
  const jsBundle = read("app.bundle.js");
  const cssBundle = read("app.bundle.css");

  assert.equal(html, read("docs/index.html"));
  assert.equal(script, read("docs/script.js"));
  assert.equal(worker, read("docs/service-worker.js"));
  assert.equal(jsBundle, read("docs/app.bundle.js"));
  assert.equal(cssBundle, read("docs/app.bundle.css"));

  assert.match(html, new RegExp(`app-${suffix}\\.css\\?v=${version}`));
  assert.match(html, new RegExp(`app-${suffix}\\.js\\?v=${version}`));
  assert.match(script, new RegExp(`const APP_VERSION = "${version}";`));
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}";`));
  assert.ok(fs.existsSync(`app-${suffix}.js`));
  assert.ok(fs.existsSync(`app-${suffix}.css`));
  assert.ok(fs.existsSync(`service-worker-${suffix}.js`));
  assert.equal(read(`app-${suffix}.js`), read(`docs/app-${suffix}.js`));
  assert.equal(read(`app-${suffix}.css`), read(`docs/app-${suffix}.css`));
  assert.equal(read(`service-worker-${suffix}.js`), read(`docs/service-worker-${suffix}.js`));

  assert.match(jsBundle, /Aldus source: pcpr-pcma-2026-catalog\.js/);
  assert.match(jsBundle, /Aldus source: pcpr-pcma-2026-migration\.js/);
  assert.match(jsBundle, /Aldus source: sync-integral-time-protection\.js/);
  assert.match(cssBundle, /Aldus source: aldus-completed-visibility-v76\.css/);
}

module.exports = { assertCurrentReleaseContract };
