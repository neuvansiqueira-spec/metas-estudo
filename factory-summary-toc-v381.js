(() => {
  "use strict";

  const VERSION = "20260824-factory-summary-toc-v382";
  const API_MARKER = "__aldusFactorySummaryTocV382";
  const WRAP_MARKER = "__aldusFactorySummaryTocWrappedV382";
  const INSTALL_FLAG = "aldusFactorySummaryTocV382";
  const MIGRATION_ID = "factorySummaryTocV382";
  const TARGET_TYPES = Object.freeze([
    "resumoAula",
    "jurisprudencia",
    "peca",
    "resumoAulaJurisprudencia"
  ]);
  const TARGET_SET = new Set(TARGET_TYPES);
  const LEGACY_MARKER = "## SUMÁRIO OBRIGATÓRIO DO DOCUMENTO — V381";
  const SUMMARY_MARKER = "## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V382";

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
* habilite hiperlinks internos quando tecnicamente suportado;
* atualize o campo do sumário depois da paginação final quando a ferramenta permitir.

NÃO aceite como resultado final um sumário automático com aparência padrão genérica do Word se a ferramenta permitir personalização dos estilos TOC.

### FALLBACK MANUAL

SE a ferramenta não conseguir criar ou atualizar com segurança o campo automático, crie um SUMÁRIO MANUAL DIDÁTICO, mantendo EXATAMENTE a mesma lógica visual desta seção.

NO FALLBACK MANUAL:
* preserve marcadores, emojis, hierarquia, negrito e recuos;
* use hiperlinks internos quando puder criá-los corretamente;
* não invente números de página;
* não estime páginas;
* mantenha estilos estruturais nos títulos do corpo para que o Painel de Navegação do Word continue útil.

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

  function stripLegacySummary(prompt) {
    const text = String(prompt || "").trim();
    if (!text) return text;
    const legacyIndex = text.indexOf(LEGACY_MARKER);
    if (legacyIndex < 0) return text;
    return text.slice(0, legacyIndex).trim();
  }

  function withSummary(prompt) {
    const raw = String(prompt || "").trim();
    if (!raw) return raw;
    if (raw.includes(SUMMARY_MARKER)) return raw;
    const base = stripLegacySummary(raw);
    return `${base}${SUMMARY_SECTION}`.trim();
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

  function wrapFactoryPromptBase() {
    try {
      if (typeof factoryPromptBase !== "function") return false;
      if (factoryPromptBase?.[WRAP_MARKER] === VERSION) return true;
      const previous = factoryPromptBase;
      const wrapped = function(type) {
        const prompt = previous(type);
        return TARGET_SET.has(type) ? withSummary(prompt) : prompt;
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
    summaryMarker: SUMMARY_MARKER,
    stripLegacySummary,
    withSummary,
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
