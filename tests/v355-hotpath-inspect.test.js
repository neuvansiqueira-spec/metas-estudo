import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function range(path, start, end) {
  const lines = fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8").split(/\r?\n/);
  return lines.slice(start - 1, end).map((line, index) => `${start + index}: ${line}`).join("\n");
}

function around(path, needle, radius = 8) {
  const lines = fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8").split(/\r?\n/);
  const index = lines.findIndex((line) => line.includes(needle));
  if (index < 0) return `${needle}: NOT FOUND`;
  const start = Math.max(0, index - radius);
  const end = Math.min(lines.length, index + radius + 1);
  return lines.slice(start, end).map((line, offset) => `${start + offset + 1}: ${line}`).join("\n");
}

test("V355 diagnóstico do hot path medido no Chrome", () => {
  const report = [
    "=== app-v344.js 56220-56255 ===",
    range("app-v344.js", 56220, 56255),
    "=== script.js 42100-42170 ===",
    range("script.js", 42100, 42170),
    "=== normalizeConcursosCatalogText em script.js ===",
    around("script.js", "normalizeConcursosCatalogText", 12),
    "=== requestAnimationFrame próximo de scheduleViewRenderAfterPaintV170 ===",
    around("script.js", "scheduleViewRenderAfterPaintV170", 16)
  ].join("\n");
  assert.fail(report);
});
