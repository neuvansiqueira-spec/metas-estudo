const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const serviceWorker = fs.readFileSync('service-worker.js', 'utf8');
const docsServiceWorker = fs.readFileSync('docs/service-worker.js', 'utf8');

const version = '20260714-safe-area-mensagens-alarme-cronometro-v3';
const clickRoutes = [
  'factoryPrompt', 'factoryPromptClose', 'factoryPromptCopy', 'factoryRouterCopy',
  'factoryEdit', 'factoryDelete', 'factoryModules', 'factoryModulesCancel',
  'factoryToggleDetail', 'factoryNext', 'factoryTriagem', 'factoryReopen', 'openUrl'
];
const libraryRoutes = ['factoryLibraryClose', 'factoryLibraryRestore'];

function dataFactoryAttributes(source) {
  return [...new Set([...source.matchAll(/data-(factory-[a-z0-9-]+)/g)].map((match) => match[1]))].sort();
}

test('listeners da Fábrica são inicializados uma única vez e nos elementos estáveis', () => {
  assert.match(script, /let factoryEventsInitialized = false/);
  assert.match(script, /function initFactoryEvents\(\)/);
  assert.match(script, /if \(factoryEventsInitialized\) return;/);
  assert.match(script, /elements\.factoryForm\?\.addEventListener\("submit", saveFactoryItem\)/);
  assert.match(script, /const factoryFilterContainer = document\.querySelector\("\[data-factory-filter\]"\)\?\.parentElement/);
  assert.match(script, /factoryFilterContainer\?\.addEventListener\("click", handleFactoryFilterClick\)/);
  assert.match(script, /elements\.factoryList\?\.addEventListener\("click", handleFactoryListClick\)/);
  assert.match(script, /elements\.factoryList\?\.addEventListener\("submit", handleFactoryModulesSubmit\)/);
  assert.match(script, /elements\.factoryPromptLibraryPanel\?\.addEventListener\("click", handleFactoryPromptLibraryClick\)/);
  assert.match(script, /elements\.factoryPromptLibraryPanel\?\.addEventListener\("submit", handleFactoryPromptLibrarySubmit\)/);
  assert.match(script, /elements\.editFactoryPromptLibrary\?\.addEventListener\("click", openFactoryPromptLibrary\)/);
  assert.equal((script.match(/initFactoryEvents\(\);/g) || []).length, 1);
});

test('roteador da lista trata todos os botões operacionais e evita conflito com abertura global de URL', () => {
  for (const route of clickRoutes) assert.match(script, new RegExp(`FACTORY_CLICK_ROUTES = \\[.*${route}`, 's'), `${route} deve estar declarado como rota`);
  assert.match(script, /const \[id, type\] = prompt\.dataset\.factoryPrompt\.split\("\|"\); return showFactoryPrompt\(id, type\)/);
  assert.match(script, /return closeFactoryPrompt\(closePrompt\.dataset\.factoryPromptClose\)/);
  assert.match(script, /return copyFactoryPrompt\(copyPrompt\.dataset\.factoryPromptCopy, false\)/);
  assert.match(script, /return copyFactoryPrompt\(copyRouter\.dataset\.factoryRouterCopy, true\)/);
  assert.match(script, /return editFactoryItem\(edit\.dataset\.factoryEdit\)/);
  assert.match(script, /return deleteFactoryItem\(del\.dataset\.factoryDelete\)/);
  assert.match(script, /return editFactoryModules\(modules\.dataset\.factoryModules\)/);
  assert.match(script, /data-factory-modules-panel/);
  assert.match(script, /panel\.innerHTML = ""/);
  assert.match(script, /return toggleFactoryDetail\(toggleDetail\.dataset\.factoryToggleDetail\)/);
  assert.match(script, /return factoryGoToNext\(nextTheme\.dataset\.factoryNext\)/);
  assert.match(script, /return reopenFactoryTheme\(reopen\.dataset\.factoryReopen\)/);
  assert.match(script, /const \[id, status\] = triagem\.dataset\.factoryTriagem\.split\("\|"\); return setFactoryTriagemStatus\(id, status\)/);
  assert.match(script, /event\.stopPropagation\(\); return openFactoryUrl\(openUrl\.dataset\.openUrl\)/);
});

test('filtros, módulos e biblioteca têm tratamento seguro e sem dados ou layout novos', () => {
  for (const filter of ['faca-agora', 'fila-hoje', 'aguardando-triagem', 'resumo-aula', 'em-producao', 'aguardando-revisao', 'precisa-refazer', 'prontos', 'todos']) {
    assert.match(html, new RegExp(`data-factory-filter="${filter}"`));
  }
  assert.match(script, /factoryCurrentFilter = button\.dataset\.factoryFilter \|\| "faca-agora"/);
  assert.match(script, /button\.classList\.toggle\("active", active\)/);
  assert.match(script, /button\.setAttribute\("aria-pressed", active \? "true" : "false"\)/);
  assert.match(script, /if \(!event\.target\.closest\("\[data-factory-modules-form\]"\)\) return;/);
  assert.match(script, /const goNext = event\.submitter\?\.dataset\?\.factorySaveNext === "true"/);
  assert.match(script, /function openFactoryPromptLibrary\(\)/);
  assert.match(script, /renderFactoryPromptLibrary\(\)/);
  assert.match(script, /saveFactoryPromptLibrary\(event\)/);
  assert.match(script, /defaultFactoryPromptLibrary\[key\] \|\| ""/);
  assert.doesNotMatch(script, /localStorage\.setItem\([^)]*factoryEventsInitialized/);
});

