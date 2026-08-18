const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const serviceWorker = read("service-worker.js");

test("navegação abre o cache antes de aguardar a atualização da rede", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("versões recentes podem ser migradas para a publicação atual", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("cache do navegador mantém a publicação atual em paridade", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});
