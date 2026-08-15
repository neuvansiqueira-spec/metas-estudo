"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("V338 restaura a marca de alta resolução no fluxo ativo do site", () => {
  const index = read("index.html");
  const loader = read("bootstrap-integrity-loader-v258.js");
  const docsLoader = read("docs/bootstrap-integrity-loader-v258.js");
  const brandFix = read("header-brand-fix.js");

  assert.match(index, /bootstrap-integrity-loader-v258\.js/);
  assert.equal(loader, docsLoader);
  assert.match(loader, /header-brand-fix\.js\?v=20260815-logo-alta-qualidade-v338/);
  assert.match(loader, /parent\.insertBefore\(brandFix,/);
  assert.match(brandFix, /icons\/aldus-visual\.png/);
  assert.match(brandFix, /width="1254" height="1254"/);
  assert.doesNotMatch(brandFix, /aldus-visual-320\.webp/);
});
