const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const css = read("style.css");

test("barra recolhida troca o título vertical pelo símbolo oficial da marca", () => {
  assert.match(html, /class="side-nav-title-text">Navegação<\/span>/);
  assert.match(html, /class="side-nav-brand-mark"[^>]+src="icons\/[^"]+\?v=/);
  assert.match(css, /\.side-nav-brand-mark\s*\{[\s\S]*?display: none/);
  assert.match(css, /data-side-nav-collapsed="true"[\s\S]*?\.side-nav-title-text\s*\{[\s\S]*?display: none/);
  assert.match(css, /data-side-nav-collapsed="true"[\s\S]*?\.side-nav-brand-mark\s*\{[\s\S]*?display: block/);
  assert.doesNotMatch(css, /data-side-nav-collapsed="true"[^}]*\.side-nav-title\s*\{[^}]*writing-mode/);
});

test("V92 renova o cache e mantém raiz e publicação em paridade", () => {
  const version = "20260720-logo-recolhida-visibilidade-v95";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(html, new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-navegacao-lateral-recolhivel-v91"/);
  for (const file of ["index.html", "style.css", "side-nav-collapse-v91.js", "service-worker.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
