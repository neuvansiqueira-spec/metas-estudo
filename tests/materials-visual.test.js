const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const pkg = require('../package.json');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const docsCss = fs.readFileSync('docs/style.css', 'utf8');
const sw = fs.readFileSync('service-worker.js', 'utf8');
const docsSw = fs.readFileSync('docs/service-worker.js', 'utf8');

test('classificação dinâmica cobre situações, prioridade e vínculo sem campo persistente', () => {
  assert.match(script, /function materialStudySituation\(material = \{\}\)/);
  assert.match(script, /if \(!materialLinkedToSyllabus\(material\)\) return "unlinked"/);
  assert.match(script, /return "completed"/);
  assert.match(script, /return "needsConfiguration"/);
  assert.match(script, /return "studying"/);
  assert.match(script, /return "ready"/);
  assert.match(script, /syllabusItemId/);
  assert.doesNotMatch(script, /material\.studySituation\s*=/);
});

test('resumo, grupos e Faça agora usam registros atuais sem duplicar cartões', () => {
  assert.match(script, /materialSummaryHTML\(list\)/);
  assert.match(script, /Total de materiais/);
  assert.match(script, /MATERIAL_SITUATION_ORDER/);
  assert.match(script, /materialGroupsHTML\(list\)/);
  assert.match(script, /data-material-group/);
  assert.match(script, /FAÇA AGORA/);
  assert.match(script, /data-open-material-card/);
  assert.match(script, /material-shortcut/);
  assert.match(script, /state\.materials\.filter\(materialMatchesFilters\)/);
});

test('cartões compactos, detalhes preservados e abertura exata pelo Faça agora', () => {
  assert.match(script, /compact-material-card/);
  assert.match(script, /data-toggle-material-details/);
  assert.match(script, /expandedMaterialCardId/);
  assert.match(script, /hidden/);
  assert.match(script, /materialEstimateFormHTML\(m\)/);
  assert.match(script, /saveMaterialEstimate\(saveEstimate\)/);
  assert.match(script, /updateFuturePendingGoalsForMaterial/);
  assert.match(script, /scrollIntoView\(\{ behavior: "smooth"/);
});

test('filtros existentes, novos filtros, ordenação e limpeza estão presentes', () => {
  for (const id of ['materialFilterDiscipline','materialFilterSubject','materialFilterType','materialFilterOrigin','materialFilterText','materialFilterSituation','materialFilterEstimate','materialSort','clearMaterialFilters']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(script, /materialFilterSituation/);
  assert.match(script, /materialFilterEstimate/);
  assert.match(script, /sortMaterialsList/);
  assert.match(script, /largestRemaining/);
  assert.match(script, /smallestProgress/);
});

test('progresso diferencia carga estimada, planejado e realizado', () => {
  assert.match(script, /const progressPercent = estimatedMinutes > 0 \? Math\.min\(100, Math\.round\(doneMinutes \/ estimatedMinutes \* 100\)\) : 0/);
  assert.match(script, /doneMinutes/);
  assert.match(script, /plannedMinutes/);
  assert.match(script, /remainingMinutes/);
  assert.match(script, /role="progressbar"/);
  assert.match(script, /aria-valuenow/);
});

test('materiais da Fábrica mantêm registro único e sem etapas da Fábrica na aba Materiais', () => {
  assert.match(script, /Gerado pela Fábrica/);
  assert.match(script, /data-open-factory-item/);
  assert.match(script, /factoryItemId/);
  assert.match(script, /source === "factory"/);
  assert.doesNotMatch(script.match(/function materialCardHTML[\s\S]*?function materialSummaryHTML/)?.[0] || '', /Triagem|Em produção|Aprovação|Word gerado|PDF gerado/);
});

test('proteções: prompts, carga horária, segmentação, backup, importação e sincronização preservados', () => {
  assert.match(script, /FACTORY_TRIAGEM_PROMPT_METODOLOGIA_GERAL_V1/);
  assert.match(script, /function calculateMaterialEstimatedMinutes/);
  assert.match(script, /function splitEstimatedMinutesIntoSegments/);
  assert.match(script, /makeBackupPayload\(\)[\s\S]*cloneData\(state\)/);
  assert.match(script, /mergeArrays\(state\.materials/);
  assert.match(script, /makeSyncPayload\(\)[\s\S]*cloneData\(state\)/);
});

test('paridade de publicação, versão/cache e responsividade básica', () => {
  assert.equal(script, docsScript);
  assert.equal(html, docsHtml);
  assert.equal(css, docsCss);
  assert.equal(sw, docsSw);
  assert.match(sw, new RegExp(`metas-estudo-${pkg.version}`));
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /overflow-wrap: anywhere/);
});
