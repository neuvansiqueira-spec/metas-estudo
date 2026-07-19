const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("aldus-calendar-v61.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const headerFix = fs.readFileSync("header-brand-fix.js", "utf8");

test("v61 carrega por último e identifica a correção do calendário", () => {
  assert.match(version, /backup-contraste-v71$/);
  const v60 = html.indexOf("aldus-planning-history-v60.css");
  const v61 = html.indexOf("aldus-calendar-v61.css");
  assert.ok(v60 >= 0);
  assert.ok(v61 > v60);
  assert.match(html, new RegExp(`aldus-calendar-v61\\.css\\?v=${version}`));
});

test("barra de data, período e geração usa fundo escuro e texto legível", () => {
  assert.match(css, /#view-calendario-metas \.calendar-toolbar\s*\{/);
  assert.match(css, /\.calendar-toolbar[\s\S]*background:\s*linear-gradient\(145deg/);
  assert.match(css, /\.calendar-toolbar label[\s\S]*color:\s*var\(--calendar-soft\)\s*!important/);
  assert.doesNotMatch(css, /background:\s*(?:#fff|#f8fafc|#f8fbff)/i);
});

test("visões diária, semanal e mensal mantêm cartões e estados em alto contraste", () => {
  assert.match(css, /\.goal-calendar-section\[data-goal-calendar-section="weekly"\]/);
  assert.match(css, /\.goal-calendar-section\[data-goal-calendar-section="monthly"\]/);
  assert.match(css, /\.calendar-grid article[\s\S]*color:\s*var\(--calendar-text\)\s*!important/);
  assert.match(css, /\.goal-pill\.done[\s\S]*color:\s*#c9fbe9\s*!important/);
  assert.match(css, /\.goal-pill\.warn[\s\S]*color:\s*#ffe8a3\s*!important/);
});

test("calendário se reorganiza no celular sem largura excedente", () => {
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.calendar-toolbar[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.week-grid[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.month-grid[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /padding-bottom:\s*calc\(170px \+ env\(safe-area-inset-bottom, 0px\)\)/);
});

test("cache, reforço de tema e cópia publicada incluem a v61", () => {
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260718-historico-planejamento-v60"/);
  assert.match(worker, /"aldus-calendar-v61\.css"/);
  assert.match(worker, /aldusCalendarV61/);
  assert.match(headerFix, /ensureStylesheet\("aldusCalendarV61", "aldus-calendar-v61\.css"\)/);

  for (const file of [
    "index.html",
    "script.js",
    "service-worker.js",
    "header-brand-fix.js",
    "sync-integral-time-protection.js",
    "aldus-calendar-v61.css"
  ]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
