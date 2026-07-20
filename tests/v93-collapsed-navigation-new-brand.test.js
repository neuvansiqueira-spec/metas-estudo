const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const css = read("style.css");
const mark = "icons/aldus-brand-mark-v93.png";

test("barra recolhida usa o novo A azul com estrela branca", () => {
  assert.match(html, new RegExp(`class="side-nav-brand-mark"[^>]+src="${mark.replace(".", "\\.")}\\?v=`));
  assert.ok(fs.existsSync(path.join(root, mark)));
  assert.ok(fs.statSync(path.join(root, mark)).size > 10000);
  assert.match(css, /\.side-nav-brand-mark[\s\S]*?padding: 3px/);
  assert.match(css, /\.side-nav-brand-mark[\s\S]*?object-fit: contain/);
  assert.match(read("service-worker.js"), /"icons\/aldus-brand-mark-v93\.png"/);
});

test("V93 renova o cache e mantém os arquivos publicados em paridade", () => {
  const version = "20260720-logo-recolhida-visibilidade-v95";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(html, new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-navegacao-recolhida-logo-v92"/);
  for (const file of ["index.html", "style.css", "service-worker.js", mark]) {
    assert.deepEqual(fs.readFileSync(path.join(root, file)), fs.readFileSync(path.join(root, "docs", file)), file);
  }
});
