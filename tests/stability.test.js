const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');

const screens = [
  { hash: '#dashboard', view: 'view-dashboard', title: 'Dashboard' },
  { hash: '#central-metas', view: 'view-central-metas', title: 'Central de Metas' },
  { hash: '#metas-do-dia', view: 'view-metas-do-dia', title: 'Plano do Dia' },
  { hash: '#historico-questoes', view: 'view-historico-questoes', title: 'Histórico de Questões' },
  { hash: '#caderno-erros', view: 'view-caderno-erros', title: 'Caderno de Erros' },
  { hash: '#historico', view: 'view-historico', title: 'Histórico Geral' },
  { hash: '#revisoes', view: 'view-revisoes', title: 'Revisões' },
  { hash: '#revisao-inteligente', view: 'view-revisao-inteligente', title: 'Revisão Inteligente' },
  { hash: '#backup', view: 'view-backup', title: 'Backup' },
  { hash: '#fabrica-resumos', view: 'view-fabrica-resumos', title: '🏭 Fábrica de Resumos' }
];

function hasVisibleRouteSupport(hash) {
  const route = hash.slice(1);
  return html.includes(`href="${hash}"`) && html.includes(`data-view-link="${route}"`) && script.includes('data-view-link');
}

test('telas principais possuem rota, seção, título, menu e rodapé com versão', () => {
  assert.match(html, /<nav class="topbar"[^>]*aria-label="Navegação principal"/);
  assert.match(html, /<aside class="side-nav"[^>]*aria-label="Menu de telas"/);
  assert.match(html, /<footer>[\s\S]*class="app-version"[\s\S]*Versão:/);

  for (const screen of screens) {
    assert.ok(hasVisibleRouteSupport(screen.hash), `${screen.hash} deve ter link de navegação`);
    assert.match(html, new RegExp(`<section[^>]+id="${screen.view}"[\\s\\S]*?</section>`), `${screen.view} deve existir`);
    assert.ok(html.includes(`>${screen.title}<`), `${screen.title} deve existir como título principal`);
  }
});

test('arquivos carregados usam a versão da fábrica mínima', () => {
  assert.match(html, /style\.css\?v=20260709-fabrica-minima/);
  assert.match(html, /script\.js\?v=20260709-fabrica-minima/);
  assert.match(html, /Versão: 20260709-fabrica-minima/);
});

test('não há textos obviamente quebrados em coluna por regras CSS perigosas', () => {
  assert.match(css, /\.qb-error-notebook \.stat-card strong[\s\S]*overflow-wrap\s*:\s*anywhere/i);
  assert.match(css, /\.qb-error-notebook \.stat-card strong[\s\S]*word-break\s*:\s*break-word/i);
  assert.doesNotMatch(css, /word-break\s*:\s*break-all/i);
});

test('CSS preserva regras esperadas para dados compactos e tabelas grandes', () => {
  assert.match(css, /white-space\s*:\s*nowrap/i);
  assert.match(css, /overflow-x\s*:\s*auto/i);
});

test('importação de edital preserva prévia, domínio e integração com agendáveis', () => {
  assert.match(html, /id="jsonImportFile"[^>]+type="file"/);
  assert.match(script, /normalizeImportPayload/);
  assert.match(script, /renderImportPreview/);
  assert.match(script, /normalizeImportedDomain\(raw\.dominio \|\| raw\.domain \|\| raw\.diagnostico\)/);
  assert.match(script, /state\.syllabusItems\.push\(\.\.\.itemsToImport\)/);
  assert.match(script, /state\.schedulableSettings\[item\.id\]/);
  assert.match(script, /function renderImportedSyllabusGroups/);
  assert.match(script, /function deleteImportedSyllabusGroup/);
  assert.match(script, /importMeta\?\.concurso/);
  assert.match(script, /importMeta\?\.fonte/);
  assert.match(script, /Fonte:\\s\*/);
  assert.match(script, /delete state\.schedulableSettings\[id\]/);
  assert.match(html, /id="importedSyllabusGroups"/);
  assert.match(script, /Excluir este edital/);
  assert.match(script, /saveData\(\)/);
});

test('tempo de revisão sugerido e realizado é salvo e exibido em Dashboard/Revisões', () => {
  assert.match(html, /id="reviewsDashboard"/);
  assert.match(html, /id="dashboardSmartReviewSuggested"/);
  assert.match(script, /data-smart-review-time="suggested"/);
  assert.match(script, /data-smart-review-time="performed"/);
  assert.match(script, /function upsertSmartReviewTime/);
  assert.match(script, /tempoSugerido/);
  assert.match(script, /tempoRealizado/);
  assert.match(script, /Tempo sugerido hoje/);
  assert.match(script, /Tempo concluído hoje/);
});


