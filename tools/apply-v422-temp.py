from pathlib import Path
import json
import re
import shutil

ROOT = Path('.')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


def write_lf(path, text):
    if '\r' in text:
        raise SystemExit(f'{path}: CR detectado antes da gravação')
    Path(path).write_text(text, encoding='utf-8', newline='\n')


# ---------------------------------------------------------------------------
# factory-summary-toc-v381.js -> V422, preservando integralmente o bege.
# ---------------------------------------------------------------------------
summary_path = ROOT / 'factory-summary-toc-v381.js'
summary = summary_path.read_text(encoding='utf-8')
beige_before = re.search(r'  const BEIGE_SECTION = `.*?`;\n', summary, flags=re.S)
if not beige_before:
    raise SystemExit('BEIGE_SECTION não encontrada na baseline')
beige_before = beige_before.group(0)

summary = replace_once(
    summary,
    'const VERSION = "20260826-factory-summary-toc-v400";',
    'const VERSION = "20260901-factory-summary-toc-v422";',
    'VERSION summary'
)
summary = replace_once(
    summary,
    'const MIGRATION_ID = "factorySummaryTocV382";',
    'const MIGRATION_ID = "factorySummaryTocV422";',
    'MIGRATION_ID summary'
)
summary = replace_once(
    summary,
    '''  const TARGET_TYPES = Object.freeze([\n    "resumoAula",\n    "jurisprudencia",\n    "peca",\n    "resumoAulaJurisprudencia"\n  ]);''',
    '''  const TARGET_TYPES = Object.freeze([\n    "resumoAula",\n    "lei",\n    "jurisprudencia",\n    "peca",\n    "resumoAulaJurisprudencia",\n    "leiJurisprudencia"\n  ]);''',
    'TARGET_TYPES'
)
summary = replace_once(
    summary,
    '''  const LEGACY_MARKER = "## SUMÁRIO OBRIGATÓRIO DO DOCUMENTO — V381";\n  const SUMMARY_MARKER = "## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V382";''',
    '''  const LEGACY_MARKER = "## SUMÁRIO OBRIGATÓRIO DO DOCUMENTO — V381";\n  const SUMMARY_MARKER_V382 = "## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V382";\n  const SUMMARY_MARKER = "## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422";''',
    'marcadores summary'
)
summary = replace_once(
    summary,
    '  const JURISPRUDENCE_YEAR_MARKER = "## ANO DA DECISÃO — REGRA OBRIGATÓRIA DA JURISPRUDÊNCIA";\n',
    '  const JURISPRUDENCE_YEAR_MARKER = "## ANO DA DECISÃO — REGRA OBRIGATÓRIA DA JURISPRUDÊNCIA";\n  const JURISPRUDENCE_CITATION_MARKER = "## CITAÇÃO JURISPRUDENCIAL — FORMATO OBRIGATÓRIO";\n  const JURISPRUDENCE_CITATION_MIGRATION_ID = "factoryJurisprudenceCitationV422";\n',
    'marcador citação'
)

summary = replace_once(
    summary,
    '* habilite hiperlinks internos quando tecnicamente suportado;',
    '* habilite hiperlinks internos obrigatórios em todas as entradas do sumário;',
    'hiperlink automático summary'
)
summary = replace_once(
    summary,
    '* use hiperlinks internos quando puder criá-los corretamente;',
    '* crie hiperlinks internos obrigatórios em todas as entradas do sumário, apontando para indicadores/âncoras dos cabeçalhos correspondentes;',
    'hiperlink fallback summary'
)

hyperlink_block = '''### HIPERLINKS OBRIGATÓRIOS

TODA ENTRADA DO SUMÁRIO — TÍTULOS DE NÍVEL 1, SUBTÓPICOS DE NÍVEL 2 E, QUANDO EXISTIREM, ITENS DE NÍVEL 3 — DEVE SER UM HIPERLINK INTERNO QUE LEVE AO CABEÇALHO CORRESPONDENTE NO CORPO DO DOCUMENTO.

* O HIPERLINK COBRE O TEXTO VISÍVEL DA ENTRADA, INCLUINDO EMOJI, MARCADOR E NUMERAÇÃO;
* NÃO DEIXE ENTRADAS SEM VÍNCULO NAVEGÁVEL;
* MANTENHA A APARÊNCIA DEFINIDA NESTE PROMPT: TEXTO PRETO #000000, NEGRITO FUNCIONAL E SEM SUBLINHADO AZUL PADRÃO DO WORD;
* NO SUMÁRIO AUTOMÁTICO, HABILITE OS HIPERLINKS DO CAMPO TOC;
* NO FALLBACK MANUAL, CRIE INDICADORES/ÂNCORAS NOS CABEÇALHOS DO CORPO E APONTE CADA ENTRADA PARA O SEU INDICADOR;
* SOMENTE SE A FERRAMENTA COMPROVADAMENTE NÃO SUPORTAR HIPERLINK INTERNO, REGISTRE ESSA LIMITAÇÃO DE FORMA EXPLÍCITA NA ENTREGA E PRESERVE OS ESTILOS ESTRUTURAIS DOS TÍTULOS PARA QUE O PAINEL DE NAVEGAÇÃO DO WORD CONTINUE FUNCIONANDO.

'''
summary = replace_once(
    summary,
    '### IDENTIDADE VISUAL\n',
    hyperlink_block + '### IDENTIDADE VISUAL\n',
    'bloco hiperlinks obrigatórios'
)

