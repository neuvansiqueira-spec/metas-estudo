const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (filename) => fs.readFileSync(path.join(root, filename), "utf8");

test("refinamento v178 fica isolado de tablet e celular", () => {
  const css = read("aldus-desktop-refinement-v178.css");

  assert.match(css, /@media \(min-width: 1051px\)/);
  assert.doesNotMatch(css, /@media \(max-width:/);
  assert.doesNotMatch(css, /\.mobile-quick-nav|\.menu-toggle|\.menu-overlay/);
});

test("desktop ganha hierarquia, cartões uniformes e uso horizontal do espaço", () => {
  const css = read("aldus-desktop-refinement-v178.css");

  assert.match(css, /\.app-view > \.section-heading/);
  assert.match(css, /\.dashboard-blocks[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.stat-card[\s\S]*min-height: 118px/);
  assert.match(css, /#view-metas-do-dia \.daily-goals-summary[\s\S]*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /#view-calendario-metas \.week-grid[\s\S]*repeat\(4, minmax\(0, 1fr\)\)/);
});

test("camada visual não toca no cronômetro nem na persistência", () => {
  const css = read("aldus-desktop-refinement-v178.css");

  assert.doesNotMatch(css, /floatingTimer|timerPauseResume|localStorage|indexedDB|serviceWorker/);
  assert.doesNotMatch(css, /display:\s*none/);
});

test("bundle e publicação incluem a camada desktop como última fonte CSS", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});
