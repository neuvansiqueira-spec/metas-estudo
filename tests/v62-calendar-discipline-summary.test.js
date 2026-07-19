const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("aldus-calendar-v62.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const headerFix = fs.readFileSync("header-brand-fix.js", "utf8");

test("v62 carrega depois da correção geral do calendário", () => {
  assert.match(version, /backup-contraste-v71$/);
  const v61 = html.indexOf("aldus-calendar-v61.css");
  const v62 = html.indexOf("aldus-calendar-v62.css");
  assert.ok(v61 >= 0);
  assert.ok(v62 > v61);
  assert.match(html, new RegExp(`aldus-calendar-v62\\.css\\?v=${version}`));
});

test("resumo mostra quantidade em vez da lista inteira como número gigante", () => {
  assert.match(script, /const disciplines = Object\.entries\(period\.disciplines\)\.sort/);
  assert.match(script, /class="stat-card calendar-discipline-stat"/);
  assert.match(script, /<strong>\$\{disciplines\.length\}<\/strong>/);
  assert.doesNotMatch(script, /class="stat-card wide-stat"><span>Disciplinas<\/span><strong>\$\{Object\.entries\(period\.disciplines\)/);
});

test("lista completa permanece disponível recolhida por padrão", () => {
  assert.match(script, /<details class="calendar-discipline-details"><summary>Ver disciplinas<\/summary>/);
  assert.match(script, /<li><span>\$\{escapeHTML\(name\)\}<\/span><strong>\$\{count\}<\/strong><\/li>/);
  assert.doesNotMatch(script, /<details class="calendar-discipline-details" open>/);
  assert.match(script, /Nenhuma disciplina no período/);
});

test("cartão fica compacto no computador e no celular", () => {
  assert.match(css, /\.calendar-discipline-stat\s*\{[\s\S]*grid-column:\s*span 3\s*!important/);
  assert.match(css, /\.calendar-discipline-stat\s*\{[\s\S]*min-height:\s*112px\s*!important/);
  assert.match(css, /\.calendar-discipline-details > ul[\s\S]*max-height:\s*210px\s*!important/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.calendar-discipline-stat[\s\S]*grid-column:\s*auto\s*!important/);
  assert.match(css, /@media \(max-width: 380px\)[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)\s*!important/);
});

test("cache, reforço de tema e cópia publicada incluem a v62", () => {
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260718-calendario-contraste-v61"/);
  assert.match(worker, /"aldus-calendar-v62\.css"/);
  assert.match(worker, /aldusCalendarV62/);
  assert.match(headerFix, /ensureStylesheet\("aldusCalendarV62", "aldus-calendar-v62\.css"\)/);

  for (const file of [
    "index.html",
    "script.js",
    "service-worker.js",
    "header-brand-fix.js",
    "sync-integral-time-protection.js",
    "aldus-calendar-v62.css"
  ]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
