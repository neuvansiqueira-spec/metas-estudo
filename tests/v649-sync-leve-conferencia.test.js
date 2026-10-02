const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function harness({ pending = false } = {}) {
  const calls = { find: 0, download: 0, original: 0 };
  let modifiedTime = "2026-10-02T10:00:00.000Z";
  const meta = { connected: true, pendingSync: pending, localDirty: false };
  const context = {
    console, setInterval, clearInterval, setTimeout, Date,
    readSyncMeta: () => meta,
    hasValidGoogleDriveAccessToken: () => true,
    canRunAutoSyncChecks: () => true,
    findSyncFile: async () => { calls.find += 1; return { id: "f", modifiedTime }; },
    syncStateFingerprint: (value) => `${JSON.stringify(value).length}:abcd1234`
  };
  context.globalThis = context;
  context.pullSyncPayload = async () => { calls.download += 1; return { state: {} }; };
  context.checkCloudForNewerVersionIntegral = async function checkCloudForNewerVersionIntegral() {
    calls.original += 1;
    await context.pullSyncPayload();
  };
  vm.createContext(context);
  vm.runInContext(read("sync-leve-conferencia-v649.js"), context);
  return { context, calls, meta, setModified: (value) => { modifiedTime = value; } };
}

test("V649 baixa da nuvem só quando o arquivo mudou desde a última conferência completa", async () => {
  const { context, calls, setModified } = harness();
  await context.checkCloudForNewerVersionIntegral("device-interval");
  assert.equal(calls.download, 1);
  await context.checkCloudForNewerVersionIntegral("device-interval");
  await context.checkCloudForNewerVersionIntegral("device-visible");
  assert.equal(calls.download, 1, "sem mudança na nuvem não baixa de novo");
  assert.equal(calls.find, 3, "cada conferência pergunta só a data");
  setModified("2026-10-02T10:05:00.000Z");
  await context.checkCloudForNewerVersionIntegral("device-interval");
  assert.equal(calls.download, 2, "arquivo novo na nuvem é baixado");
});

test("V649 não pula a conferência enquanto há envio pendente neste aparelho", async () => {
  const { context, calls, meta } = harness();
  await context.checkCloudForNewerVersionIntegral("device-interval");
  meta.pendingSync = true;
  await context.checkCloudForNewerVersionIntegral("device-interval");
  assert.equal(calls.download, 2);
});

test("V649 é carregada pela cadeia ativa e espelhada entre raiz e docs", () => {
  assert.match(read("performance-emergency-v350.js"), /sync-leve-conferencia-v649\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.match(read("performance-emergency-v350.js"), /\n  installSyncLeveConferenciaV649\(\);/);
  for (const file of ["sync-leve-conferencia-v649.js", "performance-emergency-v350.js"]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
});
