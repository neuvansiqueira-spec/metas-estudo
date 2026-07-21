const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const version = packageJson.version;
const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const timeProtection = fs.readFileSync("sync-integral-time-protection.js", "utf8");
const refinement = fs.readFileSync("aldus-premium-refinement-v47.css", "utf8");

function loadTimeRecoveryRecordMerge() {
  const start = timeProtection.indexOf("const TIME_RECOVERY_NUMERIC_FIELDS");
  const end = timeProtection.indexOf("\nfunction timeProtectionRecordMinutes", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const context = { JSON, Math, Number, Object, Set, Map, Array };
  vm.createContext(context);
  vm.runInContext(`${timeProtection.slice(start, end)}\nresult = timeProtectionMergeRecordMaximum;`, context);
  return context.result;
}

test("primeira abertura já recebe tema premium e todos os arquivos na versão atual", () => {
  assert.match(html, /<html[^>]+data-aldus-theme="premium-stable"/);
  assert.ok(html.includes(`app-v112.css?v=${version}`));
  assert.ok(html.includes(`app-v112.js?v=${version}`));
  const cssBundle = fs.readFileSync("app.bundle.css", "utf8");
  const jsBundle = fs.readFileSync("app.bundle.js", "utf8");
  for (const asset of [
    "style.css",
    "aldus-premium-theme.css",
    "aldus-premium-refinement-v47.css",
    "storage-indexeddb.js",
    "analytics-engine.js",
    "study-advisor.js",
    "advisor-navigation-engine.js",
    "script.js",
    "question-accuracy-spectrum.js",
    "timer-material-link-fix.js",
    "question-history-pie.js",
    "side-nav-collapse-v91.js"
  ]) {
    assert.ok(cssBundle.includes(`Aldus source: ${asset}`) || jsBundle.includes(`Aldus source: ${asset}`), `${asset} deve integrar o bundle atual`);
  }
  assert.ok(html.indexOf("aldus-premium-theme.css") < html.indexOf("script.js"));
  assert.match(html, new RegExp(`Versão: ${version}`));
  assert.match(script, new RegExp(`const APP_VERSION = "${version}"`));
});

test("integridade de sincronização é ativada antes do bootstrap e inclui proteção de tempo", () => {
  const expectedFiles = [
    "sync-integral-core.js",
    "sync-integral-deletions.js",
    "sync-integral-state.js",
    "sync-integral-cloud.js",
    "sync-integral-time-protection.js"
  ];
  for (const file of expectedFiles) {
    assert.match(script, new RegExp(`"${file.replaceAll(".", "\\.")}"`));
    assert.match(worker, new RegExp(file.replaceAll(".", "\\.")));
  }
  const integrityStart = script.indexOf("async function startApplicationWithIntegrity");
  const integrityEnd = script.indexOf("startApplicationWithIntegrity().catch", integrityStart);
  const integrityBody = script.slice(integrityStart, integrityEnd);
  assert.ok(integrityBody.indexOf("await ensureIntegralSyncEnhancements()") < integrityBody.indexOf("return bootstrapApplication()"));
  assert.match(script, /const pendingFiles = INTEGRAL_SYNC_ENHANCEMENT_FILES\.map\(loadIntegralSyncEnhancementFile\)/);
  assert.match(script, /await Promise\.all\(pendingFiles\)/);
  assert.match(script, /script\.async = false/);
  const jsBundle = fs.readFileSync("app.bundle.js", "utf8");
  for (const file of expectedFiles) assert.match(jsBundle, new RegExp(`Aldus source: ${file.replaceAll(".", "\\.")}`));
});

test("recuperação usa o maior tempo sem sobrescrever metadados atuais", () => {
  const mergeRecord = loadTimeRecoveryRecordMerge();
  const current = {
    id: "meta-1",
    discipline: "Direito Constitucional",
    subject: "Controle de Constitucionalidade",
    status: "pending",
    notes: "anotação atual",
    actualMinutes: 35,
    updatedAt: "2026-07-18T12:00:00.000Z",
    history: [{ action: "current" }]
  };
  const recovered = {
    id: "meta-1",
    discipline: "Disciplina antiga",
    subject: "Assunto antigo",
    status: "done",
    notes: "anotação antiga",
    actualMinutes: 70,
    seconds: 4210,
    materialId: "material-recuperado",
    updatedAt: "2026-07-17T12:00:00.000Z",
    history: [{ action: "backup" }]
  };
  const merged = JSON.parse(JSON.stringify(mergeRecord(current, recovered)));
  assert.equal(merged.actualMinutes, 70);
  assert.equal(merged.seconds, 4210);
  assert.equal(merged.discipline, current.discipline);
  assert.equal(merged.subject, current.subject);
  assert.equal(merged.status, current.status);
  assert.equal(merged.notes, current.notes);
  assert.equal(merged.updatedAt, current.updatedAt);
  assert.equal(merged.materialId, recovered.materialId);
  assert.deepEqual(merged.history, [{ action: "current" }, { action: "backup" }]);
});

test("refinamento visual reduz o cabeçalho e destaca o diagnóstico de recuperação", () => {
  assert.match(refinement, /\.time-recovery-diagnostic\s*\{/);
  assert.match(refinement, /@media \(min-width: 901px\)[\s\S]*?\.hero \{[\s\S]*?padding: 24px min\(5vw, 68px\) 60px/);
  assert.match(refinement, /font-size: clamp\(2\.75rem, 4\.15vw, 3\.65rem\)/);
  assert.match(refinement, /@media \(max-width: 900px\)[\s\S]*?\.goal-card \{[\s\S]*?width: 100%/);
});

test("arquivos alterados mantêm paridade entre raiz e publicação docs", () => {
  for (const file of [
    "index.html",
    "script.js",
    "service-worker.js",
    "header-brand-fix.js",
    "sync-integral-core.js",
    "sync-integral-time-protection.js",
    "aldus-premium-theme.css",
    "aldus-premium-refinement-v47.css"
  ]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
