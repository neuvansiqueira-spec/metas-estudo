const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const style = read("style.css");
const headerFix = read("header-brand-fix.js");

test("nova identidade completa aparece no cabeçalho com texto alternativo", () => {
  assert.match(html, /class="brand aldus-visual-brand[^"]*"/);
  assert.match(html, /class="aldus-visual-brand-image"[^>]+icons\/aldus-visual\.png/);
  assert.match(html, /Aldus — Metas Concursos/);
  assert.doesNotMatch(html, /Conhecimento, Meta e Sabedoria/);
  assert.match(headerFix, /Aldus — Metas Concursos/);
  assert.match(html, /rel="preload" as="image"[^>]+icons\/aldus-visual\.png/);
  assert.match(headerFix, /aldus-visual-brand-image/);
  assert.match(headerFix, /icons\/aldus-visual\.png/);
});

test("arte é responsiva, recortada sem deformação e preservada integralmente no repositório", () => {
  assert.match(style, /\.brand\.aldus-visual-brand[\s\S]*aspect-ratio: 2\.87 \/ 1/);
  assert.match(style, /\.aldus-visual-brand-image[\s\S]*object-fit: cover/);
  assert.match(style, /@media \(max-width: 620px\)[\s\S]*\.brand\.aldus-visual-brand[\s\S]*width: 100% !important/);
  const rootImage = fs.readFileSync(path.join(root, "icons/aldus-visual.png"));
  const docsImage = fs.readFileSync(path.join(root, "docs/icons/aldus-visual.png"));
  assert.equal(rootImage.subarray(1, 4).toString(), "PNG");
  assert.deepEqual(rootImage, docsImage);
  assert.equal(
    crypto.createHash("sha256").update(rootImage).digest("hex"),
    "d36e93d17f95c67c95d0529cfda0fa0d4a49e45a075ca8ce1996bcb0cee11f3f"
  );
});

test("V90 renova cache e mantém raiz e publicação em paridade", () => {
  const version = "20260720-cronometro-bip-layout-v96";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(html, new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-identidade-aldus-v89"/);
  for (const file of ["index.html", "style.css", "header-brand-fix.js", "service-worker.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