old_year_section = '''  const JURISPRUDENCE_YEAR_SECTION = `

${JURISPRUDENCE_YEAR_MARKER}

EM TODO CONTEÚDO JURISPRUDENCIAL GERADO, REVISADO OU CONSOLIDADO, O ANO DA DECISÃO DEVE SER APRESENTADO PARA CADA JULGADO, PRECEDENTE OU DECISÃO CITADA.

USE O CAMPO:
📍 **ANO DA DECISÃO: [AAAA]**

SE A FONTE NÃO INFORMAR O ANO DA DECISÃO, NÃO OMITA O CAMPO E NÃO INVENTE. REGISTRE:
📍 **ANO DA DECISÃO: NÃO IDENTIFICADO NA FONTE**

ESTA REGRA VALE TANTO PARA OS BLOCOS JURISPRUDENCIAIS CONTEXTUALIZADOS QUANTO PARA QUADROS FINAIS, JURISPRUDÊNCIA COMPLEMENTAR E CONSOLIDAÇÃO FINAL.

NÃO ALTERE NENHUMA OUTRA REGRA DO PROMPT.
`;'''

citation_section = '''  const JURISPRUDENCE_CITATION_SECTION = `

${JURISPRUDENCE_CITATION_MARKER}

EM TODO CONTEÚDO JURISPRUDENCIAL GERADO, REVISADO OU CONSOLIDADO, A FONTE DE CADA JULGADO, PRECEDENTE, SÚMULA OU TESE DEVE APARECER NA PRÓPRIA LINHA DO ENTENDIMENTO, LOGO APÓS O TEXTO DA TESE, ENTRE PARÊNTESES E EM ITÁLICO.

FORMATO OBRIGATÓRIO:

⚖️ **JURISPRUDÊNCIA — TESE:** [texto do entendimento]. *([TRIBUNAL], [CLASSE E NÚMERO DO PROCESSO], [INFORMATIVO, QUANDO HOUVER], [ANO])*.

EXEMPLOS DE REFERÊNCIA:

⚖️ **JURISPRUDÊNCIA — TESE:** É ilícita a prova decorrente da revelação, pelo médico, de informação obtida em razão do sigilo profissional sobre aborto provocado pela paciente; também são ilícitas as provas dela derivadas, salvo fonte independente. *(STJ, HC 1.000.918/SP, 2026)*.

⚖️ **JURISPRUDÊNCIA — TESE:** O descumprimento da cadeia de custódia não gera nulidade automática; sua repercussão recai sobre a eficácia probatória e depende de avaliação concreta. *(STJ, Corte Especial, Inq 1.674/DF, Informativo 891. 2026)*.

REGRAS DE APLICAÇÃO:
* O ITÁLICO COMEÇA NO PARÊNTESE DE ABERTURA E TERMINA NO PARÊNTESE DE FECHAMENTO;
* O PONTO FINAL DA FRASE FICA FORA DO ITÁLICO, DEPOIS DO PARÊNTESE DE FECHAMENTO;
* O TEXTO DA TESE PERMANECE EM FONTE NORMAL, SEM ITÁLICO;
* O RÓTULO FUNCIONAL EM NEGRITO CONSERVA O SOMBREAMENTO BEGE JÁ DEFINIDO NESTE PROMPT;
* REGISTRE DENTRO DO PARÊNTESE SOMENTE O QUE CONSTAR DA FONTE: TRIBUNAL, ÓRGÃO JULGADOR, CLASSE E NÚMERO, INFORMATIVO E ANO;
* NÃO INVENTE TRIBUNAL, NÚMERO DE PROCESSO, INFORMATIVO OU ANO;
* SE A FONTE NÃO INFORMAR O ANO, REGISTRE A AUSÊNCIA DENTRO DO MESMO PARÊNTESE, SEM CRIAR CAMPO SEPARADO.

ESTA REGRA VALE PARA OS MESMOS RÓTULOS JURISPRUDENCIAIS UTILIZADOS PELO MÓDULO — TESE, REGRA, EXCEÇÃO, DISTINÇÃO E EVOLUÇÃO — E TAMBÉM PARA BLOCOS CONTEXTUALIZADOS, QUADROS FINAIS, JURISPRUDÊNCIA COMPLEMENTAR E CONSOLIDAÇÃO FINAL.

NÃO CRIE CAMPO SEPARADO DE ANO DA DECISÃO. O ANO INTEGRA A CITAÇÃO ENTRE PARÊNTESES.

NÃO ALTERE NENHUMA OUTRA REGRA DO PROMPT.
`;'''
summary = replace_once(summary, old_year_section, citation_section, 'seção de citação')

