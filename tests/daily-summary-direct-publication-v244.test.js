const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

test("index publicado carrega a V243 diretamente com URL inédita", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("raiz e docs publicam o mesmo HTML de inicialização", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("loader e service worker usam o hotfix2", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("módulo continua formatando horas e minutos", () => {
  const source = read("daily-summary-time-format-v243.js");
  assert.match(source, /return rest \? `\$\{hours\}h \$\{rest\}min` : `\$\{hours\}h`/);
  assert.match(source, /return `\$\{total\}min`/);
});
