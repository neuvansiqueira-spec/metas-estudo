const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');
const sw = fs.readFileSync('service-worker.js', 'utf8');
const docsSw = fs.readFileSync('docs/service-worker.js', 'utf8');
const pkg = require('../package.json');

function loadEstimateLogic() {
  const start = script.indexOf('const MATERIAL_ESTIMATE_VERSION = 1;');
  const end = script.indexOf('const MOTIVATIONAL_PHRASES = [');
  assert.ok(start >= 0 && end > start, 'bloco de estimativa encontrado');
  return new Function(`${script.slice(start, end)}; return { calculateMaterialEstimatedMinutes, materialBaseEstimatedMinutes, roundToThirtyMinutes, normalizeMaterialEstimateFields, migrateMaterialEstimates, normalizeManualEstimatedMinutes, splitEstimatedMinutesIntoSegments, normalizeSegmentedGoalFields, migrateSegmentedGoals };`)();
}

const logic = loadEstimateLogic();

test('tabela-base de carga horária dinâmica', () => {
  const cases = [[0,0],[1,30],[5,30],[6,60],[10,60],[11,90],[15,90],[16,120],[25,120],[26,180],[35,180],[36,240],[45,240],[46,300],[55,300],[56,360],[65,360],[66,420]];
  for (const [pages, minutes] of cases) assert.equal(logic.calculateMaterialEstimatedMinutes(pages, 'normal'), minutes, `${pages} páginas`);
});

test('validação rejeita páginas inválidas e densidade inválida sem NaN', () => {
  assert.throws(() => logic.calculateMaterialEstimatedMinutes(-1, 'normal'), /negativas/);
  assert.throws(() => logic.calculateMaterialEstimatedMinutes(1.5, 'normal'), /inteiro/);
  assert.throws(() => logic.calculateMaterialEstimatedMinutes('texto', 'normal'), /inteiro/);
  assert.throws(() => logic.calculateMaterialEstimatedMinutes(1, 'pesada'), /Densidade inválida/);
  assert.equal(logic.calculateMaterialEstimatedMinutes('', 'normal'), 0);
  assert.equal(Number.isNaN(logic.calculateMaterialEstimatedMinutes(1, 'normal')), false);
  assert.equal(logic.calculateMaterialEstimatedMinutes(1, 'light'), 30);
});

test('densidade e arredondamento em blocos de 30 minutos com empate para cima', () => {
  assert.equal(logic.calculateMaterialEstimatedMinutes(6, 'light'), 60);
  assert.equal(logic.calculateMaterialEstimatedMinutes(11, 'light'), 60);
  assert.equal(logic.calculateMaterialEstimatedMinutes(16, 'dense'), 150);
  assert.equal(logic.calculateMaterialEstimatedMinutes(26, 'dense'), 240);
  assert.equal(logic.roundToThirtyMinutes(45), 60);
});

test('modos automático e manual preservam campos e recalculam corretamente', () => {
  const manual = logic.normalizeMaterialEstimateFields({ usefulPages: 18, materialDensity: 'normal', estimateMode: 'manual', manualEstimatedMinutes: 150 });
  assert.equal(manual.automaticEstimatedMinutes, 120);
  assert.equal(manual.estimatedMinutes, 150);
  const automaticAgain = logic.normalizeMaterialEstimateFields({ ...manual, estimateMode: 'automatic', usefulPages: 26, materialDensity: 'dense' });
  assert.equal(automaticAgain.manualEstimatedMinutes, 150);
  assert.equal(automaticAgain.estimatedMinutes, 240);
  const invalidManual = logic.normalizeMaterialEstimateFields({ usefulPages: 18, estimateMode: 'manual', manualEstimatedMinutes: '' });
  assert.equal(invalidManual.estimatedMinutes, 0);
});

test('migração é idempotente, preserva metas e normaliza materiais antigos', () => {
  const state = { materials: [{ id: 'm1', title: 'Antigo' }], dailyGoals: [{ id: 'g1', minutes: 50 }], settings: { custom: true }, migrations: {} };
  logic.migrateMaterialEstimates(state);
  const once = JSON.stringify(state);
  logic.migrateMaterialEstimates(state);
  assert.equal(JSON.stringify(state), once);
  assert.equal(state.materials[0].usefulPages, 0);
  assert.equal(state.materials[0].estimatedMinutes, 0);
  assert.deepEqual(state.dailyGoals, [{ id: 'g1', minutes: 50 }]);
  assert.equal(state.settings.custom, true);
});

