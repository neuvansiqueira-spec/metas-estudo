(() => {
  "use strict";

  const VERSION = "20260824-factory-resumo-aula-jurisprudencia-v380";
  const TYPE_KEY = "resumoAulaJurisprudencia";
  const TYPE_LABEL = "Gerar prompt Resumo/Aula + Jurisprudência";
  const MIGRATION_ID = "factoryResumoAulaJurisprudenciaV380";
  const SOURCE_FOLDER = "https://drive.google.com/drive/folders/1ECc_otgQKwH7WfPdQr8CtD0kB07pz9Xe";
  const PRIORITY_FOLDERS = ["JULGADOS STF RESUMIDOS", "JULGADOS STJ RESUMIDOS"];
  const API_MARKER = "__aldusFactoryResumoAulaJurisprudenciaV380";
  const INSTALL_FLAG = "aldusFactoryResumoAulaJurisprudenciaV380";

  const INTEGRATION_SECTION = `

==============================
MÓDULO INTEGRADO — RESUMO/AULA + JURISPRUDÊNCIA
==============================

OBJETIVO DESTE MODO:
Produzir UM ÚNICO RESUMO DIDÁTICO de excelente qualidade, mantendo a arquitetura, a profundidade, a hierarquia e a identidade visual do MÓDULO RESUMO/AULA, mas enriquecendo cada instituto com a jurisprudência diretamente pertinente ao ponto estudado.

ESTE MODO NÃO É PEÇA.
Não transforme o tema em peça prática, despacho, representação, relatório, auto, manifestação ou modelo profissional. Se o tema pertencer ao módulo PEÇA, este modo não deve ser usado como substituto do respectivo prompt de PEÇA.

REGRA ESTRUTURAL PRINCIPAL:
A jurisprudência deve aparecer prioritariamente JUNTO DO ASSUNTO MATERIAL AO QUAL PERTENCE, imediatamente após a explicação teórica relevante, e não concentrada apenas ao final do documento.

Exemplo de integração:

▶️📚 **[INSTITUTO OU RECORTE EM MAIÚSCULAS]:**

1️⃣ **REGRA:** [explicação teórica].

✳️ **EXCEÇÃO:** [se houver].

⚖️ **JURISPRUDÊNCIA — TESE:** [entendimento diretamente relacionado ao ponto].

📌 **PROVA:** [consequência objetiva e útil para revisão, quando pertinente].

A linha de jurisprudência deve ser inserida somente quando houver relação material direta com o instituto explicado. Não use julgados apenas porque pertencem à mesma disciplina ou ao mesmo tema amplo.

RÓTULOS JURISPRUDENCIAIS POSSÍVEIS, CONFORME O CONTEÚDO REAL DA FONTE:
* ⚖️ **JURISPRUDÊNCIA — TESE:**
* ⚖️ **JURISPRUDÊNCIA — REGRA:**
* ⚖️ **JURISPRUDÊNCIA — EXCEÇÃO:**
* ⚖️ **JURISPRUDÊNCIA — DISTINÇÃO:**
* ⚖️ **JURISPRUDÊNCIA — EVOLUÇÃO:** somente quando a evolução estiver efetivamente demonstrada pelas fontes.

NÃO CRIE BLOCO JURISPRUDENCIAL ORNAMENTAL.
NÃO FORCE jurisprudência em todo subtópico.
NÃO DUPLIQUE o mesmo entendimento em vários pontos do resumo quando uma única inserção contextual for suficiente.

==============================
FONTE EXCLUSIVA PARA A CAMADA DE JURISPRUDÊNCIA
==============================

Para a parte jurisprudencial deste módulo, use EXCLUSIVAMENTE a pasta:
${SOURCE_FOLDER}

e todas as suas subpastas efetivamente acessíveis e legíveis.

A fonte geral indicada no contexto do projeto continua sendo usada para a camada RESUMO/AULA, conforme a triagem e as regras do prompt-base. A pasta acima é adicional e exclusiva da CAMADA DE JURISPRUDÊNCIA.

NÃO use internet, memória do modelo, outros diretórios, outras pastas não fornecidas ou conteúdo externo para completar jurisprudência.

A busca jurisprudencial é independente da classificação da triagem geral: percorra recursivamente a pasta jurisprudencial e suas subpastas, respeitando sempre DISCIPLINA, TEMA e eventual RECORTE informado.

PRIORIZE inicialmente as subpastas:
1. “${PRIORITY_FOLDERS[0]}”;
2. “${PRIORITY_FOLDERS[1]}”.

Depois, examine também as demais subpastas e arquivos jurisprudenciais pertinentes.

METODOLOGIA OBRIGATÓRIA DE BUSCA:
* faça inventário interno dos arquivos candidatos;
* pesquise o tema literal;
* pesquise sinônimos, abreviações, variações terminológicas e institutos jurídicos diretamente relacionados;
* abra e leia o conteúdo efetivo dos arquivos candidatos — não decida apenas pelo nome do arquivo;
* procure julgados, súmulas, temas, repetitivos, informativos e teses diretamente relacionados;
* inclua todos os entendimentos materialmente relevantes, sem estabelecer quantidade máxima arbitrária;
* elimine somente repetições reais do mesmo entendimento;
* preserve decisões distintas que acrescentem regra, requisito, condição, exceção, distinção ou evolução;
* se a primeira busca parecer escassa, repita com variações terminológicas antes de concluir pela ausência de jurisprudência.

Não confunda ausência de número de informativo, súmula ou tema com ausência de jurisprudência.

Somente declare que não foi localizada jurisprudência diretamente relevante depois da varredura recursiva completa e da leitura dos candidatos acessíveis.

Se houver arquivo candidato inacessível, ilegível ou não examinável, informe objetivamente que a verificação jurisprudencial ficou incompleta. Não invente o conteúdo faltante.

FIDELIDADE:
* não invente número de processo, súmula, tema, repetitivo, informativo, órgão julgador, data, relator ou tese;
* quando a fonte não trouxer determinado identificador com segurança, não o complete por memória;
* diferencie tese firmada, aplicação concreta, ressalva, distinção e evolução somente quando as fontes permitirem essa conclusão;
* preserve divergências relevantes existentes nas fontes, sem produzir falsa uniformidade.

==============================
QUADRO FINAL DE JURISPRUDÊNCIA
==============================

Ao final do documento, depois do desenvolvimento didático completo, crie:

♦️ **⚖️ QUADRO FINAL DE JURISPRUDÊNCIA**

Esse quadro serve exclusivamente para REVISÃO RÁPIDA.

Reúna nele, de forma concisa, as teses jurisprudenciais essenciais que já foram contextualizadas ao longo do resumo.

Para cada item, indique apenas o necessário para revisão, preferencialmente:
* instituto/assunto;
* tribunal, quando identificado com segurança na fonte;
* tese essencial em uma ou duas linhas;
* identificação do precedente/súmula/tema apenas quando constar de forma segura na fonte.

NÃO reproduza integralmente os blocos jurisprudenciais anteriores.
NÃO crie uma segunda aula no final.
NÃO acrescente ao quadro entendimento que não tenha relação direta com o tema trabalhado.

Se nenhuma jurisprudência diretamente relevante for localizada após a busca completa, não invente nem force o quadro com conteúdo genérico; registre apenas, de modo objetivo, a ausência de material jurisprudencial diretamente pertinente nas fontes examinadas.

==============================
PADRÃO VISUAL DO MÓDULO INTEGRADO
==============================

MANTENHA integralmente a formatação do RESUMO/AULA definida no prompt-base.

As linhas ⚖️ JURISPRUDÊNCIA devem usar texto preto #000000 e negrito real apenas no ícone/rótulo funcional, sem criar nova paleta de cores.

A faixa azul-clara permanece EXCLUSIVA dos cabeçalhos ▶️📚, exatamente como no RESUMO/AULA.

O título ♦️ ⚖️ QUADRO FINAL DE JURISPRUDÊNCIA segue o padrão visual dos demais grandes eixos ♦️ e NÃO recebe faixa azul-clara.

A integração jurisprudencial deve enriquecer a aula sem quebrar seu fluxo didático, sem duplicações e sem transformar o documento em uma simples colagem de dois módulos separados.
`;

  function currentResumoAulaPrompt() {
    try {
      const configured = String(state?.factoryPromptLibrary?.resumoAula || "").trim();
      if (configured) return configured;
    } catch {}
    try {
      const canonical = String(defaultFactoryPromptLibrary?.resumoAula || "").trim();
      if (canonical) return canonical;
    } catch {}
    try {
      const fallback = String(factoryPromptBase?.("resumoAula") || "").trim();
      if (fallback) return fallback;
    } catch {}
    return "";
  }

  function buildPrompt(basePrompt = currentResumoAulaPrompt()) {
    const base = String(basePrompt || "").trim();
    if (!base) return "";
    let emojiFont = "";
    try {
      emojiFont = String(FACTORY_DOCX_EMOJI_FONT_INSTRUCTIONS || "").trim();
    } catch {}
    return `${base}${INTEGRATION_SECTION}${emojiFont ? `\n\n${emojiFont}` : ""}`.trim();
  }

  function ensurePromptType() {
    try {
      if (!Array.isArray(FACTORY_PROMPT_TYPES)) return false;
      const existing = FACTORY_PROMPT_TYPES.find((entry) => entry?.key === TYPE_KEY);
      if (existing) {
        existing.label = TYPE_LABEL;
        return true;
      }
      const resumoIndex = FACTORY_PROMPT_TYPES.findIndex((entry) => entry?.key === "resumoAula");
      FACTORY_PROMPT_TYPES.splice(resumoIndex >= 0 ? resumoIndex + 1 : FACTORY_PROMPT_TYPES.length, 0, {
        key: TYPE_KEY,
        label: TYPE_LABEL
      });
      return true;
    } catch {
      return false;
    }
  }

  function ensurePromptLibrary() {
    const prompt = buildPrompt();
    if (!prompt) return { installed: false, changed: false, reason: "resumo-aula-unavailable" };

    try {
      defaultFactoryPromptLibrary[TYPE_KEY] = prompt;
    } catch {
      return { installed: false, changed: false, reason: "default-library-unavailable" };
    }

    try {
      if (!state || typeof state !== "object") return { installed: false, changed: false, reason: "state-unavailable" };
      state.factoryPromptLibrary ||= {};
      state.migrations ||= {};
      const alreadyMigrated = Boolean(state.migrations[MIGRATION_ID]);
      const hasPrompt = Boolean(String(state.factoryPromptLibrary[TYPE_KEY] || "").trim());
      const changed = !alreadyMigrated || !hasPrompt;
      if (!hasPrompt) state.factoryPromptLibrary[TYPE_KEY] = prompt;
      if (!alreadyMigrated) state.migrations[MIGRATION_ID] = new Date().toISOString();
      return { installed: true, changed };
    } catch {
      return { installed: false, changed: false, reason: "state-write-failed" };
    }
  }

  function installRouter() {
    try {
      if (typeof factoryRouterText !== "function") return false;
      if (factoryRouterText?.[API_MARKER] === VERSION) return true;
      const previous = factoryRouterText;
      const wrapped = function(type, item = {}) {
        if (type !== TYPE_KEY) return previous(type, item);
        const resumoRouter = String(previous("resumoAula", item) || "");
        const moduleIndex = resumoRouter.indexOf("\nMÓDULO:");
        const common = moduleIndex >= 0 ? resumoRouter.slice(0, moduleIndex).trimEnd() : resumoRouter.trimEnd();
        return `${common}\n\nMÓDULO: RESUMO/AULA + JURISPRUDÊNCIA. Produza um único módulo integrado: a camada didática usa as fontes classificadas como RESUMO/AULA na triagem; a camada jurisprudencial usa exclusivamente a pasta jurisprudencial especificada no prompt completo. Não gere LEI, PEÇA ou CONSOLIDAÇÃO FINAL nesta etapa. A jurisprudência deve ser inserida junto do assunto correspondente e consolidada, sem repetição integral, em um quadro final de revisão.\n\nENTREGA OBRIGATÓRIA DESTA ETAPA:\n- gerar somente o MÓDULO RESUMO/AULA + JURISPRUDÊNCIA;\n- gerar um arquivo Word editável contendo o módulo integrado;\n- manter a formatação canônica do RESUMO/AULA;\n- não gerar ainda o Word final consolidado;\n- salvar no Drive apenas quando a pasta de destino estiver preenchida e a ação de upload for efetivamente concluída.`;
      };
      Object.defineProperty(wrapped, API_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, "__aldusFactoryResumoAulaJurisprudenciaOriginal", { value: previous });
      factoryRouterText = wrapped;
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
    if (typeof document !== "undefined" && document.documentElement?.dataset?.[INSTALL_FLAG] === "true") {
      return { installed: true, repeated: true };
    }
    const promptType = ensurePromptType();
    const library = ensurePromptLibrary();
    const router = installRouter();
    if (!promptType || !library.installed || !router) {
      return { installed: false, promptType, library, router };
    }
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset[INSTALL_FLAG] = "true";
    }
    refreshFactoryUi();
    return { installed: true, changed: library.changed };
  }

  function installWhenApplicationIsReady() {
    const report = install();
    if (!report.installed) return report;
    return report;
  }

  const api = Object.freeze({
    version: VERSION,
    typeKey: TYPE_KEY,
    sourceFolder: SOURCE_FOLDER,
    priorityFolders: Object.freeze([...PRIORITY_FOLDERS]),
    buildPrompt,
    install
  });

  globalThis[API_MARKER] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", installWhenApplicationIsReady, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", installWhenApplicationIsReady, { once: true });
    window.addEventListener("load", installWhenApplicationIsReady, { once: true });
  }
})();
