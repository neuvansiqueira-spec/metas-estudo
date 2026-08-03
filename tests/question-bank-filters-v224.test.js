import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "question-bank-filters-v224.js"), "utf8");

test("filtros completos incluem campos adicionais relevantes", () => {
  for (const id of ["qbFilterAgencyV224", "qbFilterRoleV224", "qbFilterTypeV224", "qbFilterKeyStatusV224"]) {
    assert.match(source, new RegExp(id));
  }
  assert.match(source, /Órgão/);
  assert.match(source, /Cargo/);
  assert.match(source, /Gabarito/);
});

test("disciplinas e assuntos usam o catálogo integral do edital", () => {
  assert.match(source, /syllabusCatalogItems\(\)/);
  assert.match(source, /qbActiveSyllabusItems/);
  assert.match(source, /syllabusItemsFor\(filters\.discipline\)/);
  assert.match(source, /0 — sem questões/);
});

test("matching de assunto tolera variações de nomenclatura", () => {
  assert.match(source, /qbSafePartialMatch/);
  assert.match(source, /qbMatchesSyllabusItem/);
  assert.match(source, /matchesSubject/);
  assert.doesNotMatch(source, /q\.assunto\s*===\s*elements\.qbFilterSubject/);
});

test("interface mostra contagens e permite limpar os filtros", () => {
  assert.match(source, /qbFilterCoverageV224/);
  assert.match(source, /questão\(ões\) encontrada\(s\)/);
  assert.match(source, /qbClearFiltersV224/);
  assert.match(source, /Limpar filtros/);
});

test("versão substitui a filtragem e a cascata antigas", () => {
  assert.match(source, /qbFilteredQuestions = enhancedFilteredQuestions/);
  assert.match(source, /qbRenderCascadingFilters = enhancedRenderCascadingFilters/);
});
