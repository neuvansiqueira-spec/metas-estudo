const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("aldus-component-contrast-v69.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const header = fs.readFileSync("header-brand-fix.js", "utf8");

test("v69 carrega depois do contrato v68 e usa uma nova chave de cache", () => {
  assert.equal(version, "20260719-rolagem-navegacao-v73");
  const v68 = html.indexOf("aldus-contrast-system-v68.css");
  const v69 = html.indexOf("aldus-component-contrast-v69.css");
  assert.ok(v68 >= 0);
  assert.ok(v69 > v68);
  assert.match(worker, /const CURRENT_VERSION = "20260719-rolagem-navegacao-v73"/);
  assert.match(worker, /"20260719-contraste-integral-v68"/);
  assert.match(worker, /"aldus-component-contrast-v69\.css"/);
  assert.match(header, /ensureStylesheet\("aldusComponentContrastV69", "aldus-component-contrast-v69\.css"\)/);
});
test("contêineres de select, checkbox e radio não conservam cápsulas claras", () => {
  assert.match(css, /\.card-actions, \.actions\) > label/);
  assert.match(css, /label:has\(> :is\(input, select, textarea\)\)/);
  assert.match(css, /label:has\(> select\)/);
  assert.match(css, /input:is\(\[type="checkbox"\], \[type="radio"\]\)/);
  assert.match(css, /background: rgba\(4, 24, 42, \.86\) !important/);
  assert.match(css, /accent-color: #5aa4ff !important/);
});

test("campos e código em avisos mantêm texto legível em superfície escura", () => {
  assert.match(css, /:is\(input, select, textarea\)/);
  assert.match(css, /-webkit-text-fill-color: var\(--v69-text\) !important/);
  assert.match(css, /:is\(code, kbd, samp\)/);
  assert.match(css, /background: #031725 !important/);
  assert.match(css, /color: #e7f2fb !important/);
  assert.match(css, /::placeholder/);
});

test("componentes dinâmicos seguem o contrato por família sem afetar impressão", () => {
  assert.match(css, /\[class\$="-card"\]/);
  assert.match(css, /\[class\$="-panel"\]/);
  assert.match(css, /\[class\$="-section"\]/);
  assert.match(css, /\[class\$="-box"\]/);
  assert.match(css, /\[class\$="-item"\]/);
  assert.match(css, /\.empty-message:empty::before/);
  assert.match(css, /@media screen/);
  assert.doesNotMatch(css, /@media print/);
});

test("celular e cópias de publicação permanecem sincronizados", () => {
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /width: 100% !important/);
  assert.equal(css, fs.readFileSync("docs/aldus-component-contrast-v69.css", "utf8"));
  assert.equal(html, fs.readFileSync("docs/index.html", "utf8"));
  assert.equal(worker, fs.readFileSync("docs/service-worker.js", "utf8"));
  assert.equal(header, fs.readFileSync("docs/header-brand-fix.js", "utf8"));
});
