const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("V294 publica a paleta sofisticada em raiz e docs", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("paleta cobre as famílias de cartões e preserva estados semânticos", () => {
  const css = read("aldus-card-palette-v294.css");

  for (const selector of [
    ".stat-card",
    ".syllabus-card",
    ".daily-goal-card",
    ".question-bank-item",
    ".smart-review-card",
    ".planning-history-card",
    ".material-card",
    ".qh-chart-card"
  ]) assert.match(css, new RegExp(selector.replace(".", "\\.")));

  for (const color of ["#b46fff", "#f2c957", "#3da3ff", "#36cbc0"]) {
    assert.match(css, new RegExp(color, "i"));
  }

  assert.match(css, /calendar-goal-state-done/);
  assert.match(css, /calendar-goal-state-pending/);
  assert.match(css, /calendar-goal-state-missed/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /@media print/);
});
