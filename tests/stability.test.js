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
  { hash: '#historico', view: 'view-historico', title: 'Histórico Geral' },
  { hash: '#revisoes', view: 'view-revisoes', title: 'Revisões' },
  { hash: '#backup', view: 'view-backup', title: 'Backup' }
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

test('arquivos carregados usam a versão do banco de questões', () => {
  assert.match(html, /style\.css\?v=20260630-question-bank/);
  assert.match(html, /script\.js\?v=20260630-question-bank/);
  assert.match(html, /Versão: 20260630-question-bank/);
});

test('não há textos obviamente quebrados em coluna por regras CSS perigosas', () => {
  assert.doesNotMatch(css, /overflow-wrap\s*:\s*anywhere/i);
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
  assert.match(script, /"banco-questoes": renderQuestionBank/);
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

test('service worker prioriza rede para app shell versionado', () => {
  const sw = fs.readFileSync('service-worker.js', 'utf8');
  assert.match(sw, /metas-estudo-cache-20260630-question-bank/);
  assert.match(sw, /shouldPreferNetwork/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /\["document", "script", "style", "worker"\]/);
  assert.match(sw, /self\.skipWaiting\(\)/);
  assert.match(sw, /self\.clients\.claim\(\)/);
});
