const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("duplicate-diagnostics-fast-decisions-v321.js", "utf8");

test("decisões simples não refazem o diagnóstico global", () => {
  const body = source.slice(source.indexOf("async function simple"), source.indexOf("async function consolidate"));
  assert.ok(body.includes("setPairDecision"));
  assert.ok(body.includes("await write(info, false)"));
  assert.ok(!body.includes("diagnoseState"));
});

test("consolidação individual mantém backup, validação e não recarrega a página", () => {
  const body = source.slice(source.indexOf("async function consolidate"), source.indexOf("function click"));
  assert.ok(body.includes("await backup"));
  assert.ok(body.includes("consolidateItems"));
  assert.ok(body.includes("await write(info, true)"));
  assert.ok(!body.includes("diagnoseState"));
  assert.ok(!body.includes("location.reload"));
});

test("somente ações individuais dos cartões são interceptadas", () => {
  assert.ok(source.includes('["keep","not-duplicate","later"]'));
  assert.ok(source.includes("event.stopImmediatePropagation()"));
  assert.ok(source.includes("skipDerivedRefresh: true"));
});