summary = replace_once(
    summary,
    '''  function stripLegacySummary(prompt) {\n    const text = String(prompt || "").trim();\n    if (!text) return text;\n    const legacyIndex = text.indexOf(LEGACY_MARKER);\n    if (legacyIndex < 0) return text;\n    return text.slice(0, legacyIndex).trim();\n  }''',
    '''  function stripLegacySummary(prompt) {\n    const text = String(prompt || "").trim();\n    if (!text) return text;\n    const legacyIndexes = [LEGACY_MARKER, SUMMARY_MARKER_V382]\n      .map((marker) => text.indexOf(marker))\n      .filter((index) => index >= 0);\n    if (!legacyIndexes.length) return text;\n    return text.slice(0, Math.min(...legacyIndexes)).trim();\n  }''',
    'stripLegacySummary V422'
)

summary = replace_once(
    summary,
    '''  function withJurisprudenceYear(prompt) {\n    const raw = String(prompt || "").trim();\n    if (!raw) return raw;\n    if (raw.includes(JURISPRUDENCE_YEAR_MARKER)) return raw;\n    return `${raw}${JURISPRUDENCE_YEAR_SECTION}`.trim();\n  }''',
    '''  function stripJurisprudenceYear(prompt) {\n    const text = String(prompt || "").trim();\n    if (!text) return text;\n    const markerIndex = text.indexOf(JURISPRUDENCE_YEAR_MARKER);\n    if (markerIndex < 0) return text;\n    return text.slice(0, markerIndex).trim();\n  }\n\n  function withJurisprudenceCitation(prompt) {\n    const raw = String(prompt || "").trim();\n    if (!raw) return raw;\n    const base = stripJurisprudenceYear(raw);\n    if (base.includes(JURISPRUDENCE_CITATION_MARKER)) return base;\n    return `${base}${JURISPRUDENCE_CITATION_SECTION}`.trim();\n  }''',
    'withJurisprudenceCitation'
)

summary = summary.replace('withJurisprudenceYear(current)', 'withJurisprudenceCitation(current)')
summary = summary.replace('withJurisprudenceYear(summarized)', 'withJurisprudenceCitation(summarized)')
if 'withJurisprudenceYear' in summary:
    raise SystemExit('referência residual a withJurisprudenceYear')

summary = replace_once(
    summary,
    '''      if (state && typeof state === "object") {\n        state.factoryPromptLibrary ||= {};\n        JURISPRUDENCE_YEAR_TARGET_TYPES.forEach((type) => {\n          const current = String(state.factoryPromptLibrary[type] || "").trim();\n          if (!current) return;\n          const next = withJurisprudenceCitation(current);\n          if (next !== current) {\n            changed += 1;\n            stateChanged = true;\n            state.factoryPromptLibrary[type] = next;\n          }\n        });\n        if (stateChanged && typeof saveData === "function") saveData();\n      }''',
    '''      if (state && typeof state === "object") {\n        state.factoryPromptLibrary ||= {};\n        state.migrations ||= {};\n        JURISPRUDENCE_YEAR_TARGET_TYPES.forEach((type) => {\n          const current = String(state.factoryPromptLibrary[type] || "").trim();\n          if (!current) return;\n          const next = withJurisprudenceCitation(current);\n          if (next !== current) {\n            changed += 1;\n            stateChanged = true;\n            state.factoryPromptLibrary[type] = next;\n          }\n        });\n        if (!state.migrations[JURISPRUDENCE_CITATION_MIGRATION_ID]) {\n          state.migrations[JURISPRUDENCE_CITATION_MIGRATION_ID] = new Date().toISOString();\n          stateChanged = true;\n        }\n        if (stateChanged && typeof saveData === "function") saveData();\n      }''',
    'migration id citação'
)

summary = replace_once(
    summary,
    '''    const changed = patchPromptLibraries();\n    patchJurisprudenceYearScope();\n    const beigeChanged = patchBeigeShadingScope();''',
    '''    const changed = patchPromptLibraries();\n    const citationChanged = patchJurisprudenceYearScope();\n    const beigeChanged = patchBeigeShadingScope();''',
    'install citationChanged'
)
summary = replace_once(
    summary,
    'if (!wrapped) return { installed: false, changed, beigeChanged, wrapped };',
    'if (!wrapped) return { installed: false, changed, citationChanged, beigeChanged, wrapped };',
    'install return falha'
)
summary = replace_once(
    summary,
    'return { installed: true, changed, beigeChanged, wrapped };',
    'return { installed: true, changed, citationChanged, beigeChanged, wrapped };',
    'install return sucesso'
)
summary = replace_once(
    summary,
    '''    summaryMarker: SUMMARY_MARKER,\n    beigeMarker: BEIGE_MARKER,\n    stripLegacySummary,\n    withSummary,\n    stripBeigeShading,\n    withBeigeShading,\n    install''',
    '''    summaryMarker: SUMMARY_MARKER,\n    legacySummaryMarkerV382: SUMMARY_MARKER_V382,\n    beigeMarker: BEIGE_MARKER,\n    jurisprudenceCitationMarker: JURISPRUDENCE_CITATION_MARKER,\n    jurisprudenceCitationMigrationId: JURISPRUDENCE_CITATION_MIGRATION_ID,\n    stripLegacySummary,\n    withSummary,\n    stripJurisprudenceYear,\n    withJurisprudenceCitation,\n    patchJurisprudenceYearScope,\n    stripBeigeShading,\n    withBeigeShading,\n    install''',
    'exports V422'
)

