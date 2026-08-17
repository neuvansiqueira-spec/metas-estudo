const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const script = () => read("script.js");

function sourceBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0, `Marcador inicial ausente: ${start}`);
  assert.ok(to > from, `Marcador final ausente: ${end}`);
  return source.slice(from, to);
}

test("V344 prioriza entrada do usuário antes da renderização de uma nova área", () => {
  const source = script();
  const scheduler = sourceBetween(
    source,
    "function scheduleViewRenderAfterPaintV170(target)",
    "function showView"
  );

  assert.match(source, /INTERACTION_QUIET_WINDOW_MS_V344 = 90/);
  assert.match(source, /INTERACTION_MAX_DEFER_MS_V344 = 800/);
  assert.match(source, /"pointermove"/);
  assert.match(source, /navigator\.scheduling\?\.isInputPending/);
  assert.match(scheduler, /requestAnimationFrame\(afterFirstPaint\)/);
  assert.match(scheduler, /requestAnimationFrame\(queueIdle\)/);
  assert.match(scheduler, /requestIdleCallback\(runWhenIdle/);
  assert.match(scheduler, /shouldKeepYieldingToInputV344\(requestedAt\)/);
  assert.match(scheduler, /document\.documentElement\.dataset\.activeView === target/);
  assert.match(scheduler, /token === pendingViewRenderTokenV170/);
});

test("V344 mantém reparos pós-bootstrap fora do caminho enquanto há interação", () => {
  const source = script();
  const secondaryYield = sourceBetween(
    source,
    "function yieldSecondaryInitializationV169()",
    "async function runSecondaryStepV169"
  );

  assert.match(secondaryYield, /requestIdleCallback\(runWhenIdle/);
  assert.match(secondaryYield, /shouldKeepYieldingToInputV344\(startedAt\)/);
  assert.match(secondaryYield, /INTERACTION_MAX_DEFER_MS_V344/);
  assert.match(secondaryYield, /setTimeout\(schedule/);
});

test("V344 preserva o shell imediato e cancela renderizações antigas", () => {
  const source = script();
  const showView = sourceBetween(
    source,
    "function showView(viewId = hashToView(), options = {})",
    'document.addEventListener("click"'
  );

  assert.ok(showView.indexOf('"aldus:view-active"') < showView.indexOf("scheduleViewRenderAfterPaintV170(target)"));
  assert.match(showView, /activePanel\.classList\.add\("active"\)/);
  assert.match(showView, /activePanel\.hidden = false/);
  assert.match(showView, /pendingViewRenderTokenV170 \+= 1/);
});

test("V344 gera bundle público, service worker e cópia docs sincronizados", () => {
  const version = JSON.parse(read("package.json")).version;
  assert.match(version, /-v344$/);
  assert.ok(fs.existsSync("app-v344.js"));
  assert.match(read("app-v344.js"), /INTERACTION_QUIET_WINDOW_MS_V344/);
  assert.equal(read("app-v344.js"), read("docs/app-v344.js"));
  assert.match(read("service-worker.js"), new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(read("bootstrap-integrity-loader-v258-core.js"), new RegExp(`app-v344\\.js\\?v=${version}`));
  assert.match(read("index.html"), new RegExp(`app-v344\\.js\\?v=${version}`));
  assert.equal(read("index.html"), read("docs/index.html"));
});
