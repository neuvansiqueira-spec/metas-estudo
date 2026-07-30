import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../question-bank-json-priority-v195.js", import.meta.url), "utf8");

test("V195 usa captura no window e delega para a revisão V192", () => {
  assert.match(source, /window\.addEventListener\("change", priorityJsonReview, true\)/);
  assert.match(source, /AldusQuestionBankJsonReviewV192/);
  assert.match(source, /review\.handleJsonChange\(event\)/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
});

test("V195 não bloqueia o fallback quando a revisão V192 não existe", () => {
  let handler;
  const context = {
    globalThis: null,
    window: { addEventListener(type, fn, capture) { assert.equal(type, "change"); assert.equal(capture, true); handler = fn; } }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  let stopped = false;
  handler({ target: { id: "qbFile", files: [{}] }, preventDefault() {}, stopImmediatePropagation() { stopped = true; } });
  assert.equal(stopped, false);
});

test("V195 bloqueia listeners antigos e chama o painel quando V192 está disponível", () => {
  let handler;
  let delegated = false;
  const context = {
    globalThis: null,
    window: { addEventListener(_type, fn) { handler = fn; } },
    AldusQuestionBankJsonReviewV192: { handleJsonChange() { delegated = true; } }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  let prevented = false;
  let stopped = false;
  handler({
    target: { id: "qbFile", files: [{}] },
    preventDefault() { prevented = true; },
    stopImmediatePropagation() { stopped = true; }
  });
  assert.equal(prevented, true);
  assert.equal(stopped, true);
  assert.equal(delegated, true);
});