test('Banco de Questões possui rota SPA e suporte a justificativas', () => {
  assert.ok(hasVisibleRouteSupport('#banco-questoes'), '#banco-questoes deve ter link de navegação SPA');
  assert.match(html, /id="view-banco-questoes"/);
  assert.match(html, /id="view-caderno-erros"/);
  assert.match(html, />Caderno de Erros</);
  assert.match(html, /id="qbErrorStats"/);
  assert.match(html, /id="qbErrorNotebookList"/);
  assert.ok(script.includes('qbErrorStats: $("#qbErrorStats")'));
  assert.ok(script.includes('qbErrorNotebookList: $("#qbErrorNotebookList")'));
  assert.ok(script.includes('qbStartErrorNotebook: $("#qbStartErrorNotebook")'));
  assert.match(script, /qbStartErrorNotebook\?\.addEventListener\("click", \(\) => qbStartNotebookTraining/);
  assert.match(script, /data-qb-error-status/);
  assert.match(script, /qbSetNotebookStatus\(btn\.dataset\.qbErrorId, btn\.dataset\.qbErrorStatus\)/);
  assert.match(script, /CADERNO_ERROS_STORAGE_KEY/);
  assert.match(script, /"banco-questoes": renderQuestionBank/);
  assert.match(script, /"caderno-erros": qbRenderErrorNotebook/);
  assert.match(script, /function questionBankExplanation/);
  assert.match(script, /raw\.justificativa/);
  assert.match(script, /raw\.fundamento/);
  assert.match(script, /raw\.comentario/);
  assert.match(script, /raw\.explanation/);
  assert.match(script, /raw\.notes/);
  assert.match(script, /Sem justificativa cadastrada/);
  assert.match(script, /Resposta marcada:/);
  assert.match(script, /Resultado:/);
  assert.match(script, /Justificativa\/fundamento:/);
});

test('Banco de Questões recalcula filtros em cascata por disciplina', () => {
  assert.match(script, /function qbCascadeBase/);
  assert.match(script, /function qbRenderCascadingFilters/);
  assert.match(script, /qbCascadeBase\(\{ discipline, subject:"", theme:"", board:"" \}\)\.map\(q=>q\.assunto\)/);
  assert.match(script, /qbCascadeBase\(\{ discipline, subject, theme:"", board:"" \}\)\.map\(q=>q\.tema\)/);
  assert.match(script, /qbCascadeBase\(\{ discipline, subject, theme, board:"" \}\)\.map\(q=>q\.banca\)/);
  assert.match(script, /qbCascadeBase\(\{ discipline, subject, theme, board \}\)\.map\(q=>q\.ano\)/);
  assert.match(script, /Escopo: \$\{qbScopeLabel\(\)\} — \$\{discipline\}: \$\{list\.length\} questões encontradas\./);
  assert.match(html, /id="qbTrainingScope"/);
  assert.match(html, /<label>Escopo<select id="qbTrainingScope">/);
  assert.match(html, /<option value="syllabus">Edital atual<\/option>/);
  assert.match(html, /id="qbReviewTypeWrapper" hidden/);
  assert.match(html, /Tipo de revisão/);
  assert.match(html, /Erradas \+ brancas/);
  assert.match(script, /function qbScopedBank/);
  assert.match(script, /function qbReviewSyllabusItems/);
  assert.match(script, /qbReviewTypeWrapper\.hidden/);
  assert.match(script, /function qbActiveSyllabusItems/);
  assert.match(script, /function qbMissingSyllabusWithoutQuestions/);
  assert.match(script, /function qbSyllabusDisciplineCounts/);
  assert.match(script, /function qbFillSelectWithLabels/);
  assert.match(script, /label:`\$\{d\} \(\$\{counts\[d\] \|\| 0\}\)`/);
  assert.match(script, /function qbSetDependentFiltersDisabled/);
  assert.match(script, /Sem questões disponíveis/);
  assert.match(script, /qbStartTraining\.disabled = !qbCanStartTraining\(\)/);
  assert.match(script, /está no edital, mas ainda não há questões dessa disciplina no banco/);
  assert.match(script, /alert\(qbSelectedZeroDisciplineMessage\(\) \|\| "Nenhuma questão encontrada com os filtros atuais\."\)/);
  assert.match(script, /function renderQbDiagnostics/);
  assert.match(script, /function qbLimitedList/);
  assert.match(script, /Ver mais \$\{hidden\} item\(ns\)/);
  assert.match(html, /id="qbDiagnostics"/);
  assert.match(html, /Diagnóstico do edital no banco/);
  assert.match(html, /id="qbSyllabusVerticalized"/);
  assert.match(script, /function renderQbSyllabusVerticalized/);
  assert.match(script, /Questões vinculadas:/);
  assert.match(script, /Assuntos cobertos:/);
  assert.match(script, /renderQbSyllabusVerticalized\(\)/);
  assert.match(script, /qbPreviewSection\.hidden = false/);
  assert.match(script, /qbPreviewSection\) elements\.qbPreviewSection\.hidden = true/);
  assert.match(html, /<section id="qbPreviewSection" class="qb-section" aria-labelledby="qb-preview-title" hidden>/);
  assert.match(script, /Disciplinas do edital com questões/);
  assert.match(script, /Disciplinas do edital sem questões/);
  assert.match(script, /Assuntos do edital sem questões/);
  assert.match(css, /\.qb-diagnostics-grid/);
  assert.match(css, /overflow-wrap: break-word/);
  assert.match(css, /max-height: 320px/);
  assert.match(script, /\["Questões filtradas", filteredTotal\]/);
});


