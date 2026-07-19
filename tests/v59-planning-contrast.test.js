const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("aldus-planning-v59.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const headerFix = fs.readFileSync("header-brand-fix.js", "utf8");

test("v59 carrega depois da revisão visual global", () => {
  assert.match(version, /conselheiro-layout-v70$/);
  const visualPosition = html.indexOf("aldus-visual-v58.css");
  const planningPosition = html.indexOf("aldus-planning-v59.css");
  assert.ok(visualPosition >= 0);
  assert.ok(planningPosition > visualPosition);
  assert.match(html, new RegExp(`aldus-planning-v59\\.css\\?v=${version}`));
});

test("cartões próprios do Planejamento deixam de usar superfícies claras", () => {
  assert.match(css, /\.planning-summary-card[\s\S]*\.day-mode-card/);
  assert.match(css, /background:\s*linear-gradient\(145deg/);
  assert.match(css, /\.planning-summary-value[\s\S]*color:\s*var\(--planning-text\)\s*!important/);
  assert.doesNotMatch(css, /background:\s*#f8(?:fafc|fbff)/i);
});

test("rádios não ocupam toda a largura do cartão", () => {
  assert.match(css, /\.day-mode-option input\[type="radio"\]/);
  assert.match(css, /flex:\s*0 0 22px\s*!important/);
  assert.match(css, /width:\s*22px\s*!important/);
  assert.match(css, /\.day-mode-option:has\(input:checked\)/);
});

test("Planejamento usa uma coluna real e espaço inferior no celular", () => {
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /\.day-mode-grid[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)\s*!important/);
  assert.match(css, /#view-planejamento[\s\S]*padding-bottom:\s*calc\(180px/);
  assert.match(css, /\.planning-actions[\s\S]*position:\s*static\s*!important/);
});

test("cache, reforço de tema e cópia publicada incluem a v59", () => {
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260718-revisao-visual-global-v58"/);
  assert.match(worker, /"20260718-planejamento-contraste-v59"/);
  assert.match(worker, /"aldus-planning-v59\.css"/);
  assert.match(worker, /aldusPlanningV59/);
  assert.match(headerFix, /ensureStylesheet\("aldusPlanningV59", "aldus-planning-v59\.css"\)/);

  for (const file of [
    "index.html",
    "script.js",
    "service-worker.js",
    "header-brand-fix.js",
    "sync-integral-time-protection.js",
    "aldus-planning-v59.css"
  ]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
