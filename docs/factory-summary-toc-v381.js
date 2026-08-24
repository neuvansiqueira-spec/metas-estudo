(() => {
  "use strict";

  const VERSION = "20260824-factory-summary-toc-v381";
  const API_MARKER = "__aldusFactorySummaryTocV381";
  const WRAP_MARKER = "__aldusFactorySummaryTocWrappedV381";
  const INSTALL_FLAG = "aldusFactorySummaryTocV381";
  const MIGRATION_ID = "factorySummaryTocV381";
  const TARGET_TYPES = Object.freeze([
    "resumoAula",
    "jurisprudencia",
    "peca",
    "resumoAulaJurisprudencia"
  ]);
  const TARGET_SET = new Set(TARGET_TYPES);
  const SUMMARY_MARKER = "## SUMÁRIO OBRIGATÓRIO DO DOCUMENTO — V381";

  const SUMMARY_SECTION = `

${SUMMARY_MARKER}

TODO DOCUMENTO WORD GERADO POR ESTE MÓDULO DEVE CONTER UM SUMÁRIO NO INÍCIO, APÓS O TÍTULO/IDENTIFICAÇÃO INICIAL E ANTES DO DESENVOLVIMENTO MATERIAL DO CONTEÚDO.

OBJETIVO DO SUMÁRIO:
facilitar a localização rápida de assunto, instituto, seção ou subtema específico dentro do tema estudado, tanto pela leitura do próprio sumário quanto pelo Painel de Navegação do Word.

REGRA PREFERENCIAL — SUMÁRIO AUTOMÁTICO DO WORD:
* quando a ferramenta de geração de DOCX suportar campos de sumário, crie um SUMÁRIO AUTOMÁTICO REAL DO WORD;
* o sumário deve ser baseado em estilos estruturais de título do Word, com hierarquia coerente entre níveis;
* habilite navegação clicável/hiperlinks internos quando tecnicamente suportado;
* inclua números de página quando o DOCX puder calculá-los com segurança;
* depois da paginação final, atualize o campo do sumário quando a ferramenta utilizada permitir essa operação.

ESTILOS E NAVEGAÇÃO:
* aplique estilos estruturais equivalentes a Título 1, Título 2 e, apenas quando necessário, Título 3 aos cabeçalhos que realmente representam níveis do documento;
* preserve integralmente a aparência visual já exigida pelo módulo; o uso de estilos estruturais não autoriza mudar fonte, cor, negrito, faixa, emoji, espaçamento ou identidade visual definida no respectivo prompt;
* os títulos estruturais devem permitir que o usuário navegue pelo Painel de Navegação do Word até os principais assuntos do documento;
* não transforme linhas internas como REGRA, EXCEÇÃO, PRAZO, COMPETÊNCIA, TESE, PROVA ou itens de enumeração em entradas autônomas do sumário, salvo quando funcionarem efetivamente como seção estrutural independente.

CONTEÚDO DO SUMÁRIO:
* inclua todos os grandes eixos e seções relevantes do documento;
* inclua os subtópicos necessários para localizar rapidamente um assunto específico;
* mantenha a mesma ordem em que os assuntos aparecem no corpo do documento;
* não crie entrada de sumário para conteúdo inexistente;
* não omita seção materialmente relevante apenas para deixar o sumário menor;
* evite granularidade excessiva que transforme o sumário em repetição do documento inteiro.

APLICAÇÃO CONFORME O MÓDULO:
* RESUMO/AULA: indexe os grandes eixos ♦️ e os institutos/subtópicos ▶️📚 que tenham utilidade real de navegação;
* JURISPRUDÊNCIA: indexe os grandes eixos, institutos e agrupamentos jurisprudenciais relevantes, sem criar uma entrada para cada linha de tese quando isso prejudicar a leitura;
* PEÇA: indexe as grandes seções e subdivisões efetivamente existentes no material da peça, respeitando a arquitetura própria do modelo e sem converter a peça em aula;
* RESUMO/AULA + JURISPRUDÊNCIA: indexe a estrutura didática do RESUMO/AULA e inclua também o QUADRO FINAL DE JURISPRUDÊNCIA como seção do sumário.

FALLBACK OBRIGATÓRIO:
se a ferramenta utilizada não conseguir criar ou atualizar com segurança um campo automático de sumário, crie um SUMÁRIO ESTRUTURADO MANUAL no início do documento, reproduzindo fielmente a hierarquia real dos títulos.

NO FALLBACK MANUAL:
* mantenha a hierarquia visual dos níveis;
* use hiperlinks internos somente se a ferramenta conseguir criá-los corretamente;
* NÃO invente números de página;
* NÃO estime páginas;
* NÃO escreva números de página que não tenham sido confirmados após a paginação final;
* mantenha os estilos estruturais dos títulos do corpo para que o Painel de Navegação do Word continue útil.

PADRÃO VISUAL DO SUMÁRIO:
* respeite a mesma fonte, cor e identidade visual geral exigidas pelo módulo correspondente;
* use texto preto #000000 quando o módulo adotar texto preto como padrão;
* mantenha visual limpo, compacto e profissional;
* não introduza nova paleta de cores nem elementos decorativos que concorram com o conteúdo jurídico.

O SUMÁRIO É PARTE OBRIGATÓRIA DO ARQUIVO WORD FINAL DESTE MÓDULO E NÃO DEVE SER OMITIDO MESMO EM DOCUMENTOS CURTOS, DESDE QUE HAJA MAIS DE UMA SEÇÃO ESTRUTURAL RELEVANTE.
`;

  function withSummary(prompt) {
    const text = String(prompt || "").trim();
    if (!text) return text;
    if (text.includes(SUMMARY_MARKER)) return text;
    return `${text}${SUMMARY_SECTION}`.trim();
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
