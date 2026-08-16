import fs from "node:fs";

const VERSION = "20260815-interacao-responsiva-v344";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceRequired(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`Marcador ausente para ${label}`);
  return source.replace(search, replacement);
}

const packageJson = JSON.parse(read("package.json"));
packageJson.version = VERSION;
write("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
if (fs.existsSync("package-lock.json")) {
  const lock = JSON.parse(read("package-lock.json"));
  lock.version = VERSION;
  if (lock.packages?.[""]) lock.packages[""].version = VERSION;
  write("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);
}

let script = read("script.js");

const interactionPrelude = `/* V344 — prioridade de interação: trabalho secundário não deve disputar a thread com mouse, toque ou teclado. */
const INTERACTION_QUIET_WINDOW_MS_V344 = 90;
const INTERACTION_MAX_DEFER_MS_V344 = 800;
let lastUserInteractionAtV344 = performance.now();
function markUserInteractionV344() {
  lastUserInteractionAtV344 = performance.now();
}
["pointerdown", "pointermove", "wheel", "keydown", "touchstart"].forEach((type) => {
  document.addEventListener(type, markUserInteractionV344, {
    capture: true,
    passive: type !== "keydown"
  });
});
function interactionQuietForV344() {
  return Math.max(0, performance.now() - lastUserInteractionAtV344);
}
function hasPendingUserInputV344() {
  try {
    return Boolean(navigator.scheduling?.isInputPending?.({ includeContinuous: true }));
  } catch {
    return false;
  }
}
function shouldKeepYieldingToInputV344(startedAt) {
  const elapsed = performance.now() - startedAt;
  if (elapsed >= INTERACTION_MAX_DEFER_MS_V344) return false;
  return interactionQuietForV344() < INTERACTION_QUIET_WINDOW_MS_V344 || hasPendingUserInputV344();
}

`;

if (!script.includes("INTERACTION_QUIET_WINDOW_MS_V344")) {
  const marker = "function yieldSecondaryInitializationV169() {";
  const position = script.indexOf(marker);
  if (position < 0) throw new Error("yieldSecondaryInitializationV169 não encontrada");
  script = `${script.slice(0, position)}${interactionPrelude}${script.slice(position)}`;
}

const yieldStart = script.indexOf("function yieldSecondaryInitializationV169() {");
const yieldEnd = script.indexOf("async function runSecondaryStepV169", yieldStart);
if (yieldStart < 0 || yieldEnd < 0) throw new Error("Bloco de manutenção secundária não localizado");
const responsiveYield = `function yieldSecondaryInitializationV169() {
  const startedAt = performance.now();
  return new Promise((resolve) => {
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      resolve();
    };
    const schedule = () => {
      if (completed) return;
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(50, INTERACTION_MAX_DEFER_MS_V344 - elapsed);
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(runWhenIdle, { timeout: remaining });
        return;
      }
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => setTimeout(() => runWhenIdle({ didTimeout: elapsed >= INTERACTION_MAX_DEFER_MS_V344 }), 0));
        return;
      }
      setTimeout(() => runWhenIdle({ didTimeout: elapsed >= INTERACTION_MAX_DEFER_MS_V344 }), 0);
    };
    const runWhenIdle = (deadline = { didTimeout: false }) => {
      if (completed) return;
      if (!deadline.didTimeout && shouldKeepYieldingToInputV344(startedAt)) {
        const quietDelay = Math.max(16, Math.ceil(INTERACTION_QUIET_WINDOW_MS_V344 - interactionQuietForV344()));
        setTimeout(schedule, Math.min(INTERACTION_QUIET_WINDOW_MS_V344, quietDelay));
        return;
      }
      finish();
    };
    schedule();
  });
}
`;
script = `${script.slice(0, yieldStart)}${responsiveYield}${script.slice(yieldEnd)}`;

const schedulerStart = script.indexOf("let pendingViewRenderTokenV170 = 0;");
const schedulerEnd = script.indexOf("function showView", schedulerStart);
if (schedulerStart < 0 || schedulerEnd < 0) throw new Error("Agendador de troca de tela não localizado");
const responsiveScheduler = `let pendingViewRenderTokenV170 = 0;
function scheduleViewRenderAfterPaintV170(target) {
  const token = ++pendingViewRenderTokenV170;
  const requestedAt = performance.now();
  const stillCurrent = () => token === pendingViewRenderTokenV170
    && document.documentElement.dataset.activeView === target;
  const performRender = () => {
    if (!stillCurrent()) return;
    renderView(target, { reuseIfFresh: true });
  };
  const queueIdle = () => {
    if (!stillCurrent()) return;
    const elapsed = performance.now() - requestedAt;
    const remaining = Math.max(50, INTERACTION_MAX_DEFER_MS_V344 - elapsed);
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(runWhenIdle, { timeout: remaining });
    } else {
      setTimeout(() => runWhenIdle({ didTimeout: elapsed >= INTERACTION_MAX_DEFER_MS_V344 }), 0);
    }
  };
  const runWhenIdle = (deadline = { didTimeout: false }) => {
    if (!stillCurrent()) return;
    if (!deadline.didTimeout && shouldKeepYieldingToInputV344(requestedAt)) {
      const quietDelay = Math.max(16, Math.ceil(INTERACTION_QUIET_WINDOW_MS_V344 - interactionQuietForV344()));
      setTimeout(queueIdle, Math.min(INTERACTION_QUIET_WINDOW_MS_V344, quietDelay));
      return;
    }
    performRender();
  };
  const afterFirstPaint = () => {
    if (!stillCurrent()) return;
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(queueIdle);
    else queueIdle();
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(afterFirstPaint);
  else setTimeout(queueIdle, 0);
  return token;
}

`;
script = `${script.slice(0, schedulerStart)}${responsiveScheduler}${script.slice(schedulerEnd)}`;
write("script.js", script);

let latencyTest = read("tests/v169-operational-latency.test.js");
latencyTest = replaceRequired(
  latencyTest,
  '  assert.match(scheduler, /requestAnimationFrame\\(\\(\\) => setTimeout\\(run, 0\\)\\)/);',
  '  assert.match(scheduler, /requestAnimationFrame\\(afterFirstPaint\\)/);\n  assert.match(scheduler, /requestAnimationFrame\\(queueIdle\\)/);\n  assert.match(scheduler, /requestIdleCallback\\(runWhenIdle/);\n  assert.match(scheduler, /shouldKeepYieldingToInputV344/);',
  "teste de latência operacional"
);
write("tests/v169-operational-latency.test.js", latencyTest);

let recoveryTest = read("tests/v341-startup-interaction-recovery.test.js");
const oldRecoveryReleaseTest = `test("V341 renova o cache e os artefatos da versão pública", () => {
  const version = JSON.parse(read("package.json")).version;

  assert.match(version, /-v341$/);
  assert.match(read("service-worker.js"), new RegExp(\`const CURRENT_VERSION = "\${version}"\`));
  assert.match(read("bootstrap-integrity-loader-v258-core.js"), new RegExp(\`app-v341\\\\.js\\\\?v=\${version}\`));
});`;
const newRecoveryReleaseTest = `test("release pública preserva a recuperação da V341 e sincroniza cache", () => {
  const version = JSON.parse(read("package.json")).version;
  const suffix = version.match(/v\\d+$/)?.[0];

  assert.ok(suffix, "a versão pública deve terminar em vN");
  assert.match(read("service-worker.js"), new RegExp(\`const CURRENT_VERSION = "\${version}"\`));
  assert.match(read("bootstrap-integrity-loader-v258-core.js"), new RegExp(\`app-\${suffix}\\\\.js\\\\?v=\${version}\`));
});`;
recoveryTest = replaceRequired(
  recoveryTest,
  oldRecoveryReleaseTest,
  newRecoveryReleaseTest,
  "teste de recuperação V341"
);
write("tests/v341-startup-interaction-recovery.test.js", recoveryTest);

console.log(`Patch ${VERSION} aplicado com sucesso.`);
