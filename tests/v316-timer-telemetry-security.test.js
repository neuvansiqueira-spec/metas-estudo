const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("V316 restaura sessão sempre pausada e exige decisão explícita", () => {
  const runtime = read("timer-runtime-v316.js");
  assert.match(runtime, /function preflightStoredSession\(\)/);
  assert.match(runtime, /startedAt: null/);
  assert.match(runtime, /paused: true/);
  assert.match(runtime, /completionDismissed: true/);
  assert.match(runtime, /Ela foi restaurada pausada e não emitirá alarme/);
  assert.match(runtime, /Retomar/);
  assert.match(runtime, /Salvar/);
  assert.match(runtime, /Descartar/);
});

test("V316 centraliza emissão, deduplica sessão e reserva áudio para uma aba", () => {
  const source = read("timer-runtime-v316.js");
  const controls = read("timer-controls-hardening-v268.js");
  assert.match(source, /async function emitCompletionOnce/);
  assert.match(source, /function claimOwnership/);
  assert.match(source, /function claimAlert/);
  assert.match(source, /triggerTimerAlert = async function triggerTimerAlertV316/);
  assert.match(controls, /runtimeV316\.emitCompletionOnce\("watchdog"\)/);
  assert.match(controls, /20260812-timer-diagnostics-security-v316/);
});

test("V316 mantém diagnóstico local limitado e sem conteúdo de estudo", () => {
  const source = read("timer-runtime-v316.js");
  assert.match(source, /MAX_DIAGNOSTICS = 200/);
  assert.match(source, /Diagnóstico local do cronômetro/);
  assert.match(source, /Não registra disciplinas, questões ou textos/);
  const diagnostic = source.slice(
    source.indexOf("function record("),
    source.indexOf("function owner(")
  );
  assert.doesNotMatch(diagnostic, /discipline|subject|question|notes|material/i);
});

test("telemetria V316 continua sem envio externo até endpoint explícito", () => {
  const telemetry = read("usage-telemetry-v315.js");
  const entry = read("index.html");
  assert.match(telemetry, /20260812-usage-telemetry-security-v316/);
  assert.match(telemetry, /if \(!endpoint \|\| pending\.length === 0\) return false/);
  assert.match(telemetry, /credentials: "omit"/);
  assert.doesNotMatch(telemetry, /navigator\.userAgent|\.value\b|innerText|email|cpf|ipAddress/i);
  assert.match(entry, /meta name="aldus-usage-endpoint" content=""/);
});

test("workflows legados não escrevem nem executam e Actions usam SHA fixo", () => {
  const workflowDir = path.join(root, ".github", "workflows");
  const workflows = fs.readdirSync(workflowDir)
    .filter((file) => /\.ya?ml$/.test(file))
    .map((file) => ({ file, source: read(path.join(".github", "workflows", file)) }));
  const legacyPush = workflows.filter(({ source }) => /git push/.test(source));
  assert.equal(legacyPush.length, 30);
  legacyPush.forEach(({ file, source }) => {
    assert.doesNotMatch(source, /contents:\s*write/, `${file} não pode escrever`);
    assert.match(source, /if: \$\{\{ false \}\} # V316: fluxo legado desativado/, `${file} deve ficar desativado`);
  });
  workflows.forEach(({ file, source }) => {
    assert.doesNotMatch(source, /uses:\s*[^\s#]+@v\d+/, `${file} deve fixar Actions por SHA`);
  });
});

test("raiz e docs preservam paridade dos arquivos V316", () => {
  for (const file of [
    "script.js",
    "timer-runtime-v316.js",
    "timer-controls-hardening-v268.js",
    "usage-telemetry-v315.js",
    "service-worker.js"
  ]) {
    assert.equal(read(file), read(path.join("docs", file)), `${file} deve ser idêntico em docs`);
  }
});
