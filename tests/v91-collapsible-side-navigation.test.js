const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const css = read("style.css");
const behavior = read("side-nav-collapse-v91.js");

test("barra lateral permanece vertical e ganha controle acessível para recolher", () => {
  assert.match(html, /<aside class="side-nav"[^>]+data-side-nav/);
  assert.match(html, /id="sideNavToggle"[^>]+aria-expanded="true"[^>]+aria-label="Recolher navegação"/);
  assert.match(html, /id="sideNavGroups" class="side-nav-groups"/);
  assert.match(css, /grid-template-columns: 250px minmax\(0, 1fr\) !important/);
  assert.match(css, /data-side-nav-collapsed="true"[\s\S]*grid-template-columns: 76px minmax\(0, 1fr\) !important/);
  assert.match(css, /writing-mode: vertical-rl/);
});

test("letras aumentam sem modificar a navegação móvel", () => {
  assert.match(css, /\.side-nav a[\s\S]*font-size: \.98rem !important/);
  assert.match(css, /\.side-nav-group > span[\s\S]*font-size: \.8rem !important/);
  assert.match(css, /@media \(min-width: 1051px\)/);
});

test("estado recolhido é persistido e continua acessível", () => {
  assert.match(behavior, /aldusSideNavCollapsed/);
  assert.match(behavior, /localStorage\.setItem/);
  assert.match(behavior, /aria-expanded/);
  assert.match(behavior, /Abrir navegação/);
  assert.match(behavior, /Recolher navegação/);
  assert.match(behavior, /matchMedia\(DESKTOP_QUERY\)/);
});

test("V91 renova cache e mantém raiz e publicação em paridade", () => {
  const version = "20260720-navegacao-lateral-recolhivel-v91";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(html, new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"side-nav-collapse-v91\.js"/);
  assert.match(read("service-worker.js"), /"20260720-identidade-metas-concursos-v90"/);
  for (const file of ["index.html", "style.css", "side-nav-collapse-v91.js", "service-worker.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
