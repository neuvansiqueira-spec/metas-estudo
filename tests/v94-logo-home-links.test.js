const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const css = read("style.css");
const worker = read("service-worker.js");

test("logo principal e símbolo recolhido levam ao Dashboard", () => {
  assert.match(html, /<a class="brand aldus-visual-brand brand-home-link" href="#dashboard" data-view-link="dashboard" aria-label="Ir para o início">/);
  assert.match(html, /<a class="side-nav-brand-link" href="#dashboard" data-view-link="dashboard" aria-label="Ir para o início">[\s\S]*?<img class="side-nav-brand-mark"/);
  assert.match(css, /\.brand-home-link:focus-visible/);
  assert.match(css, /body \.side-nav \.side-nav-brand-link \{\s*display: none !important;/);
  assert.match(css, /data-side-nav-collapsed="true"[\s\S]*?\.side-nav \.side-nav-brand-link \{\s*display: grid !important;/);
});

test("cache anterior também recebe os links das logos", () => {
  assert.match(worker, /brand-home-link/);
  assert.match(worker, /side-nav-brand-link/);
  assert.match(worker, /aldus-brand-mark-v93\.png/);
  assert.match(worker, /"20260720-navegacao-recolhida-nova-marca-v93"/);
});

test("V95 oculta o atalho no modo aberto e mantém raiz e publicação em paridade", () => {
  const version = "20260720-cronometro-bip-layout-v96";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(html, new RegExp(version));
  assert.match(worker, new RegExp(`CURRENT_VERSION = "${version}"`));
  for (const file of ["index.html", "style.css", "service-worker.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
