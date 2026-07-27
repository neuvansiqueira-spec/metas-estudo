const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "reinforcement-goal-presentation-v156.js"), "utf8");
const docsSource = fs.readFileSync(path.join(root, "docs", "reinforcement-goal-presentation-v156.js"), "utf8");
const loader = fs.readFileSync(path.join(root, "daily-study-collapsible-v137.js"), "utf8");
const docsLoader = fs.readFileSync(path.join(root, "docs", "daily-study-collapsible-v137.js"), "utf8");

test("identifica metas de reforço pelos campos type e tipo", () => {
  assert.match(source, /goal\?\.type \|\| goal\?\.tipo/);
  assert.match(source, /=== "reforco"/);
  assert.match(source, /META DE REFORÇO/);
});

test("apresenta o rótulo na próxima atividade e em todas as metas do Plano do Dia", () => {
  assert.match(source, /nextDailyGoal/);
  assert.match(source, /data-daily-goal-details/);
  assert.match(source, /data-reinforcement-goal-label="summary"/);
  assert.match(source, /data-reinforcement-goal-label="details"/);
  assert.match(source, /data-reinforcement-goal-label="next"/);
});

test("não altera dados, planejamento ou armazenamento", () => {
  assert.doesNotMatch(source, /\blocalStorage\b|\bindexedDB\b|\bsaveData\s*\(|\bpersistStateSafely\s*\(/);
  assert.doesNotMatch(source, /state\.dailyGoals\.(?:push|pop|shift|unshift|splice|sort|reverse)\s*\(/);
  assert.doesNotMatch(source, /(?:goal|state)\.[A-Za-z_$][\w$]*\s*=(?!=)/);
});

test("carregador usa arquivo versionado e raiz/docs permanecem idênticos", () => {
  assert.match(loader, /reinforcement-goal-presentation-v156\.js\?v=20260727-meta-reforco-visivel-v156/);
  assert.equal(loader, docsLoader);
  assert.equal(source, docsSource);
});
