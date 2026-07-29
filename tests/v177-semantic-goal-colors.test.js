const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const script = fs.readFileSync("script.js", "utf8");
const style = fs.readFileSync("style.css", "utf8");
const calendarStyle = fs.readFileSync("aldus-calendar-v61.css", "utf8");

function extractFunction(name, nextName) {
  const start = script.indexOf(`function ${name}`);
  const end = script.indexOf(`function ${nextName}`, start + 1);
  assert.ok(start >= 0, `${name} deve existir`);
  assert.ok(end > start, `${nextName} deve suceder ${name}`);
  return script.slice(start, end);
}

const visualStateSource = extractFunction("goalCalendarVisualState", "goalCalendarVisualLabel");

function visualState(goal, referenceDate = "2026-07-29") {
  const classify = new Function(
    "isGoalDone",
    "goalDateValue",
    "todayISO",
    `${visualStateSource}; return goalCalendarVisualState;`
  )(
    (item) => item.status === "Concluída",
    (item) => item.date,
    () => referenceDate
  );
  return classify(goal, referenceDate);
}

test("calendário classifica concluída em verde, futura/hoje em azul e atraso em amarelo", () => {
  assert.equal(visualState({ date: "2026-07-28", status: "Concluída" }), "done");
  assert.equal(visualState({ date: "2026-07-29", status: "Pendente" }), "pending");
  assert.equal(visualState({ date: "2026-07-30", status: "Pendente" }), "pending");
  assert.equal(visualState({ date: "2026-07-28", status: "Pendente" }), "missed");
});

test("cartões do calendário não exibem texto de status e mantêm descrição acessível", () => {
  const mini = extractFunction("goalCalendarMini", "goalCalendarCard");
  const card = extractFunction("goalCalendarCard", "buildGoalCalendarExportPayload");
  assert.match(mini, /aria-label=/);
  assert.match(card, /aria-label=/);
  assert.doesNotMatch(card, /• status/);
});

test("Plano do Dia apresenta azul, verde e amarelo com a mesma estrutura visual", () => {
  for (const [className, color] of [
    ["planned-today-stat", "#5bbdff"],
    ["realized-today-stat", "#42d3a4"],
    ["historical-time-stat", "#f2d273"]
  ]) {
    assert.match(style, new RegExp(`\\.${className}[\\s\\S]*?box-shadow:[^;]*${color}`, "i"));
    assert.match(style, new RegExp(`\\.${className}::before[\\s\\S]*?background:\\s*${color}`, "i"));
  }
});

test("calendário compartilha a paleta azul, verde e amarela do Plano do Dia", () => {
  assert.match(calendarStyle, /\.calendar-goal-state-pending[\s\S]*?#5bbdff/i);
  assert.match(calendarStyle, /\.calendar-goal-state-done[\s\S]*?#42d3a4/i);
  assert.match(calendarStyle, /\.calendar-goal-state-missed[\s\S]*?#f2d273/i);
});
