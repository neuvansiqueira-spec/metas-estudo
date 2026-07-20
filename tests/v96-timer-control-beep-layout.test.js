const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");
const css = read("style.css");

test("cronômetro emite bipes distintos ao iniciar, continuar e pausar", () => {
  assert.match(script, /async function playTimerControlBeep\(type = "start"\)/);
  assert.match(script, /type === "pause" \? 440 : 720/);
  assert.match(script, /playTimerControlBeep\("start"\)/);
  assert.match(script, /const controlSound = floatingTimer\.paused \? "resume" : "pause"/);
  assert.match(script, /playTimerControlBeep\(controlSound\)/);
});

test("modo regressivo e botão fechar permanecem legíveis no painel", () => {
  assert.match(css, /#floatingTimer \.timer-mode-label select[\s\S]*?width: 100% !important;/);
  assert.match(css, /#floatingTimer \.floating-timer-header \.timer-icon-button[\s\S]*?width: 42px !important;/);
  assert.match(css, /#floatingTimer \.floating-timer-header > div[\s\S]*?min-width: 0;/);
});

test("V96 mantém os arquivos publicados em paridade", () => {
  const version = "20260720-cronometro-bip-layout-v96";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(script, new RegExp(`APP_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  for (const file of ["index.html", "style.css", "script.js", "service-worker.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
