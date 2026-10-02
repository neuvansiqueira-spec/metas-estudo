const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("V650 avisa aba parada só depois de 60 minutos e nunca com o cronômetro ligado", () => {
  const source = read("aviso-conexao-aba-v650.js");
  assert.match(source, /const IDLE_LIMIT_MS = 60 \* 60 \* 1000;/);
  assert.match(source, /floatingTimer\?\.goalId \|\| floatingTimer\?\.startedAt/);
  assert.match(source, /idleMs < IDLE_LIMIT_MS \|\| timerInUse\(\)/);
});

test("V650 reconecta pelo mesmo botão Conectar Google Drive do Backup", () => {
  assert.match(read("aviso-conexao-aba-v650.js"), /getElementById\("connectGoogleDrive"\)\?\.click\(\)/);
});

test("V650 é carregada pela cadeia ativa e espelhada entre raiz e docs", () => {
  const loader = read("performance-emergency-v350.js");
  assert.match(loader, /aviso-conexao-aba-v650\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.match(loader, /\n  installAvisoConexaoAbaV650\(\);/);
  for (const file of ["aviso-conexao-aba-v650.js", "performance-emergency-v350.js"]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
});
