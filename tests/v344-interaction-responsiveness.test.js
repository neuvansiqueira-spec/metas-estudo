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

test("V344 permanece incorporada no bundle público atual", () => {
  const version = JSON.parse(read("package.json")).version;
  const index = read("index.html");
  const bundleMatch = index.match(/app-(v\d+)\.js\?v=([^"']+)/);
  assert.ok(bundleMatch, "bundle público atual não identificado no index.html");
  const suffix = bundleMatch[1];
  assert.equal(bundleMatch[2], version);
  const bundle = `app-${suffix}.js`;
  assert.ok(fs.existsSync(bundle));
  assert.match(read(bundle), /INTERACTION_QUIET_WINDOW_MS_V344/);
  assert.equal(read(bundle), read(`docs/${bundle}`));
  assert.match(read("service-worker.js"), new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(read("bootstrap-integrity-loader-v345-core.js"), new RegExp(`app-${suffix}\\.js\\?v=${version}`));
  assert.equal(read("index.html"), read("docs/index.html"));
});
