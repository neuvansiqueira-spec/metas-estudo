const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (filename) => fs.readFileSync(path.join(root, filename), "utf8");

test("o indicador semanal não exibe zero falso antes da hidratação", () => {
  const index = read("index.html");
  assert.match(
    index,
    /id="weeklyGoalStatus"[^>]*aria-live="polite"[^>]*>Carregando dados…<\/strong>/
  );
  assert.doesNotMatch(
    index,
    /id="weeklyGoalStatus"[^>]*>0h registradas<\/strong>/
  );
});

test("o palco usa somente a rolagem vertical da página", () => {
  const style = read("style.css");
  assert.match(
    style,
    /html\[data-aldus-theme="premium-stable"\] \.screen-stage\s*\{[^}]*height:\s*auto !important;[^}]*max-height:\s*none !important;[^}]*overflow-y:\s*visible !important;[^}]*scrollbar-gutter:\s*auto !important;/s
  );
});

test("o layout desktop não cria um segundo contexto de rolagem", () => {
  const style = read("style.css");
  assert.match(
    style,
    /@media \(min-width:\s*1051px\)\s*\{[^}]*html\[data-aldus-theme="premium-stable"\] \.app-layout\s*\{[^}]*height:\s*auto !important;[^}]*max-height:\s*none !important;[^}]*overflow:\s*visible !important;/s
  );
});

test("a renderização hidratada continua substituindo o carregamento pelo total real", () => {
  const script = read("script.js");
  assert.match(
    script,
    /elements\.weeklyGoalStatus\.textContent\s*=\s*`\$\{formatHours\(weekMinutes\)\} registradas`/
  );
});
