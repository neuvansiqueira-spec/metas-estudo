const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("aldus-navigation-scroll-v73.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const header = fs.readFileSync("header-brand-fix.js", "utf8");
const bundleCss = fs.readFileSync("app.bundle.css", "utf8");

test("v73 mantém os títulos amarelos na ordem natural durante a rolagem", () => {
  assert.equal(version, "20260719-integracao-metas-v74");
  assert.match(css, /\.side-nav \.side-nav-group > span/);
  assert.match(css, /position: relative !important/);
  assert.match(css, /top: auto !important/);
  assert.match(css, /z-index: auto !important/);
  assert.doesNotMatch(css, /position: sticky !important/);
});

test("correção v73 é a última camada visual e integra o cache da publicação", () => {
  const navigationPosition = bundleCss.indexOf("Aldus source: aldus-navigation-scroll-v73.css");
  assert.ok(navigationPosition > bundleCss.indexOf("Aldus source: aldus-backup-contrast-v71.css"));
  assert.match(html, new RegExp(`app-v113\\.css\\?v=${version}`));
  assert.ok(worker.includes('`app-v113.css?v=${CURRENT_VERSION}`'));
  assert.match(worker, /"aldus-navigation-scroll-v73\.css"/);
  assert.match(worker, /id="aldusNavigationScrollV73"/);
  assert.match(worker, /"20260719-inicializacao-rapida-v72"/);
  assert.match(header, /ensureStylesheet\("aldusNavigationScrollV73", "aldus-navigation-scroll-v73\.css"\)/);
});

test("raiz e docs mantêm a correção v73 idêntica", () => {
  assert.equal(css, fs.readFileSync("docs/aldus-navigation-scroll-v73.css", "utf8"));
  assert.equal(html, fs.readFileSync("docs/index.html", "utf8"));
  assert.equal(worker, fs.readFileSync("docs/service-worker.js", "utf8"));
  assert.equal(header, fs.readFileSync("docs/header-brand-fix.js", "utf8"));
});
