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
  assert.match(script, /sem estimativa de duração/);
  assert.match(script, /function nextGoalEstimateHTML/);
  assert.match(script, /duração estimada:/);
});

test('Meta compara estimativa e tempo realizado sem concluir automaticamente', () => {
  assert.match(script, /function goalTimeComparison\(/);
  assert.match(script, /plannedStudyStatsForMaterial\(material\)\.done/);
  assert.match(script, /Restam aproximadamente/);
  assert.match(script, /Concluída .* antes da estimativa/);
  assert.match(script, /Precisou de .* adicionais/);
  assert.match(script, /Estimativa ultrapassada em/);
  assert.match(script, /Este indicador é informativo: a meta só é concluída/);
  assert.match(script, /goalTimeComparisonHTML\(goal, projectionEntry, materialState\)/);
  assert.doesNotMatch(script.match(/function goalTimeComparison[\s\S]*?function nextGoalEstimateHTML/)[0], /goal\.status\s*=/);
  assert.match(css, /\.goal-time-comparison\.tone-ahead/);
  assert.match(css, /\.goal-time-comparison\.tone-exceeded/);
});

test('Estimativa fica no Planejamento e projeta o total pelo ritmo realmente concluído', () => {
  assert.match(html, /data-planning-section="estimates"/);
  assert.match(html, /id="planningMaterialEstimates"/);
  assert.match(html, /Carga prevista, tempo realizado e projeção pelo ritmo real/);
  assert.match(script, /function renderPlanningMaterialEstimates\(\)/);
  assert.match(script, /completedActual \/ completedPlanned/);
  assert.match(script, /projectedTotal = hasPaceSample \? roundToThirtyMinutes\(total \* paceFactor\) : total/);
  assert.match(script, /Tendência de terminar antes/);
  assert.match(script, /Tendência de precisar de mais tempo/);
  assert.match(script, /Tendência de ficar dentro da estimativa/);
  assert.match(script, /Projeção pelo ritmo real/);
  assert.match(script, /data-open-material-estimate/);
  assert.match(script, /openMaterialEstimateInPlanning/);
  assert.match(css, /\.planning-estimate-item/);
});

test('Menu principal clássico é preservado e blocos internos são recolhíveis', () => {
  for (const group of ['Principal', 'Edital', 'Desempenho', 'Apoio', 'Sistema']) assert.match(html, new RegExp(`<span>${group}</span>`));
  assert.doesNotMatch(html, /class="mobile-menu-group navigation-group"/);
  assert.doesNotMatch(html, /class="side-nav-group navigation-group"/);
  assert.match(script, /function enhanceCollapsibleSections/);
  assert.match(script, /sessionStorage\.setItem\(`collapsible:/);
  assert.match(css, /\.interface-collapsible-summary/);
  assert.match(css, /details:not\(\[open\]\) > :not\(summary\) \{ display: none !important; \}/);
  assert.match(script, /#view-dashboard \.dashboard-block/);
  assert.match(script, /#view-backup > \.sync-card/);
  assert.match(script, /#view-como-usar \.instructions-grid > article/);
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
  assert.match(script, /20260717-fluxo-questoes-v25/);
});
