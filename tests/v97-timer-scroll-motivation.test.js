const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");
const css = read("style.css");
const spectrum = read("question-accuracy-spectrum.js");

test("painel do cronômetro permanece acessível em 100% de zoom", () => {
  assert.match(css, /#floatingTimer \{[\s\S]*?max-height: calc\(100dvh - 36px\) !important;/);
  assert.match(css, /#floatingTimer \{[\s\S]*?overflow-y: auto !important;/);
  assert.match(css, /#floatingTimer > \.floating-timer-actions \{[\s\S]*?position: sticky;/);
});

test("som motivacional fica mais audível", () => {
  assert.match(spectrum, /scheduleChimeTone\([^\n]+, \.055\);/);
  assert.doesNotMatch(spectrum, /, \.038\);/);
});

test("banco motivacional contempla Tocantins, Maranhão e Paraná", () => {
  assert.match(script, /Delegado da Polícia Civil do Tocantins/);
  assert.match(script, /edital do Maranhão está aberto/);
  assert.match(script, /concurso do Paraná também está no horizonte/);
  assert.ok((script.match(/Tocantins/g) || []).length >= 8);
  assert.ok((script.match(/Maranhão/g) || []).length >= 8);
  assert.ok((script.match(/Paraná/g) || []).length >= 8);
});

test("V97 renova o cache e mantém publicação em paridade", () => {
  const version = "20260720-cronometro-scroll-motivacao-v97";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(script, new RegExp(`APP_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  for (const file of ["index.html", "style.css", "script.js", "service-worker.js", "question-accuracy-spectrum.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
