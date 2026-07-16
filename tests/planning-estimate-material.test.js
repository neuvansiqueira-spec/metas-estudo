const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const script = fs.readFileSync('script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

test('Planejamento usa cartões responsivos, não uma tabela larga', () => {
  assert.match(html, /id="timeHistoryCards" class="planning-history-cards"/);
  assert.doesNotMatch(html, /id="timeHistoryBody"/);
  assert.match(script, /function planningHistoryCardHTML/);
  for (const field of ['Tempo planejado', 'Tempo realizado', 'Tipo:', 'Prioridade:', 'Material vinculado:', 'Observações e histórico']) assert.match(script, new RegExp(field));
  assert.match(css, /\.planning-history-cards \{ display: grid; grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 420px\), 1fr\)\)/);
  assert.match(css, /@media \(max-width: 768px\) \{ \.planning-history-cards \{ grid-template-columns: 1fr;/);
  assert.match(css, /#view-planejamento \{ overflow-x: clip; \}/);
});

test('Estimativa da meta diferencia total, bloco, etapa e dados existentes', () => {
  assert.match(script, /function goalMaterialEstimateHTML/);
  assert.match(script, /Estimativa total/);
  assert.match(script, /Bloco atual/);
  assert.match(script, /Etapa/);
  assert.match(script, /Páginas úteis/);
  assert.match(script, /Densidade/);
  assert.match(script, /cálculo automático/);
  assert.match(script, /Sem estimativa de material vinculada\./);
  assert.match(script, /function nextGoalEstimateHTML/);
  assert.match(script, /Estimativa do material:/);
  assert.match(script, /Planejado agora:/);
});

test('Abrir material usa fluxo central, noopener e feedback interno', () => {
  assert.match(script, /function openGoalMaterial\(goalId, materialId = ""\)/);
  assert.match(script, /materialsForDailyGoal\(goal, projectionEntry\)/);
  assert.match(script, /window\.open\(material\.link, "_blank", "noopener"\)/);
  assert.match(script, /O material existe, mas este formato não possui link válido\./);
  assert.match(script, /Escolha um material disponível para abertura\./);
  assert.match(script, /data-material-id="\$\{m\.id\}"/);
  assert.match(script, /event\.preventDefault\(\); event\.stopPropagation\(\); openGoalMaterial/);
  assert.match(script, /data-open-goal-material="\$\{goal\.id\}"/);
  assert.match(script, /Cronômetro estudo/);
  assert.match(script, /Cronômetro questões/);
  assert.match(script, /Concluir meta/);
});

test('arquivos publicados e versão permanecem sincronizados', () => {
  assert.equal(script, fs.readFileSync('docs/script.js', 'utf8'));
  assert.equal(html, fs.readFileSync('docs/index.html', 'utf8'));
  assert.equal(css, fs.readFileSync('docs/style.css', 'utf8'));
  assert.equal(fs.readFileSync('service-worker.js', 'utf8'), fs.readFileSync('docs/service-worker.js', 'utf8'));
  assert.match(script, /20260716-corrige-otimizacao-abas-v2/);
});
