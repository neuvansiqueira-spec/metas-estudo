const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (path) => fs.readFileSync(path, "utf8");

test("V296 é publicada de forma idêntica na raiz e em docs", () => {
  const source = read("security-hardening-v296.js");
  assert.equal(source, read("docs/security-hardening-v296.js"));
  assert.match(source, /20260810-seguranca-estabilidade-v296/);
  assert.match(source, /isCrossOriginFrame/);
  assert.match(source, /validateFile/);
  assert.match(source, /0x25, 0x50, 0x44, 0x46, 0x2d/);
  assert.match(source, /0x89, 0x50, 0x4e, 0x47/);
  assert.match(source, /navigator\.storage\.persist/);
  assert.match(source, /noopener noreferrer/);
  assert.match(source, /guardRapidSubmit/);
});

test("HTML aplica CSP antes dos scripts da aplicação", () => {
  for (const path of ["docs/index.html"]) {
    const html = read(path);
    const cspIndex = html.indexOf("Content-Security-Policy");
    const securityIndex = html.indexOf("security-hardening-v296.js");
    const bootstrapIndex = html.indexOf("storage-quota-guard-v256.js");
    assert.ok(cspIndex > 0, `${path} deve publicar CSP`);
    assert.ok(securityIndex > cspIndex, `${path} deve carregar V296 após a CSP`);
    assert.ok(bootstrapIndex > securityIndex, `${path} deve carregar V296 antes da aplicação`);
    assert.match(html, /script-src-attr 'none'/);
    assert.match(html, /object-src 'none'/);
    assert.match(html, /base-uri 'self'/);
    assert.match(html, /connect-src 'self' https:\/\/accounts\.google\.com https:\/\/www\.googleapis\.com/);
    assert.match(html, /<meta name="referrer" content="no-referrer"/);
    assert.doesNotMatch(html, /connect-src[^;]*\*/);
  }

  const entry = read("index.html");
  assert.match(entry, /aldus-entry-bootstrap-v309/,
    "a entrada da raiz deve permanecer restrita à barreira V309");
  assert.match(entry, /docs\/index\.html\?aldusEntry=/,
    "a entrada da raiz deve encaminhar ao shell protegido publicado em docs");
});

test("service worker atualiza sem perder toda a instalação por recurso opcional", () => {
  for (const path of ["service-worker.js", "docs/service-worker.js"]) {
    const worker = read(path);
    assert.match(worker, /SECURITY_HARDENING/);
    assert.match(worker, /security-hardening-v296\.js/);
    assert.match(worker, /ESSENTIAL_ASSETS/);
    assert.match(worker, /Promise\.allSettled/);
    assert.match(worker, /installSecurityHardeningV296/);
    assert.match(worker, /ignoreSearch: true/);
    assert.match(worker, /x-aldus-security/);
  }

  for (const path of ["service-worker-v291.js", "docs/service-worker-v291.js"]) {
    const bridge = read(path);
    assert.match(bridge, /importScripts\("service-worker\.js\?v=20260811-duplicate-flow-owner-v309"\)/,
      `${path} deve encaminhar ao worker autoritativo V309`);
  }
  assert.equal(read("service-worker-v291.js"), read("docs/service-worker-v291.js"));
});

test("artefatos públicos não contêm segredos de alto risco conhecidos", () => {
  const candidates = [
    "index.html",
    "app-v291.js",
    "app.bundle.js",
    "service-worker.js",
    "security-hardening-v296.js"
  ].map(read).join("\n");
  const forbidden = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /github_pat_[A-Za-z0-9_]{20,}/,
    /ghp_[A-Za-z0-9]{30,}/,
    /sk-[A-Za-z0-9_-]{30,}/,
    /AIza[0-9A-Za-z_-]{30,}/
  ];
  forbidden.forEach((pattern) => assert.doesNotMatch(candidates, pattern));
});
