(() => {
  "use strict";

  const VERSION = "20260901-factory-summary-toc-v422";
  const API_MARKER = "__aldusFactorySummaryTocV382";
  const WRAP_MARKER = "__aldusFactorySummaryTocWrappedV382";
  const INSTALL_FLAG = "aldusFactorySummaryTocV382";
  const MIGRATION_ID = "factorySummaryTocV422";
  const TARGET_TYPES = Object.freeze([
    "resumoAula",
    "lei",
    "jurisprudencia",
    "peca",
    "resumoAulaJurisprudencia",
    "leiJurisprudencia",
    // V431: a Fusao Final nasceu depois da V422 e ficou fora das listas de alvo.
    // Sem isso o prompt manda "seguir as regras de sumario deste projeto" sem que
    // regra nenhuma seja injetada, e o modelo improvisa a formatacao.
    "fusaoFinal"
  ]);
  const TARGET_SET = new Set(TARGET_TYPES);
  const LEGACY_MARKER = "## SUMÁRIO OBRIGATÓRIO DO DOCUMENTO — V381";
  const SUMMARY_MARKER_V382 = "## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V382";
  const SUMMARY_MARKER = "## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422";
  const BEIGE_MARKER = "## SOMBREAMENTO BEGE DOS RÓTULOS — PADRÃO OBRIGATÓRIO DO MODELO";
  const BEIGE_MIGRATION_ID = "factoryBeigeLabelShadingScopeV400";
  const BEIGE_TARGET_TYPES = Object.freeze([
    "resumoAula",
    "lei",
    "jurisprudencia",
    "peca",
    "resumoAulaJurisprudencia",
    "leiJurisprudencia",
    "consolidacao",
    "fusaoFinal"
  ]);
  const BEIGE_TARGET_SET = new Set(BEIGE_TARGET_TYPES);
  const JURISPRUDENCE_YEAR_MARKER = "## ANO DA DECISÃO — REGRA OBRIGATÓRIA DA JURISPRUDÊNCIA";
  const JURISPRUDENCE_CITATION_MARKER = "## CITAÇÃO JURISPRUDENCIAL — FORMATO OBRIGATÓRIO";
  const JURISPRUDENCE_CITATION_MIGRATION_ID = "factoryJurisprudenceCitationV422";
  const JURISPRUDENCE_YEAR_TARGET_TYPES = Object.freeze([
    "jurisprudencia",
    "resumoAulaJurisprudencia",
    "leiJurisprudencia",
    "consolidacao"
  ]);
  const JURISPRUDENCE_YEAR_TARGET_SET = new Set(JURISPRUDENCE_YEAR_TARGET_TYPES);

  const SUMMARY_SECTION = `

${SUMMARY_MARKER}

TODO DOCUMENTO WORD GERADO POR ESTE MÓDULO DEVE CONTER UM SUMÁRIO NO INÍCIO, APÓS O TÍTULO/IDENTIFICAÇÃO INICIAL E ANTES DO DESENVOLVIMENTO MATERIAL DO CONTEÚDO.

REGRA CENTRAL DESTA VERSÃO:
O SUMÁRIO NÃO DEVE PARECER UMA LISTA ADMINISTRATIVA, UM ÍNDICE BRUTO OU UM BLOCO VISUALMENTE DESLIGADO DO RESUMO. ELE DEVE REPRODUZIR, EM FORMATO MAIS COMPACTO, A MESMA LINGUAGEM DIDÁTICA, HIERARQUIA VISUAL, ÍCONES FUNCIONAIS, NUMERAÇÃO, CAPITALIZAÇÃO E IDENTIDADE GRÁFICA UTILIZADAS NOS TÍTULOS DO CORPO DO RESPECTIVO MÓDULO.

OBJETIVO:
permitir localizar rapidamente um grande eixo, instituto, seção ou subtema e, ao mesmo tempo, fazer com que a leitura do sumário já revele a arquitetura lógica do conteúdo.

### TÍTULO DO SUMÁRIO

USE PREFERENCIALMENTE:

♦️ **📑 SUMÁRIO**

O TÍTULO DO SUMÁRIO DEVE SEGUIR A MESMA IDENTIDADE VISUAL DOS GRANDES EIXOS DO MÓDULO, MAS NÃO DEVE APARECER COMO ENTRADA DENTRO DO PRÓPRIO SUMÁRIO.

### ESPELHO VISUAL DO CORPO

CADA ENTRADA DO SUMÁRIO DEVE REUTILIZAR O TEXTO VISÍVEL DO CABEÇALHO CORRESPONDENTE NO CORPO, PRESERVANDO, QUANDO EXISTIREM:
* emoji temático;
* marcador funcional;
* numeração;
* letras maiúsculas;
* negrito;
* relação hierárquica entre eixo e subtópico.

NÃO remova os marcadores didáticos apenas porque o conteúdo está no sumário.
NÃO converta títulos ricos do corpo em linhas planas sem ícones.
NÃO use um padrão visual genérico do Word que apague a identidade do módulo.

### RESUMO/AULA E RESUMO/AULA + JURISPRUDÊNCIA

NO SUMÁRIO DESSES DOIS MODOS:

NÍVEL 1 — GRANDES EIXOS:
* reproduza o padrão ♦️ do corpo;
* preserve o emoji temático do grande eixo quando houver;
* preserve a numeração do eixo;
* mantenha o título integralmente em letras maiúsculas;
* use negrito real e texto preto #000000;
* não aplique faixa azul-clara aos itens de nível 1.

NÍVEL 2 — INSTITUTOS/SUBTÓPICOS:
* reproduza o marcador ▶️📚 do corpo;
* mantenha o texto integralmente em letras maiúsculas;
* use negrito real e texto preto #000000;
* aplique recuo real de um nível para demonstrar dependência do grande eixo;
* quando a ferramenta permitir personalizar os estilos TOC do Word com segurança, use uma faixa azul-clara discreta e compacta no mesmo espírito dos cabeçalhos ▶️📚 do corpo, sem tornar o sumário pesado;
* se a faixa comprometer a legibilidade ou não puder ser criada corretamente, preserve obrigatoriamente ▶️📚, negrito, recuo e hierarquia, sem inventar outro padrão.

NÍVEL 3:
* use somente quando houver subestrutura realmente necessária para localizar um assunto;
* mantenha recuo adicional e aparência mais discreta;
* não crie terceiro nível apenas para repetir linhas internas de REGRA, EXCEÇÃO, PRAZO, COMPETÊNCIA, TESE ou PROVA.

EXEMPLO VISUAL DE REFERÊNCIA:

♦️ **🌍 1. FORMAÇÃO, POSIÇÃO E FORÇA NORMATIVA DA DUDH** ........................ 3
    ▶️📚 **ORIGEM, APROVAÇÃO E FINALIDADE** ........................................ 3
    ▶️📚 **NATUREZA JURÍDICA E FORÇA NORMATIVA** ................................... 3
    ▶️📚 **ESTRUTURA, DIMENSÕES E LACUNAS DO DOCUMENTO** ........................... 4

♦️ **🧭 2. DIGNIDADE, IGUALDADE E UNIVERSALIDADE** ................................. 5
    ▶️📚 **PREÂMBULO E FUNDAMENTO AXIOLÓGICO** ..................................... 5
    ▶️📚 **IGUALDADE, LIBERDADE E FRATERNIDADE** ................................... 5

O EXEMPLO ACIMA DEFINE A LÓGICA VISUAL; OS TÍTULOS, EMOJIS E NÚMEROS REAIS DEVEM VIR DO DOCUMENTO EFETIVAMENTE GERADO.

### JURISPRUDÊNCIA

NO MÓDULO JURISPRUDÊNCIA, O SUMÁRIO DEVE ESPELHAR A IDENTIDADE VISUAL DOS PRÓPRIOS TÍTULOS JURISPRUDENCIAIS DO DOCUMENTO.

PRESERVE os ícones, marcadores, grandes eixos e agrupamentos utilizados pelo prompt de jurisprudência.
NÃO force ♦️ ou ▶️📚 se o corpo daquele módulo usar outra gramática visual.
NÃO crie uma entrada para cada tese isolada quando isso transformar o sumário em repetição integral do documento.

### PEÇA

NO MÓDULO PEÇA, O SUMÁRIO DEVE ESPELHAR A ARQUITETURA VISUAL DA PRÓPRIA PEÇA.

PRESERVE os nomes, marcadores, ícones e níveis utilizados nas grandes seções e subdivisões do modelo.
NÃO transforme a peça em RESUMO/AULA apenas para padronizar o sumário.
NÃO introduza ♦️ ou ▶️📚 quando esses marcadores não fizerem parte da identidade visual da peça gerada.

### QUADRO FINAL DE JURISPRUDÊNCIA

NO MODO RESUMO/AULA + JURISPRUDÊNCIA, INCLUA NO SUMÁRIO O BLOCO FINAL:

♦️ **⚖️ QUADRO FINAL DE JURISPRUDÊNCIA**

com o mesmo tratamento visual de grande eixo utilizado no corpo.

### ALINHAMENTO, RECUOS E QUEBRAS DE LINHA

O SUMÁRIO DEVE SER ALINHADO À ESQUERDA.
NUNCA JUSTIFIQUE OS PARÁGRAFOS DO SUMÁRIO.
NÃO distribua artificialmente espaços entre palavras para preencher a largura da linha.

USE recuos reais para os níveis subordinados.
SE um título longo precisar quebrar de linha, use quebra natural e recuo suspenso coerente, mantendo as linhas seguintes alinhadas ao início do texto da entrada, e não ao marcador da margem.
EVITE deixar uma única palavra isolada na linha seguinte quando a ferramenta permitir ajuste de largura ou recuo sem comprometer o layout.

### NÚMEROS DE PÁGINA E PONTILHADO

QUANDO houver paginação confiável:
* coloque o número da página alinhado à direita;
* use líder pontilhado discreto entre o título e o número da página;
* mantenha o número da página na mesma linha da entrada sempre que o comprimento permitir;
* em títulos quebrados, preserve o número da página alinhado à direita na última linha da entrada.

NÃO invente ou estime números de página.

### SUMÁRIO AUTOMÁTICO DO WORD

QUANDO a ferramenta de geração de DOCX suportar campo automático real de sumário:
* prefira o sumário automático;
* use estilos estruturais equivalentes a Título 1, Título 2 e, apenas quando necessário, Título 3 no corpo;
* personalize os estilos Sumário 1/TOC 1, Sumário 2/TOC 2 e Sumário 3/TOC 3 para reproduzir a mesma gramática visual descrita acima;
* preserve emojis e marcadores presentes no texto dos títulos;
* habilite hiperlinks internos obrigatórios em todas as entradas do sumário;
* atualize o campo do sumário depois da paginação final quando a ferramenta permitir.

NÃO aceite como resultado final um sumário automático com aparência padrão genérica do Word se a ferramenta permitir personalização dos estilos TOC.

### FALLBACK MANUAL

SE a ferramenta não conseguir criar ou atualizar com segurança o campo automático, crie um SUMÁRIO MANUAL DIDÁTICO, mantendo EXATAMENTE a mesma lógica visual desta seção.

NO FALLBACK MANUAL:
* preserve marcadores, emojis, hierarquia, negrito e recuos;
* crie hiperlinks internos obrigatórios em todas as entradas do sumário, apontando para indicadores/âncoras dos cabeçalhos correspondentes;
* não invente números de página;
* não estime páginas;
* mantenha estilos estruturais nos títulos do corpo para que o Painel de Navegação do Word continue útil.

### HIPERLINKS OBRIGATÓRIOS

TODA ENTRADA DO SUMÁRIO — TÍTULOS DE NÍVEL 1, SUBTÓPICOS DE NÍVEL 2 E, QUANDO EXISTIREM, ITENS DE NÍVEL 3 — DEVE SER UM HIPERLINK INTERNO QUE LEVE AO CABEÇALHO CORRESPONDENTE NO CORPO DO DOCUMENTO.

* O HIPERLINK COBRE O TEXTO VISÍVEL DA ENTRADA, INCLUINDO EMOJI, MARCADOR E NUMERAÇÃO;
* NÃO DEIXE ENTRADAS SEM VÍNCULO NAVEGÁVEL;
* MANTENHA A APARÊNCIA DEFINIDA NESTE PROMPT: TEXTO PRETO #000000, NEGRITO FUNCIONAL E SEM SUBLINHADO AZUL PADRÃO DO WORD;
* NO SUMÁRIO AUTOMÁTICO, HABILITE OS HIPERLINKS DO CAMPO TOC;
* NO FALLBACK MANUAL, CRIE INDICADORES/ÂNCORAS NOS CABEÇALHOS DO CORPO E APONTE CADA ENTRADA PARA O SEU INDICADOR;
* SOMENTE SE A FERRAMENTA COMPROVADAMENTE NÃO SUPORTAR HIPERLINK INTERNO, REGISTRE ESSA LIMITAÇÃO DE FORMA EXPLÍCITA NA ENTREGA E PRESERVE OS ESTILOS ESTRUTURAIS DOS TÍTULOS PARA QUE O PAINEL DE NAVEGAÇÃO DO WORD CONTINUE FUNCIONANDO.

### IDENTIDADE VISUAL

O SUMÁRIO DEVE PARECER PARTE DO MESMO MATERIAL, E NÃO UM ANEXO PRODUZIDO POR OUTRA FERRAMENTA.

PRESERVE:
* fonte do módulo;
* texto preto #000000 quando essa for a regra do módulo;
* negritos funcionais;
* emojis e ícones nativos;
* espaçamento e hierarquia coerentes;
* densidade visual didática e profissional.

NÃO introduza nova paleta de cores.
NÃO use alinhamento justificado.
NÃO retire os elementos visuais didáticos dos títulos.
NÃO transforme o sumário em tabela sem que o próprio módulo use esse padrão.

O SUMÁRIO É PARTE OBRIGATÓRIA DO ARQUIVO WORD E DEVE FACILITAR A LOCALIZAÇÃO DE ASSUNTOS SEM PERDER A MESMA DIDÁTICA VISUAL DO RESUMO.
`;

  const BEIGE_SECTION = `

${BEIGE_MARKER}

ESTA É UMA ALTERAÇÃO EXCLUSIVAMENTE VISUAL. PRESERVE INTEGRALMENTE TODAS AS DEMAIS REGRAS, O CONTEÚDO, A ORDEM, A HIERARQUIA, A FONTE, O TAMANHO, OS ESPAÇAMENTOS, OS RECUOS, AS MARGENS, A PAGINAÇÃO, OS NEGRITOS, OS EMOJIS E AS FAIXAS JÁ DEFINIDAS NESTE PROMPT.

NO ARQUIVO WORD, REPRODUZA O SOMBREAMENTO DO DOCUMENTO-MODELO EXATAMENTE NOS MESMOS LOCAIS FUNCIONAIS:

* TOM EXATO DO SOMBREAMENTO: BEGE #EEECE1 (RGB 238, 236, 225);
* APLIQUE O BEGE SOMENTE AO TEXTO DO RÓTULO FUNCIONAL EM NEGRITO NO INÍCIO DA LINHA, ATÉ E INCLUINDO OS DOIS-PONTOS OU A PONTUAÇÃO QUE ENCERRA O RÓTULO;
* NÃO APLIQUE O BEGE AO EMOJI, ÍCONE, MARCADOR OU NUMERAÇÃO QUE ANTECEDE O RÓTULO;
* NÃO APLIQUE O BEGE À EXPLICAÇÃO QUE VEM DEPOIS DOS DOIS-PONTOS;
* O SOMBREAMENTO DEVE SER DE CARACTERE/RUN, E NÃO DO PARÁGRAFO INTEIRO;
* MANTENHA O TEXTO DO RÓTULO EM PRETO #000000 E EM NEGRITO REAL;
* APLIQUE A MESMA LÓGICA A TODOS OS RÓTULOS FUNCIONAIS EQUIVALENTES QUE O PRÓPRIO MÓDULO JÁ UTILIZE, SEM CRIAR NOVOS RÓTULOS APENAS PARA RECEBER SOMBREAMENTO.

EXEMPLOS DO PADRÃO VISUAL A REPRODUZIR:

1️⃣ **CONDUTA:** somente “CONDUTA:” recebe bege; “1️⃣” e a explicação permanecem sem bege.

5️⃣ **PENA:** somente “PENA:” recebe bege.

✅ **§ 1º — FORMA QUALIFICADA:** somente o texto “§ 1º — FORMA QUALIFICADA:” recebe bege; o emoji ✅ permanece sem bege.

⚖️ **JURISPRUDÊNCIA — TESE:** somente “JURISPRUDÊNCIA — TESE:” recebe bege; o emoji ⚖️ e o texto da tese permanecem sem bege.

⚠️ **PONTO DE PROVA:** somente “PONTO DE PROVA:” recebe bege.

🚫 **REVOGAÇÃO:** somente “REVOGAÇÃO:” recebe bege.

NÃO APLIQUE O SOMBREAMENTO BEGE A TÍTULOS, GRANDES EIXOS, CAPÍTULOS, SEÇÕES, CABEÇALHOS, ITENS DO SUMÁRIO, FAIXAS HORIZONTAIS OU TEXTO EXPLICATIVO CORRIDO, SALVO SE ALGUM DESSES TRECHOS FOR, PELA PRÓPRIA ESTRUTURA DO MÓDULO, UM RÓTULO FUNCIONAL EQUIVALENTE AOS EXEMPLOS ACIMA.

PRESERVE INTEGRALMENTE AS FAIXAS AZUL-CLARAS JÁ PREVISTAS NOS CABEÇALHOS. O BEGE #EEECE1 NÃO SUBSTITUI, NÃO RECOLORE E NÃO SE SOBREPÕE À FAIXA AZUL.

SE O PROMPT CONTIVER REGRA GERAL DIZENDO QUE AS ÚNICAS CORES PERMITIDAS SÃO AS DOS EMOJIS E DAS FAIXAS JÁ EXISTENTES, CONSIDERE O FUNDO BEGE #EEECE1 DOS RÓTULOS COMO A ÚNICA EXCEÇÃO ADICIONAL, EXCLUSIVAMENTE PARA ESTE SOMBREAMENTO. ESSA EXCEÇÃO NÃO AUTORIZA ALTERAR A COR DA FONTE NEM INTRODUZIR QUALQUER OUTRA COR.

QUANDO HOUVER EDIÇÃO DIRETA DO OOXML DO DOCX, APLIQUE AO(S) RUN(S) DO RÓTULO, E SOMENTE A ELES, SOMBREAMENTO EQUIVALENTE A <w:shd w:val="clear" w:fill="EEECE1"/>.

ANTES DA ENTREGA, CONFIRME VISUALMENTE QUE O BEGE APARECE SOMENTE ATRÁS DOS RÓTULOS FUNCIONAIS, COM O EMOJI/NUMERAÇÃO FORA DO SOMBREAMENTO E A EXPLICAÇÃO APÓS O RÓTULO TAMBÉM FORA DO SOMBREAMENTO.
`;

  const JURISPRUDENCE_CITATION_SECTION = `

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
`;

  function stripLegacySummary(prompt) {
    const text = String(prompt || "").trim();
    if (!text) return text;
    const legacyIndexes = [LEGACY_MARKER, SUMMARY_MARKER_V382]
      .map((marker) => text.indexOf(marker))
      .filter((index) => index >= 0);
    if (!legacyIndexes.length) return text;
    return text.slice(0, Math.min(...legacyIndexes)).trim();
  }

  function withSummary(prompt) {
    const raw = String(prompt || "").trim();
    if (!raw) return raw;
    if (raw.includes(SUMMARY_MARKER)) return raw;
    const base = stripLegacySummary(raw);
    return `${base}${SUMMARY_SECTION}`.trim();
  }

  function stripBeigeShading(prompt) {
    const text = String(prompt || "").trim();
    if (!text) return text;
    const markerIndex = text.indexOf(BEIGE_MARKER);
    if (markerIndex < 0) return text;
    return text.slice(0, markerIndex).trim();
  }

  function withBeigeShading(prompt) {
    const raw = String(prompt || "").trim();
    if (!raw) return raw;
    if (raw.includes(BEIGE_MARKER)) return raw;
    return `${raw}${BEIGE_SECTION}`.trim();
  }

  function stripJurisprudenceYear(prompt) {
    const text = String(prompt || "").trim();
    if (!text) return text;
    const markerIndex = text.indexOf(JURISPRUDENCE_YEAR_MARKER);
    if (markerIndex < 0) return text;
    return text.slice(0, markerIndex).trim();
  }

  function withJurisprudenceCitation(prompt) {
    const raw = String(prompt || "").trim();
    if (!raw) return raw;
    const base = stripJurisprudenceYear(raw);
    if (base.includes(JURISPRUDENCE_CITATION_MARKER)) return base;
    return `${base}${JURISPRUDENCE_CITATION_SECTION}`.trim();
  }

  function ensureIntegratedPromptReady() {
    try {
      const api = globalThis.__aldusFactoryResumoAulaJurisprudenciaV380;
      if (api && typeof api.install === "function") api.install();
    } catch {}
  }

  function patchPromptLibraries() {
    ensureIntegratedPromptReady();
    let changed = 0;

    try {
      TARGET_TYPES.forEach((type) => {
        const current = String(defaultFactoryPromptLibrary?.[type] || "").trim();
        if (!current) return;
        const next = withSummary(current);
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
          const next = withSummary(current);
          if (next !== current) changed += 1;
          state.factoryPromptLibrary[type] = next;
        });
        state.migrations[MIGRATION_ID] ||= new Date().toISOString();
      }
    } catch {}

    return changed;
  }

  function patchJurisprudenceYearScope() {
    let changed = 0;
    let stateChanged = false;

    try {
      if (defaultFactoryPromptLibrary && typeof defaultFactoryPromptLibrary === "object") {
        JURISPRUDENCE_YEAR_TARGET_TYPES.forEach((type) => {
          const current = String(defaultFactoryPromptLibrary[type] || "").trim();
          if (!current) return;
          const next = withJurisprudenceCitation(current);
          if (next !== current) changed += 1;
          defaultFactoryPromptLibrary[type] = next;
        });
      }
    } catch {}

    try {
      if (state && typeof state === "object") {
        state.factoryPromptLibrary ||= {};
        state.migrations ||= {};
        JURISPRUDENCE_YEAR_TARGET_TYPES.forEach((type) => {
          const current = String(state.factoryPromptLibrary[type] || "").trim();
          if (!current) return;
          const next = withJurisprudenceCitation(current);
          if (next !== current) {
            changed += 1;
            stateChanged = true;
            state.factoryPromptLibrary[type] = next;
          }
        });
        if (!state.migrations[JURISPRUDENCE_CITATION_MIGRATION_ID]) {
          state.migrations[JURISPRUDENCE_CITATION_MIGRATION_ID] = new Date().toISOString();
          stateChanged = true;
        }
        if (stateChanged && typeof saveData === "function") saveData();
      }
    } catch {}

    return changed;
  }

  function patchBeigeShadingScope() {
    let changed = 0;
    let stateChanged = false;

    try {
      if (defaultFactoryPromptLibrary && typeof defaultFactoryPromptLibrary === "object") {
        Object.keys(defaultFactoryPromptLibrary).forEach((type) => {
          const current = defaultFactoryPromptLibrary[type];
          if (typeof current !== "string" || !current.trim()) return;
          const next = BEIGE_TARGET_SET.has(type)
            ? withBeigeShading(current)
            : stripBeigeShading(current);
          if (next !== current) changed += 1;
          defaultFactoryPromptLibrary[type] = next;
        });
      }
    } catch {}

    try {
      if (state && typeof state === "object") {
        state.factoryPromptLibrary ||= {};
        state.migrations ||= {};
        Object.keys(state.factoryPromptLibrary).forEach((type) => {
          const current = state.factoryPromptLibrary[type];
          if (typeof current !== "string" || !current.trim()) return;
          const next = BEIGE_TARGET_SET.has(type)
            ? withBeigeShading(current)
            : stripBeigeShading(current);
          if (next !== current) {
            changed += 1;
            stateChanged = true;
            state.factoryPromptLibrary[type] = next;
          }
        });
        if (!state.migrations[BEIGE_MIGRATION_ID]) {
          state.migrations[BEIGE_MIGRATION_ID] = new Date().toISOString();
          stateChanged = true;
        }
        if (stateChanged && typeof saveData === "function") saveData();
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
        const summarized = TARGET_SET.has(type) ? withSummary(prompt) : prompt;
        if (typeof summarized !== "string") return summarized;
        const jurisprudenceYear = JURISPRUDENCE_YEAR_TARGET_SET.has(type)
          ? withJurisprudenceCitation(summarized)
          : summarized;
        return BEIGE_TARGET_SET.has(type)
          ? withBeigeShading(jurisprudenceYear)
          : stripBeigeShading(jurisprudenceYear);
      };
      Object.defineProperty(wrapped, WRAP_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, "__aldusFactorySummaryTocOriginal", { value: previous });
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
  }

  function install() {
    const changed = patchPromptLibraries();
    const citationChanged = patchJurisprudenceYearScope();
    const beigeChanged = patchBeigeShadingScope();
    const wrapped = wrapFactoryPromptBase();
    if (!wrapped) return { installed: false, changed, citationChanged, beigeChanged, wrapped };

    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset[INSTALL_FLAG] = "true";
    }
    refreshFactoryUi();
    return { installed: true, changed, citationChanged, beigeChanged, wrapped };
  }

  const api = Object.freeze({
    version: VERSION,
    targetTypes: TARGET_TYPES,
    beigeTargetTypes: BEIGE_TARGET_TYPES,
    summaryMarker: SUMMARY_MARKER,
    legacySummaryMarkerV382: SUMMARY_MARKER_V382,
    beigeMarker: BEIGE_MARKER,
    jurisprudenceCitationMarker: JURISPRUDENCE_CITATION_MARKER,
    jurisprudenceCitationMigrationId: JURISPRUDENCE_CITATION_MIGRATION_ID,
    stripLegacySummary,
    withSummary,
    stripJurisprudenceYear,
    withJurisprudenceCitation,
    patchJurisprudenceYearScope,
    stripBeigeShading,
    withBeigeShading,
    install
  });

  globalThis[API_MARKER] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", install, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", install, { once: true });
    window.addEventListener("load", install, { once: true });
    [250, 1000, 3000].forEach((delay) => setTimeout(install, delay));
  }
})();