const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');


test('Aplicar incidências lê textarea, atualiza somente edital existente e renderiza relatório', () => {
  assert.match(html, /id="incidenceTableInput"/);
  assert.match(html, /id="applyIncidenceTableButton"[^>]*type="button"/);
  assert.match(script, /function applyIncidenceTable\(rawText\)/);
  assert.match(script, /if \(!state\.syllabusItems\.length\) \{/);
  assert.match(script, /Não há edital verticalizado importado\. Importe o edital antes de aplicar incidências\./);
  assert.match(script, /existingSyllabusDisciplinesForIncoming\(disciplinaRaw\)/);
  assert.doesNotMatch(script, /existingDisciplinesForIncoming\(disciplinaRaw\)/);
  assert.match(script, /item\.weight = normalizeSubjectIncidence\(valor\)/);
  assert.match(script, /item\.priority = normalizeImportedPriority\(prioridadeRaw\)/);
  assert.match(script, /Incidências aplicadas: \$\{report\.assuntosAtualizados\.length\} assuntos atualizados; \$\{report\.disciplinasAtualizadas\.length\} disciplinas atualizadas; \$\{notFound\.length\} não encontrados\./);
  assert.match(script, /const report = applyIncidenceTable\(elements\.incidenceTableInput\?\.value \|\| ""\);[\s\S]*saveData\(\);[\s\S]*render\(\);[\s\S]*renderIncidenceReport\(report\);/);
  assert.match(script, /elements\.applyIncidenceTableButton\?\.addEventListener\("click", handleApplyIncidenceTable\)/);
});