test('Banco de Questões possui Pacotes do Edital vinculados ao edital verticalizado', () => {
  assert.match(html, /id="qbSyllabusPackages"/);
  assert.match(html, /Pacotes do Edital/);
  assert.match(html, /dashboardQuestionBankPackages/);
  assert.match(html, /dashboardQuestionBankLinked/);
  assert.match(html, /dashboardQuestionBankMissing/);
  assert.match(script, /function qbSyllabusPackages/);
  assert.match(script, /function qbMatchesSyllabusItem/);
  assert.match(script, /function qbSafePartialMatch/);
  assert.match(script, /data-qb-package-mode="full"/);
  assert.match(script, /Treinar não estudados/);
  assert.match(script, /Treinar erradas\/brancas/);
  assert.match(script, /Assuntos do edital sem questões cadastradas/);
});


test('rotas Backup e Caderno de Erros não compartilham destinos', () => {
  const backupLinks = [...html.matchAll(/<a\b[^>]*>[^<]*Backup[^<]*<\/a>/g)].map((match) => match[0]);
  assert.ok(backupLinks.length >= 3, 'deve existir Backup no menu lateral, mobile e barra inferior');
  for (const link of backupLinks) {
    assert.match(link, /href="#backup"/);
    assert.match(link, /data-view-link="backup"/);
    assert.doesNotMatch(link, /caderno-erros/);
  }

  const cadernoLinks = [...html.matchAll(/<a\b[^>]*>[^<]*Caderno de Erros[^<]*<\/a>/g)].map((match) => match[0]);
  assert.ok(cadernoLinks.length >= 3, 'deve existir Caderno de Erros nos links visíveis');
  for (const link of cadernoLinks) {
    assert.match(link, /href="#caderno-erros"/);
    assert.match(link, /data-view-link="caderno-erros"/);
    assert.doesNotMatch(link, /#backup|data-view-link="backup"/);
  }

  assert.match(script, /function targetFromLink/);
  assert.match(script, /link\.dataset\?\.viewLink \|\| link\.getAttribute\?\.\("href"\)/);
  assert.match(script, /function resolveViewTarget/);
  assert.match(script, /panel\.classList\.remove\("active"\)/);
  assert.match(script, /panel\.hidden = true/);
  assert.match(script, /document\.getElementById\(`view-\$\{target\}`\)/);
  assert.match(script, /console\.log\("\[ROUTE\]", \{ clicked: link\.textContent\.trim\(\), target \}\)/);
  assert.match(script, /backup: \(\) => \{ renderBackupSummary\(\); renderSyncStatus\(\); \}/);
  assert.match(script, /"caderno-erros": qbRenderErrorNotebook/);
});

test('Backup permite zerar somente questões resolvidas preservando dados principais', () => {
  assert.match(html, /id="resetSolvedQuestions"[^>]*>Zerar questões resolvidas<\/button>/);
  assert.match(html, /class="backup-reset-actions actions"/);
  assert.match(css, /\.backup-reset-actions \{[^}]*border-top: 1px solid var\(--border\)/);
  assert.match(script, /resetSolvedQuestions: \$\("#resetSolvedQuestions"\)/);
  assert.match(script, /function resetSolvedQuestionsFromBackup\(\)/);
  assert.match(script, /state\.questionLogs = \[\]/);
  assert.match(script, /state\.questionBankSessions = \[\]/);
  assert.match(script, /state\.questionErrorNotebook = \[\]/);
  assert.match(script, /localStorage\.removeItem\(CADERNO_ERROS_STORAGE_KEY\)/);
  assert.match(script, /item\.questionsTotal = 0/);
  assert.match(script, /item\.questionsCorrect = 0/);
  assert.match(script, /item\.questionsWrong = 0/);
  assert.match(script, /item\.questionsBlank = 0/);
  assert.match(script, /item\.accuracyRate = 0/);
  assert.match(script, /item\.cebraspeNet = 0/);
  assert.match(script, /item\.lastTrainingDate = ""/);
  assert.match(script, /Questões resolvidas zeradas com sucesso\./);
});

test('service worker prioriza rede para app shell versionado', () => {
  const sw = fs.readFileSync('service-worker.js', 'utf8');
  assert.match(sw, /metas-estudo-20260709-fabrica-minima/);
  assert.match(sw, /shouldPreferNetwork/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /\["document", "script", "style", "worker"\]/);
  assert.match(sw, /self\.skipWaiting\(\)/);
  assert.match(sw, /self\.clients\.claim\(\)/);
});

test('Fábrica mínima fica habilitada e não bloqueia telas principais', () => {
  assert.match(script, /const ENABLE_FACTORY = true;/);
  assert.match(script, /factoryAgenda: \[\]/);
  assert.match(script, /state\.factoryAgenda \|\|= \[\]/);
  assert.match(script, /safeRenderView\("fabrica-resumos", renderFactory\)/);
  assert.match(script, /Erro ao carregar Fábrica de Resumos/);
  assert.match(script, /autoSyncAfterSave\("factory-update"\)/);
});


test('exclusão de disciplina trata disciplinas automáticas órfãs sem apagar históricos', () => {
  const deletionBlock = script.slice(script.indexOf('function deleteOrphanSubjectDiscipline'), script.indexOf('function deleteImportedSyllabusGroup'));
  assert.match(script, /function deleteOrphanSubjectDiscipline\(disciplineName\)/);
  assert.match(script, /const matchingSubjects = \(state\.subjects \|\| \[\]\)\.filter\(\(subject\) => canonical\(subject\.name\) === normalizedDiscipline\)/);
  assert.match(script, /const studiedSubjectIds = new Set\(\(state\.studies \|\| \[\]\)\.map\(\(study\) => study\.subjectId\)\.filter\(Boolean\)\)/);
  assert.match(script, /subject\.importedFromSyllabus === true && !studiedSubjectIds\.has\(subject\.id\)/);
  assert.match(script, /Disciplina automática órfã excluída com sucesso\./);
  assert.match(script, /Esta disciplina é manual\. Para preservar seus dados, ela não foi removida automaticamente\./);
  assert.match(script, /Esta disciplina possui estudos registrados\. Para preservar o histórico, ela não foi removida\./);
  assert.ok(script.includes('if (!removedItems.length) {\n    return deleteOrphanSubjectDiscipline(disciplineName);\n  }'));
  assert.match(script, /removedItems\.forEach\(\(item\) => delete state\.schedulableSettings\[item\.id\]\)/);
  assert.match(script, /cleanupOrphanImportedSubjects\(removedDisciplineNames\)/);
  assert.doesNotMatch(deletionBlock, /state\.studies\s*=\s*\[\]/);
  assert.doesNotMatch(deletionBlock, /state\.questionLogs\s*=\s*\[\]/);
  assert.doesNotMatch(deletionBlock, /state\.questionBank\s*=\s*\[\]/);
  assert.doesNotMatch(deletionBlock, /state\.questionBankSessions\s*=\s*\[\]/);
  assert.doesNotMatch(deletionBlock, /state\.questionErrorNotebook\s*=\s*\[\]/);
  assert.doesNotMatch(deletionBlock, /state\.simulados\s*=\s*\[\]/);
  assert.doesNotMatch(deletionBlock, /state\.materials\s*=\s*\[\]/);
  assert.doesNotMatch(deletionBlock, /state\.dailyGoals\s*=\s*\[\]/);
  assert.doesNotMatch(deletionBlock, /state\.planning\s*=\s*\{\}/);
});


test('interface publicada expõe sincronização Google Drive', () => {
  assert.match(html, /https:\/\/accounts\.google\.com\/gsi\/client/);
  assert.match(html, /☁️ SINCRONIZAÇÃO/);
  assert.match(html, /Conectar Google Drive/);
  assert.match(html, /Sincronizar agora/);
  assert.match(html, /Enviar este dispositivo para a nuvem/);
  assert.match(html, /Baixar dados da nuvem/);
  assert.match(html, /Desconectar/);
  assert.match(html, /metas-estudo-sync\.json/);
  assert.match(script, /const GOOGLE_SYNC_FILE_NAME = "metas-estudo-sync\.json"/);
  assert.match(script, /const GOOGLE_CLIENT_ID = "888613157566-p6ad2hmuav7uc7tqabs846rnnmh6g7mf.apps.googleusercontent.com"/);
  assert.match(script, /Google Client ID não configurado\. Configure o client_id no script\.js para ativar a sincronização\./);
  assert.match(script, /google\.accounts\.oauth2\.initTokenClient/);
  assert.match(script, /let googleDriveAccessToken = ""/);
  assert.match(script, /function hasValidGoogleDriveAccessToken/);
  assert.match(script, /requestAccessToken\(prompt \? \{ prompt \} : \{\}\)/);
  assert.match(script, /getAccessToken\(\{ prompt: hasValidGoogleDriveAccessToken\(\) \? "" : "consent" \}\)/);
  assert.match(script, /Autorização expirada\. Conecte novamente ao Google Drive\./);
  assert.match(script, /const GOOGLE_DRIVE_SCOPE = "https:\/\/www\.googleapis\.com\/auth\/drive\.appdata"/);
});

test('auto-sync do cronômetro mantém pendência quando autorização Google expira', () => {
  assert.match(script, /function googleAuthorizationStatusMessage/);
  assert.match(script, /conectado à conta Google/);
  assert.match(script, /Autorização para envio/);
  assert.match(script, /token válido para envio/);
  assert.match(script, /Conectado, mas autorização expirada\. Clique em Conectar Google Drive para renovar\./);
  assert.match(script, /reason === "timer-save" \? "Tempo salvo localmente\. Autorização Google expirada\."/);
  assert.match(script, /if \(!meta\.connected \|\| !hasValidGoogleDriveAccessToken\(\)\) \{[\s\S]*markPendingSync\(reason, message\)/);
  assert.match(script, /const isExpiredToken = \/Autorização expirada\|TOKEN_EXPIRED\|401\|token\|Unauthorized\|invalid_token\/i\.test\(rawErrorMessage\)/);
  assert.match(script, /if \(isExpiredToken\) markPendingSync\(reason, message\)/);
  assert.match(script, /writeSyncMeta\(\{ pendingSync: true, pendingSyncReason: reason/);
  assert.match(script, /Existem alterações pendentes\. Deseja enviar agora\?/);
  assert.match(script, /Alterações pendentes enviadas para a nuvem\./);
  assert.match(script, /pendingSync: false, pendingSyncReason: "", lastAutoSyncAt: new Date\(\)\.toISOString\(\), lastAutoSyncReason: meta\.pendingSyncReason/);
});

test('Fábrica integra automaticamente o edital ativo sem duplicidades e preservando dados', () => {
  assert.match(script, /function factoryActiveEditalGroups/);
  assert.match(script, /factoryEditalGroupKey\(discipline, subject\)/);
  assert.match(script, /byKey\.set\(item\.editalLink\.groupKey, item\)/);
  assert.match(script, /const existing = byKey\.get\(group\.key\)/);
  assert.match(script, /agenda\.push\(normalizeFactoryItem/);
  assert.match(script, /editalSubtemas: group\.subtopics/);
  assert.match(script, /Subtemas do edital:/);
  assert.match(script, /editalActive = false/);
  assert.match(script, /Fora do edital ativo/);
  assert.match(script, /A PRODUZIR/);
  assert.match(script, /EM PRODUÇÃO/);
  assert.match(script, /CONCLUÍDOS/);
  assert.match(script, /data-factory-reopen/);
  assert.match(script, /function reopenFactoryTheme/);
  assert.doesNotMatch(script.slice(script.indexOf('function syncFactoryWithActiveEdital'), script.indexOf('function reopenFactoryTheme')), /deleteFactoryItem|filter\(\(item\) => item\.id !==/);
});

test('Fábrica conclui tema com módulos aplicáveis e inclui backup/sincronização', () => {
  assert.match(script, /"Não se aplica"/);
  assert.match(script, /function factoryApplicableCompletionStatus/);
  assert.match(script, /\["Aprovado", "PDF gerado", "Não se aplica"\]/);
  assert.match(script, /function factoryThemeIsCompleted/);
  assert.match(script, /state: cloneData\(state\)/);
  assert.match(script, /data: cloneData\(state\)/);
  assert.match(script, /mergeArrays\(state\.factoryAgenda, data\.factoryAgenda \|\| data\.factoryItems/);
  assert.match(script, /state\.factoryItems = state\.factoryAgenda/);
  assert.match(script, /factoryPromptLibrary/);
  assert.match(script, /factoryAgenda/);
});
