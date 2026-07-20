const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const style = read("style.css");

test("mensagem motivacional recupera o tamanho e a posição móveis anteriores", () => {
  assert.match(style, /@media \(max-width: 720px\)[\s\S]*\.timer-motivational-toast\s*\{[\s\S]*top: max\(10px, calc\(env\(safe-area-inset-top, 0px\) \+ 10px\)\)/);
  assert.match(style, /\.timer-motivational-toast\s*\{[\s\S]*width: calc\(100vw - 24px\)/);
  assert.match(style, /\.timer-motivational-toast span\s*\{[\s\S]*font-size: \.98rem/);
});

test("cronômetro diminui somente enquanto a mensagem está visível", () => {
  assert.match(style, /body:has\(#timerMotivationalToast\.visible\) #floatingTimer:not\(\[hidden\]\)/);
  assert.match(style, /#timerMotivationalToast\.visible[\s\S]*top: max\(96px, calc\(env\(safe-area-inset-top, 0px\) \+ 88px\)\) !important/);
  assert.match(style, /#floatingTimer\s*\{[\s\S]*overflow-y: auto !important/);
});

test("V88 renova o cache e mantém raiz e publicação em paridade", () => {
  const version = "20260720-identidade-aldus-v89";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("index.html"), new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-mensagem-motivacional-v87"/);
  for (const file of ["style.css", "service-worker.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
