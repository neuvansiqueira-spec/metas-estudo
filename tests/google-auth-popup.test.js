const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function functionBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `início não encontrado: ${startMarker}`);
  assert.notEqual(end, -1, `fim não encontrado: ${endMarker}`);
  return source.slice(start, end);
}

for (const file of ["sync-integral-cloud.js", "docs/sync-integral-cloud.js"]) {
  test(`${file}: verificações automáticas não abrem autenticação Google`, () => {
    const source = fs.readFileSync(file, "utf8");

    const automaticCheck = functionBlock(
      source,
      'async function checkCloudForNewerVersionIntegral',
      'const DEVICE_SYNC_REFRESH_INTERVAL_MS'
    );
    assert.doesNotMatch(automaticCheck, /getAccessToken\s*\(/);
    assert.doesNotMatch(automaticCheck, /ensureConnectedGoogleDriveAuthorization\s*\(/);
    assert.match(automaticCheck, /Autorização expirada/);

    const autoSave = functionBlock(
      source,
      'function installAutoSyncAuthorizationRetry',
      'installSameDeviceStateSync\(\);'
    );
    assert.doesNotMatch(autoSave, /getAccessToken\s*\(/);
    assert.doesNotMatch(autoSave, /ensureConnectedGoogleDriveAuthorization\s*\(/);
    assert.match(autoSave, /markPendingSync/);
  });

  test(`${file}: autenticação só ocorre em fluxo interativo`, () => {
    const source = fs.readFileSync(file, "utf8");
    const authorization = functionBlock(
      source,
      'async function ensureConnectedGoogleDriveAuthorization',
      'async function syncNowIntegral'
    );
    const tokenCallIndex = authorization.indexOf('await getAccessToken');
    const interactiveGuardIndex = authorization.indexOf('if (!interactive)');

    assert.notEqual(tokenCallIndex, -1);
    assert.notEqual(interactiveGuardIndex, -1);
    assert.ok(interactiveGuardIndex < tokenCallIndex, "a proteção interativa deve ocorrer antes da chamada do Google");
    assert.match(authorization, /interactive = false/);

    const manualSync = functionBlock(
      source,
      'async function syncNowIntegral',
      'async function checkCloudForNewerVersionIntegral'
    );
    assert.match(manualSync, /interactive: true/);
  });
}

test("arquivos de sincronização publicados permanecem idênticos", () => {
  assert.equal(
    fs.readFileSync("sync-integral-cloud.js", "utf8"),
    fs.readFileSync("docs/sync-integral-cloud.js", "utf8")
  );
});
