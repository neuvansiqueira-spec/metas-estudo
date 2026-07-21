const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const css = fs.readFileSync("aldus-responsive-v52.css", "utf8");
const bundleCss = fs.readFileSync("app.bundle.css", "utf8");

test("correção responsiva v52 permanece como base da camada de contraste v53", () => {
  assert.ok(html.includes(`app.bundle.css?v=${version}`));
  assert.ok(bundleCss.indexOf("Aldus source: aldus-interface-v51.css") < bundleCss.indexOf("Aldus source: aldus-responsive-v52.css"));
  assert.ok(bundleCss.indexOf("Aldus source: aldus-responsive-v52.css") < bundleCss.indexOf("Aldus source: aldus-contrast-v53.css"));
  assert.ok(worker.includes('`app.bundle.css?v=${CURRENT_VERSION}`'));
  assert.match(worker, /"aldus-responsive-v52\.css"/);
  assert.match(worker, /endsWith\("\/aldus-responsive-v52\.css"\)/);
});

test("drawer móvel permanece acima da camada escura e não mistura o conteúdo", () => {
  assert.match(css, /@media \(max-width: 1050px\)/);
  assert.match(css, /\.topbar\s*\{[\s\S]*?z-index: 10030 !important/);
  assert.match(css, /\.topbar \.nav-links,[\s\S]*?z-index: 10020 !important/);
  assert.match(css, /background: #061c30 !important/);
  assert.match(css, /background-color: #061c30 !important/);
  assert.match(css, /opacity: 1 !important/);
  assert.match(css, /\.menu-overlay\.open[\s\S]*?z-index: 10020 !important/);
  assert.match(css, /body\.mobile-menu-open \.menu-toggle[\s\S]*?visibility: hidden !important/);
  assert.match(css, /body\.mobile-menu-open \.topbar > \.brand[\s\S]*?visibility: hidden !important/);
  assert.match(css, /body\.mobile-menu-open \.mobile-quick-nav[\s\S]*?visibility: hidden !important/);
});

test("tipografia, conteúdo e atalhos são limitados no celular", () => {
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /\.hero h1\s*\{[\s\S]*?font-size: clamp\(1\.82rem, 8\.1vw, 2\.28rem\) !important/);
  assert.match(css, /\.stat-card strong\s*\{[\s\S]*?font-size: clamp\(1\.35rem, 6vw, 1\.9rem\) !important/);
  assert.match(css, /\.mobile-quick-nav\s*\{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /overflow-x: clip/);
});

test("desktop recebe marca alinhada, hero compacto e grade equilibrada", () => {
  assert.match(css, /@media \(min-width: 1051px\)/);
  assert.match(css, /\.topbar \.brand\s*\{[\s\S]*?justify-content: flex-start !important/);
  assert.match(css, /\.hero h1\s*\{[\s\S]*?font-size: clamp\(2\.25rem, 3\.1vw, 3rem\) !important/);
  assert.match(css, /\.app-layout\s*\{[\s\S]*?grid-template-columns: 224px minmax\(0, 1fr\) !important/);
});

test("arquivos v52 têm versão e paridade de publicação", () => {
  for (const file of [
    "index.html", "script.js", "service-worker.js", "header-brand-fix.js",
    "sync-integral-time-protection.js", "aldus-responsive-v52.css"
  ]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
  assert.match(html, new RegExp(`Versão: ${version}`));
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
});
