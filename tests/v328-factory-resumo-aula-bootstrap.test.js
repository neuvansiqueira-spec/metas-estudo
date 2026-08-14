const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const bootstrapSource = fs.readFileSync('bootstrap-integrity-loader-v275.js', 'utf8');
const canonicalSource = fs.readFileSync('factory-resumo-aula-canonical-v327.js', 'utf8');
const appSource = fs.readFileSync('script.js', 'utf8');
const pagesWorkflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');

function extractOfficialResumoAulaPrompt() {
  const marker = 'const FACTORY_RESUMO_AULA_PROMPT_SEGMENT = ';
  const start = appSource.indexOf(marker);
  assert.ok(start >= 0, 'prompt-base RESUMO/AULA não encontrado em script.js');
  const valueStart = start + marker.length;
  const endMarker = '\nconst FACTORY_RESUMO_AULA_PROMPT = FACTORY_RESUMO_AULA_PROMPT_SEGMENT;';
  const end = appSource.indexOf(endMarker, valueStart);
  assert.ok(end > valueStart, 'fim do prompt-base RESUMO/AULA não encontrado em script.js');
  const expression = appSource.slice(valueStart, end).trim().replace(/;$/, '');
  return vm.runInNewContext(expression);
}

function runCanonicalPolicy(prompt) {
  const context = vm.createContext({
    console,
    Date,
    Object,
    Boolean,
    JSON,
    setTimeout: () => 0,
    window: { addEventListener() {} },
    document: {
      readyState: 'complete',
      hidden: false,
      addEventListener() {}
    }
  });

  vm.runInContext(`
    const defaultFactoryPromptLibrary = {
      triagem: 'TRIAGEM',
      resumoAula: ${JSON.stringify(prompt)},
      lei: 'LEI',
      jurisprudencia: 'JURISPRUDÊNCIA',
      peca: 'PEÇA',
      consolidacao: 'CONSOLIDAÇÃO'
    };
    let state = {
      migrations: {},
      factoryPromptLibrary: {
        triagem: 'TRIAGEM',
        resumoAula: ${JSON.stringify(prompt)},
        lei: 'LEI',
        jurisprudencia: 'JURISPRUDÊNCIA',
        peca: 'PEÇA',
        consolidacao: 'CONSOLIDAÇÃO'
      }
    };
    function normalizeFactoryPromptLibrary(library = {}) {
      return { ...library };
    }
    function factoryPromptBase(type) {
      return String(state.factoryPromptLibrary?.[type] || '').trim();
    }
    function saveData() {}
  `, context);

  vm.runInContext(canonicalSource, context);
  return vm.runInContext('factoryPromptBase("resumoAula")', context);
}

test('V328 usa o prompt-base completo real de RESUMO/AULA, e não uma fixture reduzida', () => {
  const officialPrompt = extractOfficialResumoAulaPrompt();
  assert.ok(officialPrompt.length > 12000, `prompt oficial inesperadamente curto: ${officialPrompt.length}`);
  assert.match(officialPrompt, /## PADRÃO OBRIGATÓRIO DE PROFUNDIDADE DIDÁTICA/);
  assert.match(officialPrompt, /## CONTROLE FINAL DE FIDELIDADE, AMBIGUIDADE E COBERTURA/);
  assert.match(officialPrompt, /## FORMATO OBRIGATÓRIO/);
  assert.match(officialPrompt, /## WORD DO MÓDULO/);
  assert.match(officialPrompt, /MAPA_HIERARQUICO_RESUMO_AULA_\[FILTRO\]\.docx/);
});

test('V328 confirma o resultado efetivo do gerador sobre o prompt completo real', () => {
  const officialPrompt = extractOfficialResumoAulaPrompt();
  const generatedPrompt = runCanonicalPolicy(officialPrompt);

  assert.ok(generatedPrompt.length > 12000);
  assert.doesNotMatch(generatedPrompt, /INICIE COM LETRA MAIÚSCULA TODAS AS PALAVRAS RELEVANTES/);
  assert.doesNotMatch(generatedPrompt, /▶️📚 Critério Material ou Substancial\. Conteúdo Ofensivo:/);
  assert.match(generatedPrompt, /▶️📚 CRITÉRIO MATERIAL OU SUBSTANCIAL\. CONTEÚDO OFENSIVO:/);
  assert.match(generatedPrompt, /## PADRÃO VISUAL DO WORD/);
  assert.match(generatedPrompt, /FAIXA HORIZONTAL AZUL-CLARA DISCRETA/);
  assert.match(generatedPrompt, /COR PRETA PURA #000000/);
  assert.match(generatedPrompt, /🏛️ \*\*COMPETÊNCIA:\*\*/);
  assert.match(generatedPrompt, /⏱️ \*\*PRAZO:\*\*/);
  assert.match(generatedPrompt, /🚫 \*\*VEDAÇÃO:\*\*/);
  assert.match(generatedPrompt, /📌 \*\*PROVA:\*\*/);
});

test('V328 ancora a política canônica no ciclo real do bootstrap', () => {
  assert.match(bootstrapSource, /20260814-factory-resumo-aula-bootstrap-v328/);
  assert.match(bootstrapSource, /factory-resumo-aula-canonical-v327\.js\?v=20260814-factory-resumo-aula-bootstrap-v328/);
  assert.match(bootstrapSource, /aldus:bootstrap-integrity-v258-ready/);
  assert.match(bootstrapSource, /aldusFactoryResumoAulaCanonicalBootstrapV328/);
  assert.ok(
    bootstrapSource.indexOf('installResumoAulaCanonicalAfterBootstrap(baseUrl, source, parent)')
      < bootstrapSource.indexOf('parent.insertBefore(core'),
    'o listener canônico precisa ser registrado antes de o bootstrap iniciar o núcleo'
  );
});

test('deploy V328 copia o bootstrap corrigido e invalida cache/URL pública', () => {
  assert.match(pagesWorkflow, /node --check bootstrap-integrity-loader-v275\.js/);
  assert.match(pagesWorkflow, /tests\/v328-factory-resumo-aula-bootstrap\.test\.js/);
  assert.match(pagesWorkflow, /cp bootstrap-integrity-loader-v275\.js docs\/bootstrap-integrity-loader-v275\.js/);
  assert.match(pagesWorkflow, /20260814-factory-resumo-aula-bootstrap-v328/);
});
