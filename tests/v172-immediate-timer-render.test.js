const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const script = fs.readFileSync("script.js", "utf8");
const style = fs.readFileSync("style.css", "utf8");

function sourceBetween(start, end) {
  const from = script.indexOf(start);
  const to = script.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Marcador inicial ausente: ${start}`);
  assert.notEqual(to, -1, `Marcador final ausente: ${end}`);
  return script.slice(from, to);
}

test("cronômetro aparece antes do bip e da persistência completa", () => {
  const start = sourceBetween(
    "function startFloatingTimer(goal, kind = \"study\")",
    "function pauseOrResumeFloatingTimer()"
  );
  const assigned = start.indexOf("floatingTimer = {");
  const rendered = start.indexOf("renderFloatingTimer()");
  const beep = start.indexOf('playTimerControlBeep("start")');
  const scheduled = start.indexOf("scheduleFloatingTimerSessionPersistenceAfterPaint()");

  assert.ok(assigned >= 0);
  assert.ok(rendered > assigned);
  assert.ok(beep > rendered);
  assert.ok(scheduled > beep);
  assert.doesNotMatch(start, /\bsaveData\(/);
  assert.doesNotMatch(start, /\bpersistFloatingTimerSession\(/);
});

test("snapshot pequeno protege a sessão e a gravação completa ocorre depois da pintura", () => {
  const persistence = sourceBetween(
    "let floatingTimerPersistenceToken = 0",
    "function restoreFloatingTimerSession()"
  );

  assert.match(script, /TIMER_SESSION_SAFETY_STORAGE_KEY = "metasEstudoTimerSessionSafety"/);
  assert.match(persistence, /localStorage\.setItem\(TIMER_SESSION_SAFETY_STORAGE_KEY/);
  assert.match(persistence, /saveData\(\{ skipDerivedRefresh: true \}\)/);
  assert.match(persistence, /persistFloatingTimerSession\(\{ storageOnly: true \}\)/);
  assert.match(persistence, /requestAnimationFrame\(\(\) => setTimeout\(persistAfterPaint, 0\)\)/);
  assert.doesNotMatch(persistence, /removeItem|localStorage\.clear|deleteDatabase/i);
});

test("salvamento do cronômetro não recalcula planejamento, reforço ou fábrica", () => {
  const save = sourceBetween(
    "function saveData(options = {})",
    "async function initializeIndexedDBBackup()"
  );

  assert.match(save, /derivedRefreshSkipped: options\.skipDerivedRefresh === true/);
  assert.equal((save.match(/!report\.derivedRefreshSkipped/g) || []).length, 3);
  assert.match(save, /persistStateSafely\(options\)/);
});

test("fechamento da página grava apenas o snapshot pequeno", () => {
  assert.match(
    script,
    /window\.addEventListener\("beforeunload", \(\) => persistFloatingTimerSession\(\{ storageOnly: true \}\)\)/
  );
  assert.match(
    script,
    /window\.addEventListener\("pagehide", \(\) => persistFloatingTimerSession\(\{ storageOnly: true \}\)\)/
  );
});

test("gutter da barra de rolagem permanece estável entre abas", () => {
  assert.match(
    style,
    /html\[data-aldus-theme="premium-stable"\]\s*\{\s*scrollbar-gutter:\s*stable;\s*\}/
  );
});

test("retorno recente a uma aba reutiliza o DOM quando os dados não mudaram", () => {
  const renderView = sourceBetween(
    "const viewRenderCacheV172 = new Map()",
    "function setMobileMenuOpen"
  );
  const scheduler = sourceBetween(
    "function scheduleViewRenderAfterPaintV170(target)",
    "function showView"
  );

  assert.match(script, /VIEW_RENDER_CACHE_TTL_MS_V172 = 60 \* 1000/);
  assert.match(renderView, /options\.reuseIfFresh/);
  assert.match(renderView, /cachedView\?\.revision === viewDataRevisionV172/);
  assert.match(renderView, /viewRenderCacheV172\.set\(viewId/);
  assert.match(scheduler, /renderView\(target, \{ reuseIfFresh: true \}\)/);
  assert.match(script, /function saveData\(options = \{\}\)[\s\S]*?viewDataRevisionV172 \+= 1/);
});
