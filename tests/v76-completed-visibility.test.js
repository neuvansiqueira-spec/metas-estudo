const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("assuntos concluídos e variações compatíveis ficam fora das novas metas", () => {
  const script = read("script.js");
  assert.match(script, /function completedPlanningSubjectRecords/);
  assert.match(script, /function planningRecordMatchesCompletedSubject/);
  assert.match(script, /dailyPlanSubjectsCompatible\(subject, planningBaseSubject\(completed\)\)/);
  assert.match(script, /!planningRecordMatchesCompletedSubject\(item, completedRecords\)/);
});

test("a primeira abertura remove meta automática pendente de assunto já concluído", () => {
  const script = read("script.js");
  assert.match(script, /function repairCompletedPlanningGoalsV76/);
  assert.match(script, /!isManualDailyGoal\(goal\) && !isGoalDone\(goal\) && goalTotalActualMinutes\(goal\) <= 0/);
  assert.match(script, /repairCompletedPlanningGoalsV76\(state\)/);
});

test("data clara e conteúdo acima da navegação móvel permanecem visíveis", () => {
  const css = read("aldus-completed-visibility-v76.css");
  assert.match(css, /#selectedGoalDateLabel/);
  assert.match(css, /-webkit-text-fill-color: #173b74 !important/);
  assert.match(css, /padding-bottom: calc\(170px \+ env\(safe-area-inset-bottom, 0px\)\) !important/);
});

test("V76 está no cache e mantém raiz e publicação em paridade", () => {
  const version = "20260720-concluidas-visibilidade-v76";
  assert.match(read("index.html"), new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /aldus-completed-visibility-v76\.css/);
  for (const file of ["script.js", "index.html", "service-worker.js", "aldus-completed-visibility-v76.css"]) assert.equal(read(file), read(path.join("docs", file)), file);
});
