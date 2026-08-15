const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const loader = fs.readFileSync('bootstrap-integrity-loader-v258.js', 'utf8');
const fast = fs.readFileSync('bootstrap-app-chain-v339.js', 'utf8');
const docsLoader = fs.readFileSync('docs/bootstrap-integrity-loader-v258.js', 'utf8');
const docsFast = fs.readFileSync('docs/bootstrap-app-chain-v339.js', 'utf8');

const logicStart = loader.indexOf('function readIntegrityStatus()');
const logicEnd = loader.indexOf('function installStylesheet');
assert.notEqual(logicStart, -1);
assert.notEqual(logicEnd, -1);

function buildLogic(storage) {
  const localStorage = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; }
  };
  return new Function('localStorage', 'STATUS_KEY', 'FULL_VALIDATION_MAX_AGE_MS',
    `${loader.slice(logicStart, logicEnd)}; return { readIntegrityStatus, canUseFastPath };`
  )(localStorage, 'aldusBootstrapIntegrityV258', 24 * 60 * 60 * 1000);
}

test('V339 usa caminho rápido somente com validação íntegra e recente', () => {
  const now = Date.parse('2026-08-15T17:00:00Z');
  let logic = buildLogic({
    aldusBootstrapIntegrityV258: JSON.stringify({ ready: true, conflict: false, source: 'indexeddb', checkedAt: '2026-08-15T16:00:00Z' })
  });
  assert.equal(logic.canUseFastPath(now), true);

  logic = buildLogic({
    aldusBootstrapIntegrityV258: JSON.stringify({ ready: true, conflict: true, source: 'indexeddb', checkedAt: '2026-08-15T16:00:00Z' })
  });
  assert.equal(logic.canUseFastPath(now), false);

  logic = buildLogic({
    aldusBootstrapIntegrityV258: JSON.stringify({ ready: true, conflict: false, source: 'indexeddb', checkedAt: '2026-08-13T16:00:00Z' })
  });
  assert.equal(logic.canUseFastPath(now), false);

  logic = buildLogic({
    aldusBootstrapIntegrityV258: JSON.stringify({ ready: false, conflict: false, source: 'erro', checkedAt: '2026-08-15T16:00:00Z' })
  });
  assert.equal(logic.canUseFastPath(now), false);
});

test('V339 preserva app-v332 como aplicação ativa e carrega melhorias após o núcleo', () => {
  assert.match(fast, /\["aldusAppBundleScript", "app-v332\.js\?v=20260814-restaura-topificacao-jurisprudencia-v332"\]/);
  assert.match(fast, /await loadScript\(\.\.\.application\);/);
  assert.match(fast, /await Promise\.all\(enhancements\.map/);
  assert.match(fast, /aldus:bootstrap-integrity-v258-ready/);
  assert.match(loader, /FAST_CORE_SCRIPT/);
  assert.match(loader, /SAFE_CORE_SCRIPT/);
  assert.match(loader, /bootstrapMode: fastPath \? "fast" : "safe"/);
});

test('V339 mantém paridade entre raiz e docs', () => {
  assert.equal(loader, docsLoader);
  assert.equal(fast, docsFast);
});
