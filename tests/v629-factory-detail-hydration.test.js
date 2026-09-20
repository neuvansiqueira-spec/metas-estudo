const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sources = [
  ['script.js', fs.readFileSync('script.js', 'utf8')],
  ['docs/script.js', fs.readFileSync('docs/script.js', 'utf8')],
];

// V629: abrir "DETALHES DO TEMA" pela barra do próprio tema mostrava um painel vazio.
// Só o tema de factoryOpenDetailId vinha montado; os demais ficavam com o placeholder
// e não havia nada que o preenchesse, porque o handler de clique só atende <button>.
for (const [name, source] of sources) {
  test(`${name}: o corpo do DETALHES DO TEMA fica em factoryDetailBodyHTML`, () => {
    assert.match(source, /function factoryDetailBodyHTML\(item\) \{/);
    assert.match(source, /<div class="factory-detail-body">\$\{factoryDetailBodyHTML\(item\)\}<\/div>/);
    assert.match(source, /factoryDetailBodyHTML\(item\)[\s\S]*?data-factory-prompt="\$\{item\.id\}\|\$\{key\}"/);
  });

  test(`${name}: abrir o tema hidrata o painel em vez de deixá-lo vazio`, () => {
    assert.match(source, /function hydrateFactoryDetail\(details\) \{/);
    assert.match(source, /mount\.innerHTML = factoryDetailBodyHTML\(normalizeFactoryItem\(raw\)\)/);
    assert.match(source, /mount\.removeAttribute\("data-detail-placeholder"\)/);
    assert.match(source, /details\.dataset\.detailHydrated = "true"/);
  });

  test(`${name}: a lista da Fábrica escuta toggle na fase de captura`, () => {
    assert.match(
      source,
      /elements\.factoryList\?\.addEventListener\("toggle",[\s\S]*?hydrateFactoryDetail\(details\);[\s\S]*?\}, true\);/
    );
  });

  test(`${name}: cartão fechado não monta mais o HTML que seria descartado`, () => {
    const render = source.slice(source.indexOf('const detailsHTML = (entry) =>'), source.indexOf('const cardFor = (entry'));
    assert.ok(render.includes('data-detail-placeholder'), 'o placeholder continua existindo');
    assert.ok(!render.includes('FACTORY_PROMPT_TYPES'), 'promptButtons saiu do caminho do cartão fechado');
    assert.ok(!render.includes('FACTORY_MODULES.filter'), 'moduleSummary saiu do caminho do cartão fechado');
  });
}

// V629 — desempenho da Fábrica. Medido em 20/09/2026 numa base do tamanho da real
// (629 metas, 877 temas): um desenho de "Todas as Metas" caiu de 1809 ms para 191 ms,
// e o "Plano do Dia" de 488 ms para 87 ms.
for (const [name, source] of sources) {
  test(`${name}: o painel de materiais só monta o conteúdo quando é aberto`, () => {
    assert.match(source, /function factoryPendingMaterialsHTML\(scopeDates = factoryScopeDates\(\)\) \{/);
    assert.match(source, /function hydrateFactoryPendingMaterials\(details\) \{/);
    assert.match(source, /data-factory-materials-panel/);
    assert.match(source, /data-factory-materials-body/);
    // o número do cabeçalho sai das metas, sem construir a projeção inteira
    assert.match(source, /const pendingGoalsCount = scopeDates\.reduce\(/);
    const render = source.slice(source.indexOf('function renderFactory()'), source.indexOf('function factoryGoToNext'));
    assert.ok(!render.includes('buildDailyPlanProjection'), 'renderFactory não monta mais a projeção do painel');
  });

  test(`${name}: a projeção do Plano do Dia é reaproveitada dentro do mesmo desenho`, () => {
    assert.match(source, /function buildDailyPlanProjectionUncached\(date, targetState = state\)/);
    assert.match(source, /dailyPlanProjectionTaskCache = new Map\(\);/);
    assert.match(source, /queueMicrotask\(\(\) => \{ dailyPlanProjectionTaskCache = null; \}\);/);
    // a assinatura descarta o cache se qualquer uma das listas lidas for trocada
    assert.match(source, /return \[targetState\.dailyGoals, targetState\.materials, targetState\.factoryAgenda, targetState\.factoryItems\];/);
    assert.match(source, /cached\.signature\.every\(\(value, index\) => value === signature\[index\]\)/);
  });

  test(`${name}: o teste de vínculo com o edital sai do laço por meta`, () => {
    assert.match(source, /const legacyFactoryCandidates = factoryItems\.filter\(\(item\) => !recordSyllabusAssociationIds\(item\)\.length\);/);
    assert.match(source, /const legacyMaterialCandidates = materials\.filter\(\(material\) => !recordSyllabusAssociationIds\(material\)\.length\);/);
    const build = source.slice(source.indexOf('function buildDailyPlanProjectionUncached'), source.indexOf('function materialsForDailyGoal'));
    const porMeta = build.slice(build.indexOf('return goals.map((goal) => {'));
    assert.ok(!porMeta.includes('recordSyllabusAssociationIds'), 'nenhuma chamada sobrou dentro do laço por meta');
  });
}

// V629 — o módulo de integridade da fila sanitizava a agenda inteira a cada meta.
for (const file of ['factory-queue-integrity-v236.js', 'docs/factory-queue-integrity-v236.js']) {
  const source = fs.readFileSync(file, 'utf8');
  test(`${file}: sanitize da agenda é reaproveitado dentro do mesmo desenho`, () => {
    assert.match(source, /function sanitizeAgenda\(entries\) \{/);
    assert.match(source, /sanitizeTaskCache = new WeakMap\(\);/);
    assert.match(source, /queueMicrotask\(\(\) => \{ sanitizeTaskCache = null; \}\);/);
    assert.match(source, /original\.call\(this, goal, sanitizeAgenda\(agenda\), \.\.\.rest\)/);
    // o resultado das coleções continua sendo sanitizado sem cache, porque é um array novo a cada chamada
    assert.match(source, /return sanitize\(original\.apply\(this, args\)\);/);
  });
}