test('atributos data-factory-* gerados têm rota ou são campos/painéis explicitamente não acionáveis', () => {
  const attrs = dataFactoryAttributes(`${html}\n${script}`);
  const actionable = new Set([
    'factory-filter', 'factory-prompt', 'factory-prompt-close', 'factory-prompt-copy',
    'factory-router-copy', 'factory-edit', 'factory-delete', 'factory-modules',
    'factory-modules-cancel', 'factory-toggle-detail', 'factory-next', 'factory-triagem', 'factory-reopen',
    'factory-library-close', 'factory-library-restore'
  ]);
  const passive = new Set([
    'factory-library-field', 'factory-modules-form', 'factory-module-field', 'factory-save-next',
    'factory-prompt-text', 'factory-router-text', 'factory-prompt-message', 'factory-card',
    'factory-detail', 'factory-prompt-panel', 'factory-modules-panel'
  ]);
  const unexpected = attrs.filter((attr) => !actionable.has(attr) && !passive.has(attr));
  assert.deepEqual(unexpected, []);
  for (const attr of actionable) assert.ok(attrs.includes(attr), `${attr} deve ser gerado`);
});

test('URLs da Fábrica são validadas e erros de eventos não travam a aplicação', () => {
  assert.match(script, /function openFactoryUrl\(url\)/);
  assert.match(script, /new URL\(String\(url \|\| ""\)\)/);
  assert.match(script, /\["http:", "https:"\]\.includes\(parsed\.protocol\)/);
  assert.match(script, /Link inválido ou não preenchido\. Preencha a pasta correspondente da Fábrica antes de abrir\./);
  assert.match(script, /function showFactoryEventError\(action, error\)/);
  assert.match(script, /console\.error\(`\[Metas Estudo\] Erro na ação da Fábrica: \$\{action\}`/);
  assert.match(script, /Seus dados salvos foram preservados/);
});

test('arquivos publicados e scripts ficam sincronizados na nova versão pública', () => {
  assert.equal(script, docsScript);
  assert.equal(html, docsHtml);
  assert.equal(serviceWorker, docsServiceWorker);
  assert.equal(packageJson.version, version);
  for (const source of [html, serviceWorker]) assert.match(source, new RegExp(version));
});

test('fila da Fábrica abre o item clicado no painel principal e alterna Abrir/Fechar', () => {
  assert.match(script, /const selectedEntry = factoryOpenDetailId \? queue\.find\(\(\{ item \}\) => item\.id === factoryOpenDetailId\)/);
  assert.match(script, /const nowEntry = selectedEntry \|\| firstResumoPendingEntry \|\| queue\[0\]/);
  assert.match(script, /factoryOpenDetailId = factoryOpenDetailId === id \? "" : id/);
  assert.match(script, /if \(factoryOpenDetailId\) factoryCurrentFilter = "faca-agora"/);
  assert.match(script, /data-factory-detail="\$\{item\.id\}" \$\{factoryOpenDetailId === item\.id \? "open" : ""\}/);
  assert.match(script, /\$\{isOpen \? "Fechar" : "Abrir"\}/);
  assert.match(script, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
});

test('rótulos e status da fila são derivados dos módulos normalizados', () => {
  assert.match(script, /function factoryThemeVisualLabel\(item = \{\}\)/);
  assert.match(script, /return "ASSUNTO CONCLUÍDO"/);
  assert.match(script, /return "RESUMO\/AULA CONCLUÍDO"/);
  assert.match(script, /return "ASSUNTO EM PRODUÇÃO"/);
  assert.match(script, /return "ASSUNTO PENDENTE"/);
  assert.match(script, /function factoryQueueItemLabel\(item = \{\}, index = 0, firstPendingId = ""\)/);
  assert.match(script, /return "Assunto concluído"/);
  assert.match(script, /return "Resumo\/Aula pronto"/);
  assert.match(script, /return "Fazer agora"/);
  assert.match(script, /const status = factoryOverallStatus\(modules\)/);
  assert.doesNotMatch(script, /index === 0 \? "Fazer agora"/);
});

test('filtros evitam cards interativos duplicados e protegem armazenamento', () => {
  assert.match(script, /elements\.factoryList\.innerHTML = factoryCurrentFilter === "faca-agora" \? nowPanel \+ queuePanel : listPanel/);
  assert.doesNotMatch(script, /elements\.factoryList\.innerHTML = nowPanel \+ queuePanel \+ listPanel/);
  assert.doesNotMatch(script, /localStorage\.clear\(/);
  assert.doesNotMatch(script, /removeItem\([^)]*(factoryAgenda|factoryItems|materials|dailyGoals|smartReviews|syllabusItems|questionBank|simulados)/);
});
