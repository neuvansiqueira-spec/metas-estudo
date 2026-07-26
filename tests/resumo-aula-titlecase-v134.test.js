const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (file) => fs.readFileSync(file, "utf8");

const marker = "## CAPITALIZAÇÃO DOS TÓPICOS E SUBTÓPICOS";
const example = "▶️📚 Critério Material ou Substancial. Conteúdo Ofensivo:";

test("regra foi adicionada somente ao prompt Resumo/Aula", () => {
  for (const file of ["app-v118.js", "docs/app-v118.js"]) {
    const source = read(file);
    assert.equal((source.match(new RegExp(marker, "g")) || []).length, 1, file);
    assert.match(source, new RegExp(example.replace(/[.*+?^${}()|[\]\\]/g, "\$&")), file);
    assert.match(source, /MANTENHA OS TÍTULOS PRINCIPAIS MARCADOS COM ♦️ INTEGRALMENTE EM LETRAS MAIÚSCULAS/, file);
    assert.match(source, /APLIQUE ESTA REGRA SOMENTE AO CABEÇALHO ▶️📚/, file);
    assert.match(source, /NÃO APLIQUE AOS TÍTULOS ♦️/, file);
    const resumoStart = source.indexOf("const FACTORY_RESUMO_AULA_PROMPT_SEGMENT");
    const resumoEnd = source.indexOf("const FACTORY_RESUMO_AULA_PROMPT =", resumoStart);
    const markerIndex = source.indexOf(marker);
    assert.ok(resumoStart >= 0 && resumoEnd > resumoStart && markerIndex > resumoStart && markerIndex < resumoEnd, file);
  }
});

test("raiz e docs permanecem idênticos", () => {
  for (const file of [
    "index.html", "script.js", "app-v118.js", "factory-lei-prompt-v123.js",
    "service-worker-v118.js", "service-worker-v123.js", "service-worker.js"
  ]) assert.equal(read(file), read("docs/" + file), file);
});

test("versão e cache foram atualizados de forma coerente", () => {
  const version = "20260723-resumo-aula-topicos-v134";
  for (const file of ["index.html", "docs/index.html", "script.js", "docs/script.js", "app-v118.js", "docs/app-v118.js", "service-worker.js", "docs/service-worker.js"]) {
    assert.match(read(file), new RegExp(version), file);
  }
});