beige_after = re.search(r'  const BEIGE_SECTION = `.*?`;\n', summary, flags=re.S)
if not beige_after or beige_after.group(0) != beige_before:
    raise SystemExit('BEIGE_SECTION foi alterada — tarefa abortada')
if '📍 **ANO DA DECISÃO:' in summary:
    raise SystemExit('campo legado de ano permaneceu no runtime')
if '## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422' not in summary:
    raise SystemExit('marcador V422 ausente')
write_lf(summary_path, summary)
shutil.copyfile(summary_path, ROOT / 'docs' / summary_path.name)


# ---------------------------------------------------------------------------
# Padronização Final + Sumário: hiperlinks obrigatórios e migração pontual.
# ---------------------------------------------------------------------------
pad_path = ROOT / 'factory-padronizacao-final-sumario-v385.js'
pad = pad_path.read_text(encoding='utf-8')
pad = replace_once(pad, 'const VERSION = "20260824-factory-padronizacao-final-sumario-v385";', 'const VERSION = "20260901-factory-padronizacao-final-sumario-v422";', 'VERSION padronização')
pad = replace_once(pad, 'const MIGRATION_ID = "factoryPadronizacaoFinalSumarioV385";', 'const MIGRATION_ID = "factoryPadronizacaoFinalSumarioV422";', 'MIGRATION_ID padronização')
pad = replace_once(
    pad,
    '- criar navegação interna e hiperlinks quando tecnicamente suportados;',
    '- criar navegação interna e hiperlinks obrigatórios em todas as entradas do sumário;\n- somente se a ferramenta comprovadamente não suportar hiperlink interno, registrar essa limitação de forma explícita na entrega e preservar os estilos estruturais dos títulos para manter o Painel de Navegação do Word;',
    'hiperlinks regra geral padronização'
)
pad = replace_once(
    pad,
    '- hiperlinks internos;',
    '- hiperlinks internos obrigatórios em todas as entradas do sumário;',
    'hiperlinks estilos estruturais padronização'
)
pad = replace_once(
    pad,
    '- habilite hiperlinks internos quando suportados;',
    '- habilite hiperlinks internos obrigatórios em todas as entradas do sumário;',
    'hiperlinks TOC padronização'
)
pad = replace_once(
    pad,
    '- use hiperlinks internos quando suportados;',
    '- crie hiperlinks internos obrigatórios em todas as entradas do sumário, apontando para o cabeçalho correspondente;\n- somente se a ferramenta comprovadamente não suportar hiperlink interno, registre essa limitação de forma explícita na entrega e preserve os estilos estruturais dos títulos;',
    'hiperlinks fallback padronização'
)

migrate_helper = '''  function migratePromptV422(prompt) {
    const raw = String(prompt || "").trim();
    if (!raw) return BASE_PROMPT;
    return raw
      .replace(
        "- criar navegação interna e hiperlinks quando tecnicamente suportados;",
        "- criar navegação interna e hiperlinks obrigatórios em todas as entradas do sumário;\\n- somente se a ferramenta comprovadamente não suportar hiperlink interno, registrar essa limitação de forma explícita na entrega e preservar os estilos estruturais dos títulos para manter o Painel de Navegação do Word;"
      )
      .replace(
        "- hiperlinks internos;",
        "- hiperlinks internos obrigatórios em todas as entradas do sumário;"
      )
      .replace(
        "- habilite hiperlinks internos quando suportados;",
        "- habilite hiperlinks internos obrigatórios em todas as entradas do sumário;"
      )
      .replace(
        "- use hiperlinks internos quando suportados;",
        "- crie hiperlinks internos obrigatórios em todas as entradas do sumário, apontando para o cabeçalho correspondente;\\n- somente se a ferramenta comprovadamente não suportar hiperlink interno, registre essa limitação de forma explícita na entrega e preserve os estilos estruturais dos títulos;"
      );
  }

'''
pad = replace_once(pad, '  function ensurePromptType() {\n', migrate_helper + '  function ensurePromptType() {\n', 'helper migração padronização')
pad = replace_once(
    pad,
    '''      const alreadyMigrated = Boolean(state.migrations[MIGRATION_ID]);\n      const hasPrompt = Boolean(String(state.factoryPromptLibrary[TYPE_KEY] || "").trim());\n      const changed = !alreadyMigrated || !hasPrompt;\n      if (!hasPrompt) state.factoryPromptLibrary[TYPE_KEY] = BASE_PROMPT;\n      if (!alreadyMigrated) state.migrations[MIGRATION_ID] = new Date().toISOString();\n      return { installed: true, changed };''',
    '''      const alreadyMigrated = Boolean(state.migrations[MIGRATION_ID]);\n      const current = String(state.factoryPromptLibrary[TYPE_KEY] || "").trim();\n      const hasPrompt = Boolean(current);\n      const next = !hasPrompt ? BASE_PROMPT : (!alreadyMigrated ? migratePromptV422(current) : current);\n      const changed = !alreadyMigrated || next !== current;\n      if (next !== current) state.factoryPromptLibrary[TYPE_KEY] = next;\n      if (!alreadyMigrated) state.migrations[MIGRATION_ID] = new Date().toISOString();\n      if (changed && typeof saveData === "function") saveData();\n      return { installed: true, changed };''',
    'persistência migração padronização'
)
pad = replace_once(
    pad,
    '''    prompt: BASE_PROMPT,\n    relabelGeneralSource,\n    install''',
    '''    prompt: BASE_PROMPT,\n    migratePromptV422,\n    relabelGeneralSource,\n    install''',
    'export migração padronização'
)
write_lf(pad_path, pad)
shutil.copyfile(pad_path, ROOT / 'docs' / pad_path.name)


