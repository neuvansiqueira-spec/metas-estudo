const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('V318 is loaded by the entry bootstrap with a cache-busted version', () => {
  const index = read('index.html');
  assert.ok(
    /security-observability-v318\.js\?v=\$\{OBSERVABILITY_VERSION\}/.test(index)
      || /id="aldusSecurityObservabilityV318" defer src="security-observability-v318\.js\?v=20260814-desempenho-integral-v329"/.test(index)
      || /id="aldusSecurityObservabilityV318" defer src="security-observability-v318\.js\?v=20260826-planning-consent-guard-v398"/.test(index),
    'V318 deve ser carregada pela barreira histórica ou diretamente pelo shell publicado'
  );
});

test('V318 never transmits error messages, stacks, blocked URLs or source samples', () => {
  const source = read('security-observability-v318.js');
  assert.match(source, /do not transmit blockedURI, sourceFile or sample/i);
  assert.doesNotMatch(source, /event\.message/);
  assert.doesNotMatch(source, /event\.filename/);
  assert.doesNotMatch(source, /error\?\.stack/);
  assert.doesNotMatch(source, /event\.blockedURI/);
  assert.doesNotMatch(source, /event\.sourceFile/);
  assert.doesNotMatch(source, /event\.sample/);
});

test('V318 observes CSP violations, unsafe imports, runtime failures and performance', () => {
  const source = read('security-observability-v318.js');
  assert.match(source, /securitypolicyviolation/);
  assert.match(source, /aldus:unsafe-file-blocked/);
  assert.match(source, /unhandledrejection/);
  assert.match(source, /resource_load_error/);
  assert.match(source, /largest-contentful-paint/);
  assert.match(source, /layout-shift/);
  assert.match(source, /MAX_EVENTS_PER_MINUTE/);
});

test('existing CSP keeps the principal containment directives', () => {
  const html = read('docs/index.html');
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /base-uri 'self'/);
  assert.match(html, /form-action 'self'/);
  assert.match(html, /connect-src 'self' https:\/\/accounts\.google\.com https:\/\/www\.googleapis\.com https:\/\/us\.i\.posthog\.com/);
});
