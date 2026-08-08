const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'bootstrap-integrity-loader-v276.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

test('V276 usa somente a auditoria preventiva V275 antes do app', () => {
  assert.match(loader, /__ALDUS_CATASTROPHIC_GUARD_READY_V275__/);
  assert.doesNotMatch(loader, /bootstrap-integrity-loader-v258-core\.js/);
  assert.match(loader, /redundantV258AuditSkipped:\s*true/);
});

test('V276 preserva o cache V275 e atualiza apenas os ativos de bootstrap', () => {
  assert.match(worker, /data-protection-v275/);
  assert.doesNotMatch(worker, /data-protection-v276/);
  assert.match(worker, /const UPGRADE_ASSETS = \[CATASTROPHIC_STATE_GUARD, BOOTSTRAP_PROTECTED, RECOVERY_SAFETY\]/);
  assert.match(worker, /cache\.addAll\(UPGRADE_ASSETS\)/);
  assert.doesNotMatch(worker, /cache\.addAll\(STATIC_ASSETS\)/);
});

test('V276 injeta o bootstrap rápido e mantém a proteção e diagnóstico atuais', () => {
  assert.match(worker, /bootstrap-integrity-loader-v276\.js/);
  assert.match(worker, /catastrophic-state-guard-v275\.js/);
  assert.match(worker, /duplicate-diagnostics-loader-v269\.js/);
  assert.match(worker, /x-aldus-startup-performance/);
});
