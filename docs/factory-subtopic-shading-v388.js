(() => {
  "use strict";

  const VERSION = "20260826-factory-subtopic-shading-v388";
  const API_MARKER = "__aldusFactorySubtopicShadingV388";
  const WRAP_MARKER = "__aldusFactorySubtopicShadingWrappedV388";
  const INSTALL_FLAG = "aldusFactorySubtopicShadingV388";
  const MIGRATION_ID = "factorySubtopicShadingV388";
  const SHADING_MARKER = "## SOMBREAMENTO MARROM ACINZENTADO DOS SUBTÓPICOS — V388";
  const TARGET_TYPES = Object.freeze([
    "resumoAula",
    "resumoAulaJurisprudencia",
    "lei",
    "leiJurisprudencia",
    "jurisprudencia",
    "consolidacao",
    "padronizacaoFinalSumario"
  ]);
  const TARGET_SET = new Set(TARGET_TYPES);

  const SHADING_SECTION = `

${SHADING_MARKER}

REGRA VISUAL OBRIGATÓRIA ADICIONAL, SEM SUPRIMIR NENHUMA DAS DEMAIS REGRAS DE CONTEÚDO, HIERARQUIA, FONTES, CAPITALIZAÇÃO, ÍCONES, NEGRITOS, RECUOS, SUMÁRIO, PAGINAÇÃO, ENTREGA OU FORMATAÇÃO JÁ EXISTENTES NESTE PROMPT.

USE COMO REFERÊNCIA EXCLUSIVAMENTE A COR DO SOMBREAMENTO DOS SUBTÓPICOS DO DOCUMENTO-MODELO FORNECIDO PELO USUÁRIO. NÃO COPIE DO DOCUMENTO-MODELO QUALQUER OUTRA REGRA, CONTEÚDO, ESTRUTURA, COR, FONTE, ESPAÇAMENTO OU ELEMENTO VISUAL.

### COR EXATA

APLIQUE NOS SUBTÓPICOS/BLOCOS INTERNOS DE CONTEÚDO UM SOMBREAMENTO DE PARÁGRAFO MARROM ACINZENTADO CLARO COM PREENCHIMENTO HEXADECIMAL EXATO:

#DDD9C3

QUANDO A FERRAMENTA DE GERAÇÃO DO WORD PERMITIR CONTROLE OOXML, O SOMBREAMENTO DEVE CORRESPONDER A PREENCHIMENTO DE PARÁGRAFO EQUIVALENTE A w:shd com w:fill="DDD9C3".

NÃO USE REALCE DE TEXTO/HIGHLIGHT COMO SUBSTITUTO SE FOR POSSÍVEL APLICAR SOMBREAMENTO DE PARÁGRAFO. O OBJETIVO É PRODUZIR UMA FAIXA DE FUNDO CONTÍNUA NO BLOCO, COMO NO PADRÃO DE REFERÊNCIA.

### ONDE APLICAR

APLIQUE O #DDD9C3 ÀS LINHAS E AOS PARÁGRAFOS INTERNOS SUBORDINADOS AO CABEÇALHO DO RESPECTIVO ASSUNTO, INSTITUTO, ARTIGO, BLOCO JURISPRUDENCIAL OU SEÇÃO DO RESUMO.

NO RESUMO/AULA E NO RESUMO/AULA + JURISPRUDÊNCIA, ISSO INCLUI, QUANDO EXISTIREM, AS LINHAS INICIADAS POR:
* 1️⃣, 2️⃣, 3️⃣, 4️⃣, 5️⃣ ETC.;
* 🏛️ COMPETÊNCIA;
* ⏱️ PRAZO;
* 🚫 VEDAÇÃO;
* ✅ REGRA, EFEITO OU RESULTADO;
* ✳️ EXCEÇÃO, RESSALVA, DISTINÇÃO OU PEGADINHA;
* 📌 PROVA;
* ⚖️ JURISPRUDÊNCIA — TESE, REGRA, EXCEÇÃO, DISTINÇÃO OU EVOLUÇÃO;
* E OUTRAS LINHAS INTERNAS EQUIVALENTES QUE PERTENÇAM AO MESMO BLOCO DIDÁTICO.

NOS MÓDULOS LEI, LEI + JURISPRUDÊNCIA E JURISPRUDÊNCIA AUTÔNOMA, IDENTIFIQUE O EQUIVALENTE FUNCIONAL DESSES SUBTÓPICOS/BLOCOS INTERNOS E APLIQUE O MESMO #DDD9C3, SEM ALTERAR A ARQUITETURA PRÓPRIA DO RESPECTIVO MÓDULO.

NOS MODOS REVISÃO/CONSOLIDAÇÃO FINAL E PADRONIZAÇÃO FINAL + SUMÁRIO, PRESERVE E, QUANDO NECESSÁRIO PARA CUMPRIR ESTE PADRÃO, APLIQUE O #DDD9C3 SOMENTE ÀS PARTES QUE CORRESPONDAM A RESUMO/AULA, LEI OU JURISPRUDÊNCIA. NÃO IMPONHA ESTA GRAMÁTICA VISUAL À PEÇA.

### ONDE NÃO APLICAR

NÃO APLIQUE O SOMBREAMENTO #DDD9C3:
* AOS GRANDES EIXOS/TÍTULOS ♦️;
* AOS CABEÇALHOS ▶️📚;
* AO TÍTULO DO DOCUMENTO;
* AO TÍTULO ♦️ 📑 SUMÁRIO;
* AOS CABEÇALHOS E ELEMENTOS QUE O PROMPT ORIGINAL DETERMINE EXPRESSAMENTE QUE POSSUAM OUTRO TRATAMENTO VISUAL PRÓPRIO;
* À PEÇA OU A TRECHOS QUE NÃO SEJAM SUBTÓPICOS/BLOCOS INTERNOS DE RESUMO.

NO RESUMO/AULA E NO RESUMO/AULA + JURISPRUDÊNCIA, A FAIXA AZUL-CLARA DOS CABEÇALHOS ▶️📚 DEVE SER MANTIDA EXATAMENTE COMO JÁ DETERMINADO. O #DDD9C3 COMEÇA SOMENTE NOS PARÁGRAFOS INTERNOS ABAIXO DESSES CABEÇALHOS.

### TEXTO E DEMAIS FORMATAÇÕES

O #DDD9C3 É COR DE FUNDO, NÃO COR DE FONTE.

MANTENHA A COR DO TEXTO, OS NEGRITOS, OS EMOJIS, OS ÍCONES, A NUMERAÇÃO, OS RECUOS, O ALINHAMENTO, OS ESPAÇAMENTOS E TODAS AS DEMAIS FORMATAÇÕES EXATAMENTE CONFORME AS REGRAS ORIGINAIS DO RESPECTIVO PROMPT.

SE O PROMPT ORIGINAL DETERMINAR TEXTO PRETO #000000, ESSA REGRA CONTINUA INTEGRALMENTE VÁLIDA.

O SOMBREAMENTO DEVE ACOMPANHAR TODA A LARGURA ÚTIL DO PARÁGRAFO/BLOCO, RESPEITANDO MARGENS E RECUOS, SEM ULTRAPASSÁ-LOS.

SE UMA LINHA QUEBRA NATURALMENTE EM DUAS OU MAIS LINHAS VISUAIS, O FUNDO DEVE PERMANECER CONTÍNUO EM TODO O PARÁGRAFO.

EM SEQUÊNCIAS DE SUBTÓPICOS CONTÍGUOS, EVITE FAIXAS BRANCAS ACIDENTAIS CAUSADAS POR PARÁGRAFOS VAZIOS ENTRE ELES, SEM REMOVER O ESPAÇAMENTO NECESSÁRIO À LEGIBILIDADE.

### EXCEÇÃO EXPRESSA À REGRA GERAL DE FUNDO

ESTA SEÇÃO CRIA UMA ÚNICA EXCEÇÃO VISUAL ESPECÍFICA: NOS SUBTÓPICOS/BLOCOS INTERNOS DEFINIDOS ACIMA, O FUNDO DEVE SER #DDD9C3.

PORTANTO, EVENTUAL REGRA ANTERIOR DO MESMO PROMPT QUE DETERMINE “FUNDO BRANCO”, PROÍBA “SOMBREAMENTOS” OU DECLARE OUTRA COR DE FUNDO COMO ÚNICA PERMITIDA DEVE SER INTERPRETADA COM ESTA RESSALVA E CONTINUA VALENDO INTEGRALMENTE FORA DOS SUBTÓPICOS ABRANGIDOS POR ESTA SEÇÃO.

NÃO ALTERE NENHUMA OUTRA REGRA DO PROMPT POR CAUSA DESTA EXCEÇÃO.
`;

  function withShading(prompt) {
    const raw = String(prompt || "").trim();
    if (!raw) return raw;
    if (raw.includes(SHADING_MARKER)) return raw;
    return `${raw}${SHADING_SECTION}`.trim();
  }

  function ensureDependentPromptsReady() {
    const apis = [
      "__aldusFactoryResumoAulaJurisprudenciaV380",
      "__aldusFactoryLeiJurisprudenciaV383",
      "__aldusFactoryFinalReviewV384",
      "__aldusFactoryPadronizacaoFinalSumarioV385",
      "__aldusFactorySummaryTocV382"
    ];
    for (const name of apis) {
      try {
        const api = globalThis[name];
        if (api && typeof api.install === "function") api.install();
      } catch {}
    }
  }

  function patchPromptLibraries() {
    ensureDependentPromptsReady();
    let changed = 0;

    try {
      TARGET_TYPES.forEach((type) => {
        const current = String(defaultFactoryPromptLibrary?.[type] || "").trim();
        if (!current) return;
        const next = withShading(current);
        if (next !== current) changed += 1;
        defaultFactoryPromptLibrary[type] = next;
      });
    } catch {}

    try {
      if (state && typeof state === "object") {
        state.factoryPromptLibrary ||= {};
        state.migrations ||= {};
        TARGET_TYPES.forEach((type) => {
          const current = String(state.factoryPromptLibrary?.[type] || "").trim();
          if (!current) return;
          const next = withShading(current);
          if (next !== current) changed += 1;
          state.factoryPromptLibrary[type] = next;
        });
        state.migrations[MIGRATION_ID] ||= new Date().toISOString();
      }
    } catch {}

    return changed;
  }

  function wrapFactoryPromptBase() {
    try {
      if (typeof factoryPromptBase !== "function") return false;
      if (factoryPromptBase?.[WRAP_MARKER] === VERSION) return true;
      const previous = factoryPromptBase;
      const wrapped = function(type) {
        const prompt = previous(type);
        return TARGET_SET.has(type) ? withShading(prompt) : prompt;
      };
      Object.defineProperty(wrapped, WRAP_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, "__aldusFactorySubtopicShadingOriginal", { value: previous });
      factoryPromptBase = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  function isFactoryRoute() {
    if (typeof location === "undefined") return false;
    return String(location.hash || "").replace(/^#/, "").split(/[?&]/)[0] === "fabrica-resumos";
  }

  function refreshFactoryUi() {
    if (!isFactoryRoute()) return;
    try {
      if (typeof renderFactoryPromptLibrary === "function") renderFactoryPromptLibrary();
    } catch {}
    try {
      if (typeof renderFactory === "function" && typeof elements !== "undefined" && elements?.factoryList) renderFactory();
    } catch {}
  }

  function install() {
    const changed = patchPromptLibraries();
    const wrapped = wrapFactoryPromptBase();
    if (!wrapped) return { installed: false, changed, wrapped };

    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset[INSTALL_FLAG] = "true";
    }
    refreshFactoryUi();
    return { installed: true, changed, wrapped };
  }

  const api = Object.freeze({
    version: VERSION,
    targetTypes: TARGET_TYPES,
    shadingMarker: SHADING_MARKER,
    fill: "DDD9C3",
    withShading,
    install
  });

  globalThis[API_MARKER] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", install, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", install, { once: true });
    window.addEventListener("load", install, { once: true });
  }
})();
