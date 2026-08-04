const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');

const worker = fs.readFileSync('service-worker.js', 'utf8');
const docsWorker = fs.readFileSync('docs/service-worker.js', 'utf8');

test('service worker publica e injeta a recuperação da linha do tempo', () => {
  assert.match(worker, /const TIMER_TIMELINE_RECOVERY = `timer-timeline-recovery-v237\.js\?v=\$\{CURRENT_VERSION\}&hotfix=timer-timeline-recovery-hotfix1`/);
  assert.match(worker, /TIMER_TIMELINE_RECOVERY,/);
  assert.match(worker, /if \(!patchedHtml\.includes\("timer-timeline-recovery-v237\.js"\)\)/);
  assert.match(worker, /id="aldusTimerTimelineRecoveryV237"/);
  assert.match(worker, /x-aldus-timer-timeline-hotfix/);
  assert.match(worker, /timer-timeline-hotfix1/);
});

test('service workers raiz e docs permanecem idênticos', () => {
  assert.equal(docsWorker, worker);
});
