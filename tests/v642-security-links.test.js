"use strict";

// V642 — auditoria de segurança de 27/09/2026: links montados a partir de dados (Fábrica e
// exportação do Calendário) só viram <a href> quando começam com http(s). Um link
// "javascript:..." colado ou importado não pode virar código executável ao ser clicado.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const script = fs.readFileSync("script.js", "utf8");

test("links Word/PDF da Fábrica exigem http(s)", () => {
  assert.match(script, /isValidHttpUrl\(module\.wordLink\) \? `<a href=/);
  assert.match(script, /isValidHttpUrl\(module\.pdfLink\) \? `<a href=/);
  assert.doesNotMatch(script, /module\.wordLink \? `<a href=/);
  assert.doesNotMatch(script, /module\.pdfLink \? `<a href=/);
});

test("isValidHttpUrl recusa javascript:, data: e texto solto", () => {
  const start = script.indexOf("function isValidHttpUrl(");
  const end = script.indexOf("\n", start);
  const context = { URL };
  vm.createContext(context);
  vm.runInContext(script.slice(start, end), context);
  assert.equal(context.isValidHttpUrl("https://drive.google.com/file/d/x"), true);
  assert.equal(context.isValidHttpUrl("javascript:alert(1)"), false);
  assert.equal(context.isValidHttpUrl("JavaScript:alert(1)"), false);
  assert.equal(context.isValidHttpUrl("data:text/html,<script>alert(1)</script>"), false);
  assert.equal(context.isValidHttpUrl("drive.google.com"), false);
});

test("exportação do Calendário só cria link de pasta com http(s)", () => {
  const source = fs.readFileSync("goal-calendar-export-v623.js", "utf8");
  assert.match(source, /\/\^https\?:\\\/\\\/\/i\.test\(String\(row\.folderUrl \|\| ""\)\) \? `<a href=/);
  assert.equal(fs.readFileSync("docs/goal-calendar-export-v623.js", "utf8"), source);
});