# ---------------------------------------------------------------------------
# Cache bust dos módulos dinâmicos e do observability que os injeta.
# ---------------------------------------------------------------------------
sec_path = ROOT / 'security-observability-v318.js'
sec = sec_path.read_text(encoding='utf-8')
sec = replace_once(sec, 'factory-summary-toc-v381.js?v=20260824-factory-summary-toc-v382', 'factory-summary-toc-v381.js?v=20260901-factory-summary-toc-v422', 'cache bust summary')
sec = replace_once(sec, 'factory-padronizacao-final-sumario-v385.js?v=20260824-factory-padronizacao-final-sumario-v385', 'factory-padronizacao-final-sumario-v385.js?v=20260901-factory-padronizacao-final-sumario-v422', 'cache bust padronização')
write_lf(sec_path, sec)
shutil.copyfile(sec_path, ROOT / 'docs' / sec_path.name)

index_docs = ROOT / 'docs' / 'index.html'
idx = index_docs.read_text(encoding='utf-8')
idx = replace_once(idx, 'security-observability-v318.js?v=20260812-security-observability-v318', 'security-observability-v318.js?v=20260901-factory-prompts-v422', 'cache bust observability no index')
write_lf(index_docs, idx)
shutil.copyfile(index_docs, ROOT / 'index.html')


# ---------------------------------------------------------------------------
# Atualização dos 8 contratos obsoletos + novos contratos V422.
# ---------------------------------------------------------------------------
v381 = r'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtimePath = 'factory-summary-toc-v381.js';
const docsPath = 'docs/factory-summary-toc-v381.js';
const loaderPath = 'security-observability-v318.js';
const docsLoaderPath = 'docs/security-observability-v318.js';

const runtime = fs.readFileSync(runtimePath, 'utf8');
const docsRuntime = fs.readFileSync(docsPath, 'utf8');
const loader = fs.readFileSync(loaderPath, 'utf8');
const docsLoader = fs.readFileSync(docsLoaderPath, 'utf8');
const api = require(`../${runtimePath}`);

test('V422 cobre os seis prompts de conteúdo solicitados', () => {
  assert.deepEqual([...api.targetTypes], [
    'resumoAula',
    'lei',
    'jurisprudencia',
    'peca',
    'resumoAulaJurisprudencia',
    'leiJurisprudencia'
  ]);
  assert.equal(api.summaryMarker, '## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422');
});

