const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const style = read("style.css");

test("cronômetro móvel ocupa a área útil e não fica atrás da navegação inferior", () => {
  assert.match(style, /V86: configurações do cronômetro legíveis e totalmente acessíveis no celular/);
  assert.match(style, /body:has\(#floatingTimer:not\(\[hidden\]\)\) \.mobile-quick-nav/);
  assert.match(style, /#floatingTimer[\s\S]*top: max\(10px, env\(safe-area-inset-top/);
  assert.match(style, /#floatingTimer[\s\S]*z-index: 2600 !important/);
  assert.match(style, /#floatingTimer[\s\S]*overflow-y: auto !important/);
});

test("checkboxes e textos das configurações permanecem juntos em duas colunas curtas", () => {
  assert.match(style, /#timerSettings > label:has\(> input\[type="checkbox"\]\)[\s\S]*grid-template-columns: 24px minmax\(0, 1fr\)/);
  assert.match(style, /#timerSettings input\[type="checkbox"\][\s\S]*width: 22px !important/);
  assert.match(style, /#timerSettings input\[type="checkbox"\][\s\S]*max-width: 22px !important/);
  assert.match(style, /#timerSettings \.timer-motivational-sound-option > span[\s\S]*overflow-wrap: anywhere/);
});

test("volume e ações do cronômetro se ajustam à largura do celular", () => {
  assert.match(style, /#timerSettings > label:has\(> select\)[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(128px, 48%\)/);
  assert.match(style, /#floatingTimer > \.floating-timer-actions[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("V86 renova o cache e preserva raiz e publicação em paridade", () => {
  const version = "20260720-identidade-metas-concursos-v90";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("index.html"), new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-fabrica-materiais-reparo-v85"/);
  for (const file of ["style.css", "service-worker.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
