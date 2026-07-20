const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("aldus-planning-history-v60.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const headerFix = fs.readFileSync("header-brand-fix.js", "utf8");

test("v60 carrega depois das camadas visuais v58 e v59", () => {
  assert.match(version, /inicializacao-rapida-v72$/);
  const v58 = html.indexOf("aldus-visual-v58.css");
  const v59 = html.indexOf("aldus-planning-v59.css");
  const v60 = html.indexOf("aldus-planning-history-v60.css");
  assert.ok(v58 >= 0);
  assert.ok(v59 > v58);
  assert.ok(v60 > v59);
  assert.match(html, new RegExp(`aldus-planning-history-v60\\.css\\?v=${version}`));
});

test("cartão dinâmico de histórico substitui a paleta clara antiga", () => {
  assert.match(script, /class="planning-history-card"/);
  assert.match(script, /class="planning-history-details"/);
  assert.match(css, /#view-planejamento \.planning-history-card\s*\{/);
  assert.match(css, /background:\s*linear-gradient\(145deg/);
  assert.match(css, /\.planning-history-card :is\([\s\S]*h3, strong[\s\S]*color:\s*#f6f9fc\s*!important/);
  assert.doesNotMatch(css, /background:\s*(?:#fff|#f8fafc|#f8fbff)/i);
});

test("observações e histórico permanecem legíveis no tema escuro", () => {
  assert.match(css, /\.planning-history-details\s*\{/);
  assert.match(css, /\.planning-history-details > summary[\s\S]*color:\s*#f6f9fc\s*!important/);
  assert.match(css, /\.planning-history-details > div[\s\S]*background:\s*rgba\(4, 25, 42, \.7\)\s*!important/);
});

test("ações ficam compactas e exclusão mantém contraste", () => {
  assert.match(css, /\.planning-history-card > \.card-actions[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.card-actions > \.danger[\s\S]*background:\s*rgba\(126, 35, 47, \.42\)\s*!important/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.planning-history-cards[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test("cache, reforço de tema e publicação incluem a v60", () => {
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260718-planejamento-contraste-v59"/);
  assert.match(worker, /"aldus-planning-history-v60\.css"/);
  assert.match(worker, /aldusPlanningHistoryV60/);
  assert.match(headerFix, /ensureStylesheet\("aldusPlanningHistoryV60", "aldus-planning-history-v60\.css"\)/);

  for (const file of [
    "index.html",
    "script.js",
    "service-worker.js",
    "header-brand-fix.js",
    "sync-integral-time-protection.js",
    "aldus-planning-history-v60.css"
  ]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