test('backup, mesclagem, interface e publicação preservam campos da estimativa', () => {
  for (const token of ['usefulPages','materialDensity','automaticEstimatedMinutes','manualEstimatedMinutes','estimatedMinutes','estimateMode','estimatedAt','estimateVersion']) assert.match(script, new RegExp(token));
  assert.match(script, /mergeArrays\(state\.materials, \(data\.materials \|\| data\.materiais \|\| \[\]\)\.map\(normalizeMaterialEstimateFields\)/);
  assert.match(script, /makeSyncPayload\(\)[\s\S]*state: cloneData\(state\)/);
  assert.match(script, /Carga horária do material/);
  assert.match(script, /data-save-material-estimate/);
  assert.match(script, /Atualizar metas futuras pendentes/);
  assert.match(script, /Carga total estimada/);
  assert.match(script, /Tempo já planejado/);
  assert.match(html, /id="materialForm"/);
  assert.equal(script, docsScript);
  assert.equal(html, docsHtml);
  assert.equal(sw, docsSw);
  assert.match(sw, new RegExp(`metas-estudo-${pkg.version}`));
});



test('divisão da carga estimada em blocos seguros e soma exata', () => {
  const cases = [[120,[60,60]],[150,[60,60,30]],[180,[60,60,60]],[240,[60,60,60,60]],[300,[60,60,60,60,60]]];
  for (const [total, expected] of cases) {
    const segments = logic.splitEstimatedMinutesIntoSegments(total);
    assert.deepEqual(segments, expected, `${total} minutos`);
    assert.equal(segments.reduce((a,b)=>a+b,0), total);
    assert.equal(segments.every((minutes)=>minutes <= 90), true);
  }
});

test('integração da estimativa às metas preserva prioridades e proteções', () => {
  assert.match(script, /manualEstimatedMinutes[\s\S]*estimatedMinutes[\s\S]*customMinutes[\s\S]*fallbackMinutes/);
  assert.match(script, /planningContext\?\.materialEstimateBySyllabusItemId\.get\(item\.id\)/);
  assert.match(script, /"Questões": 45, "Revisão": 30, "Reforço": 45/);
  assert.match(script, /dynamicGoalSegmentKey/);
  assert.match(script, /segmentIndex/);
  assert.match(script, /segmentCount/);
  assert.match(script, /estimateSourceId/);
  assert.match(script, /Carga planejada recalculada após atualização do material/);
  assert.match(script, /shouldRecalculateDailyGoal\(g\)/);
});

test('migração segmentada é idempotente e preserva cronômetro, backup e sincronização', () => {
  const state = { dailyGoals: [{ id: 'g1', minutes: 60, actualMinutes: 10, segmentIndex: '2', segmentCount: '3', estimateSourceId: 'm1' }], migrations: {} };
  logic.migrateSegmentedGoals(state);
  const once = JSON.stringify(state);
  logic.migrateSegmentedGoals(state);
  assert.equal(JSON.stringify(state), once);
  assert.equal(state.dailyGoals[0].segmentIndex, 2);
  assert.match(script, /timerPlannedSeconds\(goal = floatingTimerGoal\(\)\)/);
  assert.match(script, /makeBackupPayload\(\)[\s\S]*data: cloneData\(state\)/);
  assert.match(script, /makeSyncPayload\(\)[\s\S]*state: cloneData\(state\)/);
});

test('TRIAGEM não foi alterada por esta suíte de estimativa', () => {
  assert.match(script, /const FACTORY_TRIAGEM_PROMPT = `/);
  assert.doesNotMatch(script, /TEMPO DINÂMICO[\s\S]*const FACTORY_TRIAGEM_PROMPT/);
});

test('botão Calcular usa o cartão clicado, feedback visível e não depende de CSS.escape', () => {
  assert.match(script, /button\?\.closest\?\.\("\.material-estimate-box"\)/);
  assert.match(script, /container\.querySelector\(`\[data-material-estimate-field=/);
  assert.doesNotMatch(script, /function collectMaterialEstimateFromCard\(id\)[\s\S]*document\.querySelector\(\`\[data-material-estimate-field/);
  assert.doesNotMatch(script, /function previewMaterialEstimate\(id\)[\s\S]*CSS\.escape\(id\)/);
  assert.match(script, /previewMaterialEstimate\(calcEstimate\)/);
  assert.match(script, /saveMaterialEstimate\(saveEstimate\)/);
  assert.match(script, /data-material-estimate-message="\$\{m\.id\}" aria-live="polite"/);
  assert.match(css, /\.material-estimate-feedback\.success/);
  assert.match(css, /\.material-estimate-feedback\.error/);
});

test('prévia manual 120 atualiza o próprio cartão com 2h e 2 blocos sem salvar ou sincronizar', () => {
  assert.match(script, /Prévia calculada: \$\{formatHours\(normalized\.estimatedMinutes\)\}/);
  assert.match(script, /Quantidade de blocos: \$\{segments\}/);
  const manual = logic.normalizeMaterialEstimateFields({ estimateMode: 'manual', usefulPages: '', materialDensity: 'normal', manualEstimatedMinutes: 120 });
  assert.equal(manual.estimatedMinutes, 120);
  assert.equal(logic.splitEstimatedMinutesIntoSegments(manual.estimatedMinutes).length, 2);
  const previewBlock = script.slice(script.indexOf('function previewMaterialEstimate'), script.indexOf('function saveMaterialEstimate'));
  assert.doesNotMatch(previewBlock, /saveData|autoSyncAfterSave|state\.dailyGoals|appendGoalHistory/);
});

test('modo manual não exige páginas úteis e rejeita tempo que não é múltiplo de 30', () => {
  assert.match(script, /payload\.estimateMode === "manual"[\s\S]*manualMinutes % 30 !== 0/);
  assert.match(script, /múltiplos de 30 minutos/);
  const manual = logic.normalizeMaterialEstimateFields({ estimateMode: 'manual', usefulPages: '', manualEstimatedMinutes: 120 });
  assert.equal(manual.estimatedMinutes, 120);
  assert.equal(logic.normalizeManualEstimatedMinutes(125), 0);
});

test('modo automático usa páginas e densidade para 10 páginas normais sem usar manual como final', () => {
  const automatic = logic.normalizeMaterialEstimateFields({ estimateMode: 'automatic', usefulPages: 10, materialDensity: 'normal', manualEstimatedMinutes: 120 });
  assert.equal(automatic.automaticEstimatedMinutes, 60);
  assert.equal(automatic.estimatedMinutes, 60);
  assert.equal(logic.splitEstimatedMinutesIntoSegments(automatic.estimatedMinutes).length, 1);
});

test('Salvar estimativa coleta o próprio cartão sem exigir cálculo prévio', () => {
  const saveBlock = script.slice(script.indexOf('function saveMaterialEstimate'), script.indexOf('const MOTIVATIONAL_PHRASES'));
  assert.match(saveBlock, /collectMaterialEstimateFromContainer\(container\)/);
  assert.doesNotMatch(saveBlock, /previewMaterialEstimate\(/);
  assert.match(saveBlock, /Estimativa salva com sucesso/);
  assert.match(saveBlock, /setMaterialEstimateFeedback/);
});

test('arquivos de publicação mantêm paridade entre raiz e docs para correção da carga horária', () => {
  assert.equal(script, docsScript);
  assert.equal(css, fs.readFileSync('docs/style.css', 'utf8'));
  assert.equal(html, docsHtml);
  assert.equal(sw, docsSw);
});

test('Materiais renderizam grupos visuais sem mutar registros', () => {
  assert.match(script, /function buildMaterialLibraryViewModel/);
  assert.match(script, /function materialPhysicalFileIdentity/);
  assert.match(script, /Origens vinculadas/);
  assert.match(script, /Editar cadastro manual/);
  assert.match(script, /Excluir cadastro manual/);
  assert.match(script, /<summary>Ver detalhes<\/summary>/);
  assert.doesNotMatch(script, /state\.materials\.(?:open|expanded|collapsed)/i);
  assert.equal(script, docsScript);
});

test('Materiais têm exatamente três seções recolhíveis com estado inicial em memória', () => {
  assert.match(script, /const materialSectionOpenState = \{ today: true, recent: false, all: false \};/);
  assert.match(script, /data-material-section="\$\{key\}"\$\{openAttribute\}/);
  assert.match(script, /materialSectionHTML\("today", "1\. MATERIAIS PARA O PLANO DE HOJE", todayMaterials/);
  assert.match(script, /materialSectionHTML\("recent", "2\. MATERIAIS RECENTES", recentMaterials/);
  assert.match(script, /materialSectionHTML\("all", "3\. TODOS OS MATERIAIS", list/);
  assert.match(script, /<details class="materials-section materials-collapsible-section"/);
  assert.match(script, /<summary class="materials-section-summary">\$\{title\}<\/summary>/);
  assert.match(script, /<div class="materials-section-content">\$\{sectionContent\}<\/div>/);
  assert.match(script, /const openAttribute = materialSectionOpenState\[key\] \? " open" : ""/);
});

test('Materiais preservam abertura independente após render sem persistir em state ou localStorage', () => {
  assert.match(script, /let materialSectionToggleListenerRegistered = false;/);
  assert.match(script, /addEventListener\("toggle",/);
  assert.match(script, /materialSectionOpenState\[key\] = detail\.open;/);
  assert.match(script, /const materialItemOpenState = new Set\(\);/);
  assert.match(script, /data-material-item-key/);
  assert.match(script, /materialItemOpenState\.add\(key\)/);
  assert.match(script, /materialItemOpenState\.delete\(key\)/);
  assert.match(script, /ensureMaterialSectionToggleListener\(\);/);
  assert.doesNotMatch(script, /state\.[A-Za-z0-9_]*(Material|material)[A-Za-z0-9_]*(Open|Collapsed|Expanded|Section)/);
  const materialSectionBlock = script.slice(script.indexOf('const materialSectionOpenState'), script.indexOf('function updateStudyMaterialOptions'));
  assert.doesNotMatch(materialSectionBlock, /localStorage/);
  assert.doesNotMatch(materialSectionBlock, /querySelectorAll\([^)]*data-material-section[\s\S]*forEach\([^)]*addEventListener/);
});

test('Materiais aplicam modelo agrupado às três seções', () => {
  const renderBlock = script.slice(script.indexOf('function renderMaterials'), script.indexOf('function updateStudyMaterialOptions'));
  assert.match(renderBlock, /const list = filteredMaterials\(\)/);
  assert.match(renderBlock, /getDailyGoalMaterialState\(goal, todayProjectionByGoalId\.get\(goal\.id\)\)\.materials\.map/);
  assert.match(renderBlock, /group\.records\.some/);
  assert.match(renderBlock, /todayKeys/);
  assert.match(renderBlock, /slice\(0, 10\)/);
  assert.match(renderBlock, /materialSectionHTML\("all", "3\. TODOS OS MATERIAIS", list/);
  assert.match(script, /Nenhum material pronto vinculado ao plano de hoje\./);
  assert.match(script, /Nenhum material recente\./);
  assert.match(script, /elements\.materialFilterDiscipline[\s\S]*addEventListener\("input", renderMaterials\)/);
  assert.match(script, /elements\.materialFilterDiscipline[\s\S]*addEventListener\("change", renderMaterials\)/);
});

test('CSS novo das seções recolhíveis fica limitado à aba Materiais', () => {
  const collapsibleCss = css.split('\n').filter((line) => line.includes('materials-collapsible-section') || line.includes('materials-section-summary') || line.includes('materials-section-content')).join('\n');
  assert.match(collapsibleCss, /#view-materiais \.materials-collapsible-section/);
  assert.match(collapsibleCss, /#view-materiais \.materials-section-summary/);
  assert.match(collapsibleCss, /#view-materiais \.materials-section-content/);
  assert.doesNotMatch(collapsibleCss, /(^|\n)\s*(details|summary|section|h3|button|\.material-card|\.syllabus-card)\b/);
  assert.match(collapsibleCss, /cursor: pointer/);
  assert.match(collapsibleCss, /overflow-wrap: anywhere/);
});