test('sumário V422 é obrigatório, navegável e não inventa paginação', () => {
  const prompt = api.withSummary('PROMPT BASE');
  assert.match(prompt, /SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422/);
  assert.match(prompt, /### HIPERLINKS OBRIGATÓRIOS/);
  assert.match(prompt, /TODA ENTRADA DO SUMÁRIO[^\n]+DEVE SER UM HIPERLINK INTERNO/);
  assert.match(prompt, /NO SUMÁRIO AUTOMÁTICO, HABILITE OS HIPERLINKS DO CAMPO TOC/);
  assert.match(prompt, /NO FALLBACK MANUAL, CRIE INDICADORES\/ÂNCORAS/);
  assert.match(prompt, /SOMENTE SE A FERRAMENTA COMPROVADAMENTE NÃO SUPORTAR HIPERLINK INTERNO/);
  assert.match(prompt, /Painel de Navegação do Word/i);
  assert.match(prompt, /NÃO invente ou estime números de página/);
});

test('regra V422 de sumário é idempotente e preserva o prompt preexistente', () => {
  const once = api.withSummary('CONTEÚDO ORIGINAL');
  const twice = api.withSummary(once);
  assert.equal(twice, once);
  assert.match(once, /^CONTEÚDO ORIGINAL/);
  assert.equal((once.match(/SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422/g) || []).length, 1);
});

test('V422 preserva identidade visual dos módulos e granularidade útil', () => {
  assert.match(runtime, /MESMA LINGUAGEM DIDÁTICA, HIERARQUIA VISUAL, ÍCONES FUNCIONAIS/);
  assert.match(runtime, /NÃO converta títulos ricos do corpo em linhas planas sem ícones/);
  assert.match(runtime, /não crie terceiro nível apenas para repetir linhas internas de REGRA, EXCEÇÃO, PRAZO, COMPETÊNCIA, TESE ou PROVA/);
  assert.match(runtime, /NÃO crie uma entrada para cada tese isolada/);
  assert.match(runtime, /⚖️ QUADRO FINAL DE JURISPRUDÊNCIA/);
});

test('V422 permanece fora dos hot paths e persiste somente migrações explícitas', () => {
  for (const forbidden of [
    'MutationObserver(',
    'setInterval(',
    'getComputedStyle(',
    'requestAnimationFrame(',
    'indexedDB.',
    'localStorage.',
    'autoSyncAfterSave('
  ]) {
    assert.equal(runtime.includes(forbidden), false, `token proibido: ${forbidden}`);
  }
  assert.match(runtime, /state\.migrations\[JURISPRUDENCE_CITATION_MIGRATION_ID\]/);
  assert.match(runtime, /stateChanged && typeof saveData === "function"/);
});

test('loader V422 é isolado, ordenado após V380 e raiz/docs permanecem idênticos', () => {
  assert.equal(runtime, docsRuntime, 'runtime raiz/docs deve permanecer sincronizado');
  assert.equal(loader, docsLoader, 'loader raiz/docs deve permanecer sincronizado');
  assert.match(loader, /factory-summary-toc-v381\.js\?v=20260901-factory-summary-toc-v422/);
  assert.match(loader, /installFactoryResumoAulaJurisprudenciaV380\(\);[\s\S]*installFactorySummaryTocV382\(\);/);
  assert.doesNotMatch(loader, /factory-summary-toc-v381[\s\S]*MutationObserver\s*\(/);
});
'''
write_lf(ROOT / 'tests' / 'v381-factory-summary-toc.test.js', v381)

v382 = r'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = fs.readFileSync('factory-summary-toc-v381.js', 'utf8');
const docs = fs.readFileSync('docs/factory-summary-toc-v381.js', 'utf8');
const security = fs.readFileSync('security-observability-v318.js', 'utf8');
const docsSecurity = fs.readFileSync('docs/security-observability-v318.js', 'utf8');

test('V422 torna o sumário um espelho didático do módulo', () => {
  assert.match(root, /20260901-factory-summary-toc-v422/);
  assert.match(root, /SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422/);
  assert.match(root, /MESMA LINGUAGEM DIDÁTICA, HIERARQUIA VISUAL, ÍCONES FUNCIONAIS/);
  assert.match(root, /♦️ \*\*📑 SUMÁRIO\*\*/);
  assert.match(root, /ESPELHO VISUAL DO CORPO/);
  assert.match(root, /NÃO converta títulos ricos do corpo em linhas planas sem ícones/);
});

test('Resumo Aula e modo integrado preservam a gramática visual no sumário', () => {
  assert.match(root, /NÍVEL 1 — GRANDES EIXOS/);
  assert.match(root, /reproduza o padrão ♦️ do corpo/);
  assert.match(root, /NÍVEL 2 — INSTITUTOS\/SUBTÓPICOS/);
  assert.match(root, /reproduza o marcador ▶️📚 do corpo/);
  assert.match(root, /faixa azul-clara discreta e compacta/);
  assert.match(root, /♦️ \*\*🌍 1\. FORMAÇÃO, POSIÇÃO E FORÇA NORMATIVA DA DUDH\*\*/);
  assert.match(root, /▶️📚 \*\*ORIGEM, APROVAÇÃO E FINALIDADE\*\*/);
  assert.match(root, /♦️ \*\*⚖️ QUADRO FINAL DE JURISPRUDÊNCIA\*\*/);
});

test('sumário corrige alinhamento e quebras estranhas observadas no Word', () => {
  assert.match(root, /O SUMÁRIO DEVE SER ALINHADO À ESQUERDA/);
  assert.match(root, /NUNCA JUSTIFIQUE OS PARÁGRAFOS DO SUMÁRIO/);
  assert.match(root, /NÃO distribua artificialmente espaços entre palavras/);
  assert.match(root, /recuo suspenso coerente/);
  assert.match(root, /líder pontilhado discreto/);
  assert.match(root, /número da página alinhado à direita/);
});

test('Jurisprudência e Peça mantêm a identidade própria em vez de receber padrão de Aula', () => {
  assert.match(root, /NO MÓDULO JURISPRUDÊNCIA, O SUMÁRIO DEVE ESPELHAR A IDENTIDADE VISUAL/);
  assert.match(root, /NÃO force ♦️ ou ▶️📚 se o corpo daquele módulo usar outra gramática visual/);
  assert.match(root, /NO MÓDULO PEÇA, O SUMÁRIO DEVE ESPELHAR A ARQUITETURA VISUAL DA PRÓPRIA PEÇA/);
  assert.match(root, /NÃO transforme a peça em RESUMO\/AULA/);
});

test('V422 substitui instruções V381 e V382 já persistidas sem duplicar o sumário', () => {
  assert.match(root, /const LEGACY_MARKER = "## SUMÁRIO OBRIGATÓRIO DO DOCUMENTO — V381"/);
  assert.match(root, /const SUMMARY_MARKER_V382 = "## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V382"/);
  assert.match(root, /const SUMMARY_MARKER = "## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422"/);
  assert.match(root, /\[LEGACY_MARKER, SUMMARY_MARKER_V382\]/);
  assert.match(root, /Math\.min\(\.\.\.legacyIndexes\)/);
  assert.match(root, /factorySummaryTocV422/);
});

test('V422 continua isolada de hot paths; gravação ocorre apenas na migração', () => {
  for (const forbidden of [
    'MutationObserver',
    'setInterval(',
    'getComputedStyle(',
    'requestAnimationFrame(',
    'indexedDB',
    'localStorage'
  ]) {
    assert.equal(root.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
  assert.match(root, /factoryJurisprudenceCitationV422/);
  assert.match(root, /stateChanged && typeof saveData === "function"/);
});

test('loader usa cache-bust V422 e raiz/docs permanecem idênticos', () => {
  assert.match(security, /installFactorySummaryTocV382/);
  assert.match(security, /factory-summary-toc-v381\.js\?v=20260901-factory-summary-toc-v422/);
  assert.match(security, /aldusFactorySummaryTocV382/);
  assert.equal(root, docs, 'runtime raiz e docs devem ser idênticos');
  assert.equal(security, docsSecurity, 'loader raiz e docs devem ser idênticos');
});
'''
write_lf(ROOT / 'tests' / 'v382-factory-summary-didactic.test.js', v382)

# Atualiza apenas os contratos V385 afetados pela V422, preservando os demais.
v385_path = ROOT / 'tests' / 'v385-factory-padronizacao-final-sumario.test.js'
v385 = v385_path.read_text(encoding='utf-8')
v385 = replace_once(v385, 'assert.equal(api.version, "20260824-factory-padronizacao-final-sumario-v385");', 'assert.equal(api.version, "20260901-factory-padronizacao-final-sumario-v422");', 'teste versão padronização')
v385 = replace_once(v385, '  assert.match(api.prompt, /Painel de Navegação do Word/);', '  assert.match(api.prompt, /Painel de Navegação do Word/);\n  assert.match(api.prompt, /hiperlinks internos obrigatórios em todas as entradas do sumário/);\n  assert.match(api.prompt, /ferramenta comprovadamente não suportar hiperlink interno/);', 'teste hiperlinks padronização')
v385 = replace_once(v385, '/factory-padronizacao-final-sumario-v385\\.js\\?v=20260824-factory-padronizacao-final-sumario-v385/', '/factory-padronizacao-final-sumario-v385\\.js\\?v=20260901-factory-padronizacao-final-sumario-v422/', 'teste loader padronização')
v385 = v385.replace('    "saveData(",\n', '')
write_lf(v385_path, v385)

v422 = r'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const runtimePath = 'factory-summary-toc-v381.js';
const source = fs.readFileSync(runtimePath, 'utf8');
const api = require(`../${runtimePath}`);

const YEAR_MARKER = '## ANO DA DECISÃO — REGRA OBRIGATÓRIA DA JURISPRUDÊNCIA';
const CITATION_MARKER = '## CITAÇÃO JURISPRUDENCIAL — FORMATO OBRIGATÓRIO';
const SUMMARY_V382 = '## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V382';
const SUMMARY_V422 = '## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422';

function legacyPrompt(label = 'PROMPT SALVO') {
  return `${label}\n\n${SUMMARY_V382}\n\nSUMÁRIO LEGADO\n\n${YEAR_MARKER}\n\nUSE O CAMPO:\n📍 **ANO DA DECISÃO: 2026**\n\n## SOMBREAMENTO BEGE DOS RÓTULOS — PADRÃO OBRIGATÓRIO DO MODELO\n\nBEGE LEGADO`;
}

function createHarness() {
  const types = ['resumoAula', 'lei', 'jurisprudencia', 'peca', 'resumoAulaJurisprudencia', 'leiJurisprudencia', 'consolidacao'];
  const defaults = Object.fromEntries(types.map((type) => [type, legacyPrompt(`DEFAULT ${type}`)]));
  const saved = Object.fromEntries(types.map((type) => [type, legacyPrompt(`STATE ${type}`)]));
  let saves = 0;
  const context = {
    console,
    Date,
    defaultFactoryPromptLibrary: defaults,
    state: { factoryPromptLibrary: saved, migrations: {} },
    saveData() { saves += 1; },
    factoryPromptBase(type) { return this.state?.factoryPromptLibrary?.[type] || ''; },
    module: { exports: {} },
    exports: {}
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: runtimePath });
  return { context, api: context.module.exports, getSaves: () => saves };
}

test('V422 contém a seção de citação e define itálico do parêntese ao parêntese com ponto final fora', () => {
  const prompt = api.withJurisprudenceCitation('PROMPT BASE');
  assert.match(prompt, /## CITAÇÃO JURISPRUDENCIAL — FORMATO OBRIGATÓRIO/);
  assert.match(prompt, /O ITÁLICO COMEÇA NO PARÊNTESE DE ABERTURA E TERMINA NO PARÊNTESE DE FECHAMENTO/);
  assert.match(prompt, /O PONTO FINAL DA FRASE FICA FORA DO ITÁLICO, DEPOIS DO PARÊNTESE DE FECHAMENTO/);
  assert.match(prompt, /\*\(\[TRIBUNAL\], \[CLASSE E NÚMERO DO PROCESSO\], \[INFORMATIVO, QUANDO HOUVER\], \[ANO\]\)\*\./);
});

test('V422 remove o campo separado de ano do prompt resultante', () => {
  const result = api.withJurisprudenceCitation(`${YEAR_MARKER}\n\n📍 **ANO DA DECISÃO: 2026**`);
  assert.doesNotMatch(result, /📍 \*\*ANO DA DECISÃO:/);
  assert.doesNotMatch(result, /## ANO DA DECISÃO — REGRA OBRIGATÓRIA DA JURISPRUDÊNCIA/);
  assert.match(result, /## CITAÇÃO JURISPRUDENCIAL — FORMATO OBRIGATÓRIO/);
});

test('V422 aplica a migração duas vezes sem alterar a biblioteca na segunda execução', () => {
  const { context, api: runtimeApi, getSaves } = createHarness();
  const first = runtimeApi.install();
  assert.equal(first.installed, true);
  const afterFirst = JSON.stringify(context.state.factoryPromptLibrary);
  const savesAfterFirst = getSaves();
  const second = runtimeApi.install();
  const afterSecond = JSON.stringify(context.state.factoryPromptLibrary);
  assert.equal(second.installed, true);
  assert.equal(afterSecond, afterFirst);
  assert.equal(getSaves(), savesAfterFirst);
  assert.ok(context.state.migrations.factorySummaryTocV422);
  assert.ok(context.state.migrations.factoryJurisprudenceCitationV422);
});

test('V422 migra biblioteca já salva: sai ANO DA DECISÃO e entra uma única citação', () => {
  const { context, api: runtimeApi } = createHarness();
  runtimeApi.install();
  const prompt = context.state.factoryPromptLibrary.jurisprudencia;
  assert.doesNotMatch(prompt, /📍 \*\*ANO DA DECISÃO:/);
  assert.doesNotMatch(prompt, new RegExp(YEAR_MARKER));
  assert.equal((prompt.match(new RegExp(CITATION_MARKER, 'g')) || []).length, 1);
});

test('V422 renova V382 para V422 na biblioteca persistida', () => {
  const { context, api: runtimeApi } = createHarness();
  runtimeApi.install();
  for (const type of runtimeApi.targetTypes) {
    const prompt = context.state.factoryPromptLibrary[type];
    assert.doesNotMatch(prompt, new RegExp(SUMMARY_V382));
    assert.equal((prompt.match(new RegExp(SUMMARY_V422, 'g')) || []).length, 1, type);
  }
});

test('V422 inclui lei e leiJurisprudencia nos tipos-alvo do sumário', () => {
  assert.ok(api.targetTypes.includes('lei'));
  assert.ok(api.targetTypes.includes('leiJurisprudencia'));
  assert.equal(api.targetTypes.length, 6);
});

test('V422 descreve toda entrada do sumário como hiperlink obrigatório', () => {
  const prompt = api.withSummary('BASE');
  assert.match(prompt, /TODA ENTRADA DO SUMÁRIO[^\n]+DEVE SER UM HIPERLINK INTERNO/);
  assert.match(prompt, /NÃO DEIXE ENTRADAS SEM VÍNCULO NAVEGÁVEL/);
  assert.match(prompt, /NO SUMÁRIO AUTOMÁTICO, HABILITE OS HIPERLINKS DO CAMPO TOC/);
  assert.match(prompt, /NO FALLBACK MANUAL, CRIE INDICADORES\/ÂNCORAS/);
});

test('V422 preserva byte a byte a seção de sombreamento bege existente', () => {
  assert.match(source, /TOM EXATO DO SOMBREAMENTO: BEGE #EEECE1 \(RGB 238, 236, 225\)/);
  assert.match(source, /O SOMBREAMENTO DEVE SER DE CARACTERE\/RUN, E NÃO DO PARÁGRAFO INTEIRO/);
  assert.match(source, /<w:shd w:val=\\"clear\\" w:fill=\\"EEECE1\\"\/>/);
});
'''
write_lf(ROOT / 'tests' / 'v422-factory-citation-toc.test.js', v422)

# Garante LF e paridade imediatamente após a edição.
for a, b in [
    ('factory-summary-toc-v381.js', 'docs/factory-summary-toc-v381.js'),
    ('factory-padronizacao-final-sumario-v385.js', 'docs/factory-padronizacao-final-sumario-v385.js'),
    ('security-observability-v318.js', 'docs/security-observability-v318.js'),
]:
    pa, pb = ROOT / a, ROOT / b
    if pa.read_bytes() != pb.read_bytes():
        raise SystemExit(f'paridade falhou: {a} != {b}')
    if b'\r\n' in pa.read_bytes():
        raise SystemExit(f'CRLF detectado: {a}')

print('V422 patch aplicado com sucesso; bege preservado byte a byte.')
