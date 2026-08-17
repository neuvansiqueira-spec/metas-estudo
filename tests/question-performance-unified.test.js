const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('questões separam registro e consulta unificada sem alterar fontes persistidas', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const script = fs.readFileSync('script.js', 'utf8');
  assert.match(html, /Registrar sessão de questões/);
  assert.match(html, /Registrar Resultado da Nova Sessão/);
  assert.match(script, /Histórico deste assunto/);
  assert.match(html, /Desempenho e Histórico de Questões/);
  assert.match(html, /questionFilterOrigin/);
  assert.match(script, /function getUnifiedQuestionPerformanceRecords\(\)/);
  assert.match(script, /source:'manual'/);
  assert.match(script, /source:'banco'/);
  assert.match(script, /Somente leitura/);
  assert.match(script, /data-view-question-performance/);
  // 2026-08-17: a assinatura ganhou um índice opcional para eliminar a varredura
  // de syllabusItems por registro, que custava 1,2 s no render do dashboard. Sem
  // o índice o comportamento é o anterior, e a regra de resolver somente quando
  // há exatamente um candidato continua valendo nos dois caminhos — é o que a
  // linha seguinte e o teste de equivalência em question-record-index-v351 travam.
  assert.match(script, /function questionRecordItem\(record, index = null\)/);
  assert.match(script, /matches\.length === 1/);
});

test('arquivos publicados permanecem espelhados', () => {
  assert.equal(fs.readFileSync('script.js', 'utf8'), fs.readFileSync('docs/script.js', 'utf8'));
  assert.equal(fs.readFileSync('index.html', 'utf8'), fs.readFileSync('docs/index.html', 'utf8'));
  assert.equal(fs.readFileSync('service-worker.js', 'utf8'), fs.readFileSync('docs/service-worker.js', 'utf8'));
});
