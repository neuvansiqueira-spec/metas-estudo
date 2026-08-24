(() => {
  "use strict";

  const VERSION = "20260824-factory-lei-jurisprudencia-v383";
  const TYPE_KEY = "leiJurisprudencia";
  const TYPE_LABEL = "Gerar prompt Lei + Jurisprudência";
  const MIGRATION_ID = "factoryLeiJurisprudenciaV383";
  const SOURCE_FOLDER = "https://drive.google.com/drive/folders/1ECc_otgQKwH7WfPdQr8CtD0kB07pz9Xe";
  const PRIORITY_FOLDERS = ["JULGADOS STF RESUMIDOS", "JULGADOS STJ RESUMIDOS"];
  const API_MARKER = "__aldusFactoryLeiJurisprudenciaV383";
  const INSTALL_FLAG = "aldusFactoryLeiJurisprudenciaV383";

  const BASE_REPLACEMENTS = Object.freeze([
    [
      "PRODUZA SOMENTE O MÓDULO LEI.",
      "PRODUZA SOMENTE O MÓDULO INTEGRADO LEI + JURISPRUDÊNCIA."
    ],
    [
      "NÃO USE DOUTRINA, JURISPRUDÊNCIA, RESUMO/AULA, PEÇA, COMENTÁRIO DE AUTOR, EXEMPLO INVENTADO OU CONHECIMENTO EXTERNO PARA COMPLETAR O CONTEÚDO.",
      "NÃO USE DOUTRINA, RESUMO/AULA, PEÇA, COMENTÁRIO DE AUTOR, EXEMPLO INVENTADO OU CONHECIMENTO EXTERNO PARA COMPLETAR O CONTEÚDO. A JURISPRUDÊNCIA É ADMITIDA EXCLUSIVAMENTE COMO CAMADA INTEGRADA, NOS LIMITES E NAS FONTES DEFINIDOS NESTE PROMPT."
    ],
    [
      "NÃO PESQUISE AUTOMATICAMENTE DECRETOS, PORTARIAS, RESOLUÇÕES, INSTRUÇÕES NORMATIVAS, JURISPRUDÊNCIA OU OUTRAS LEIS. ESSES CONTEÚDOS SOMENTE ENTRAM QUANDO FOREM FORNECIDOS OU EXPRESSAMENTE AUTORIZADOS COMO ATUALIZAÇÃO/COMPLEMENTO.",
      "NÃO PESQUISE AUTOMATICAMENTE DECRETOS, PORTARIAS, RESOLUÇÕES, INSTRUÇÕES NORMATIVAS OU OUTRAS LEIS. ESSES CONTEÚDOS SOMENTE ENTRAM QUANDO FOREM FORNECIDOS OU EXPRESSAMENTE AUTORIZADOS COMO ATUALIZAÇÃO/COMPLEMENTO. A CAMADA DE JURISPRUDÊNCIA É A ÚNICA EXCEÇÃO E DEVE USAR EXCLUSIVAMENTE A PASTA JURISPRUDENCIAL DEFINIDA NESTE PROMPT."
    ],
    [
      "GERE UM .DOCX EDITÁVEL EXCLUSIVO DO MÓDULO LEI. NÃO CONSOLIDE COM RESUMO/AULA, JURISPRUDÊNCIA OU PEÇA.",
      "GERE UM .DOCX EDITÁVEL EXCLUSIVO DO MÓDULO INTEGRADO LEI + JURISPRUDÊNCIA. NÃO CONSOLIDE COM RESUMO/AULA OU PEÇA E NÃO GERE UM SEGUNDO MÓDULO AUTÔNOMO DE JURISPRUDÊNCIA."
    ],
    [
      "NOME: RESUMO_TOPIFICADO_LEI_[NÚMERO]_[FILTRO].docx",
      "NOME: RESUMO_TOPIFICADO_LEI_JURISPRUDENCIA_[NÚMERO]_[FILTRO].docx"
    ]
  ]);

  const INTEGRATION_SECTION = `

==============================
MÓDULO INTEGRADO — LEI + JURISPRUDÊNCIA
==============================

OBJETIVO DESTE MODO:
Produzir UM ÚNICO MATERIAL DE ESTUDO no qual a LEI permanece como estrutura-mãe e cada entendimento jurisprudencial diretamente pertinente é inserido junto do dispositivo legal que interpreta, delimita, excepciona ou concretiza.

A arquitetura formal do diploma continua obrigatória:
TÍTULO → CAPÍTULO → SEÇÃO → SUBSEÇÃO → ARTIGO → PARÁGRAFOS/INCISOS/ALÍNEAS RELEVANTES.

CADA ARTIGO CONTINUA SENDO A UNIDADE CENTRAL OBRIGATÓRIA.

ESTE MODO NÃO É PEÇA.
Não transforme o tema em representação, despacho, relatório, auto, requerimento, manifestação, modelo profissional ou qualquer outra peça prática.
Se o tema estiver classificado na organização da Fábrica como PEÇA, interrompa este modo e indique o uso do prompt próprio de PEÇA. A mera existência de artigos de lei relacionados ao assunto NÃO autoriza converter um tema de PEÇA em LEI + JURISPRUDÊNCIA.

NÃO PRODUZA RESUMO/AULA.
NÃO CRIE DOUTRINA PARA EXPLICAR O DISPOSITIVO.
NÃO GERE UM MÓDULO DE JURISPRUDÊNCIA SEPARADO.
NÃO GERE CONSOLIDAÇÃO FINAL NESTA ETAPA.

==============================
REGRA DE INTEGRAÇÃO POR DISPOSITIVO
==============================

A JURISPRUDÊNCIA DEVE APARECER PRIORITARIAMENTE JUNTO DO ARTIGO, PARÁGRAFO, INCISO OU BLOCO NORMATIVO AO QUAL MATERIALMENTE PERTENCE.

A ordem preferencial dentro de um artigo é:

✅ **ART. [NÚMERO]: [SÍNTESE FUNCIONAL].**

1️⃣ **[PALAVRA-NÚCLEO]:** [relação jurídica extraída do texto vigente].

🏛️ **COMPETÊNCIA:** [quando houver].

⏱️ **PRAZO:** [quando houver].

✳️ **EXCEÇÃO:** [quando houver].

⚖️ **JURISPRUDÊNCIA — TESE:** [entendimento diretamente relacionado ao dispositivo].

⚖️ **JURISPRUDÊNCIA — DISTINÇÃO:** [quando a fonte demonstrar distinção relevante].

⚠️ **PONTO DE PROVA:** [síntese objetiva da relação entre a regra legal e o entendimento jurisprudencial, quando isso trouxer utilidade real].

Quando houver jurisprudência pertinente, insira-a DEPOIS da topificação normativa do dispositivo e ANTES do PONTO DE PROVA final daquele artigo, para que o PONTO DE PROVA possa sintetizar corretamente a interação entre texto legal e interpretação judicial.

RÓTULOS JURISPRUDENCIAIS POSSÍVEIS, CONFORME A FONTE:
* ⚖️ **JURISPRUDÊNCIA — TESE:**
* ⚖️ **JURISPRUDÊNCIA — REGRA:**
* ⚖️ **JURISPRUDÊNCIA — EXCEÇÃO:**
* ⚖️ **JURISPRUDÊNCIA — DISTINÇÃO:**
* ⚖️ **JURISPRUDÊNCIA — EVOLUÇÃO:** somente quando a evolução estiver efetivamente demonstrada.

NÃO force jurisprudência em todo artigo.
NÃO use julgado apenas porque pertence à mesma disciplina ou ao mesmo diploma.
NÃO desloque uma tese para artigo com o qual ela não tenha vínculo material direto.
NÃO repita o mesmo entendimento em vários artigos quando uma única inserção contextual for suficiente.
Se um precedente interpretar conjuntamente vários dispositivos, posicione-o no ponto normativo em que a compreensão ficar mais clara e faça remissão curta aos demais, sem duplicar o bloco integral.

==============================
FONTES: LEI E JURISPRUDÊNCIA
==============================

CAMADA LEI:
mantenha integralmente as regras do prompt-base para identificação do diploma, recorte autorizado, texto oficial vigente, atualização normativa, vetos, revogações, vigência e fonte oficial.

CAMADA JURISPRUDÊNCIA:
use EXCLUSIVAMENTE a pasta jurisprudencial:
${SOURCE_FOLDER}

e todas as suas subpastas efetivamente acessíveis e legíveis.

NÃO use internet, memória do modelo, outras pastas, outros diretórios ou conteúdo externo para completar a camada jurisprudencial.

A busca jurisprudencial é independente da triagem da pasta geral, mas deve respeitar a DISCIPLINA, o DIPLOMA, o TEMA e o RECORTE efetivamente autorizados.

PRIORIZE inicialmente:
1. “${PRIORITY_FOLDERS[0]}”;
2. “${PRIORITY_FOLDERS[1]}”.

Depois examine as demais subpastas jurisprudenciais pertinentes.

METODOLOGIA OBRIGATÓRIA:
* percorra recursivamente a pasta jurisprudencial e suas subpastas;
* faça inventário interno dos arquivos candidatos;
* pesquise número e nome do diploma, artigo/dispositivo, tema literal e institutos jurídicos diretamente relacionados;
* use sinônimos, siglas, abreviações e variações terminológicas relevantes;
* abra e leia o conteúdo efetivo dos arquivos candidatos — não decida somente pelo nome do arquivo;
* procure julgados, súmulas, temas, repetitivos, informativos e teses;
* inclua todos os entendimentos materialmente relevantes ao recorte, sem quantidade máxima arbitrária;
* elimine somente repetições reais do mesmo entendimento;
* preserve decisões distintas que acrescentem requisito, condição, exceção, distinção, limitação ou evolução;
* se a busca parecer escassa, repita-a com variações terminológicas e referências aos dispositivos antes de concluir pela ausência de jurisprudência.

Não confunda ausência de informativo, súmula ou tema numerado com ausência de jurisprudência.

Somente declare ausência de jurisprudência diretamente relevante depois da varredura recursiva completa e da leitura dos candidatos acessíveis.

Se algum arquivo candidato estiver inacessível ou ilegível, informe objetivamente que a verificação jurisprudencial ficou incompleta. Não invente o conteúdo faltante.

FIDELIDADE JURISPRUDENCIAL:
* não invente número de processo, súmula, tema, repetitivo, informativo, órgão julgador, data, relator ou tese;
* não complete identificadores por memória;
* diferencie tese, aplicação concreta, ressalva, distinção e evolução somente quando a fonte permitir;
* preserve divergências relevantes demonstradas nas fontes;
* não apresente como interpretação de determinado artigo uma decisão que apenas mencione o diploma de forma periférica.

==============================
RELAÇÃO ENTRE TEXTO LEGAL E JURISPRUDÊNCIA
==============================

A camada jurisprudencial NÃO pode alterar a redação oficial nem ser apresentada como se fosse texto de lei.

MANTENHA VISUAL E SEMANTICAMENTE DISTINTOS:
* aquilo que decorre do texto oficial vigente;
* aquilo que decorre da interpretação jurisprudencial.

Quando a jurisprudência:
* restringir uma leitura literal;
* fixar requisito adicional interpretativo;
* afastar aplicação em determinada hipótese;
* declarar inconstitucionalidade;
* estabelecer interpretação conforme;
* modular efeitos;
* distinguir situações;
* superar entendimento anterior;

registre isso com precisão e somente se a fonte efetivamente demonstrar.

NÃO reescreva o artigo para incorporar silenciosamente a tese judicial.
Primeiro apresente a lei topificada; depois apresente a jurisprudência correspondente.

==============================
QUADRO FINAL DE JURISPRUDÊNCIA
==============================

Ao final do documento, depois do último dispositivo trabalhado, crie:

♦️ **⚖️ QUADRO FINAL DE JURISPRUDÊNCIA**

Esse bloco serve exclusivamente para REVISÃO RÁPIDA.

Reúna somente as teses essenciais que já tenham sido contextualizadas ao longo dos dispositivos.

Para cada item, indique preferencialmente:
* artigo ou bloco normativo relacionado;
* tribunal, quando identificado com segurança;
* tese essencial em uma ou duas linhas;
* precedente, súmula ou tema somente quando a identificação constar com segurança na fonte.

NÃO reproduza integralmente os blocos jurisprudenciais anteriores.
NÃO crie uma aula jurisprudencial no final.
NÃO acrescente tese inédita no quadro final.
Se nenhuma jurisprudência diretamente relevante for localizada após a busca completa, registre objetivamente essa ausência e não invente conteúdo.

==============================
SUMÁRIO DIDÁTICO DO LEI + JURISPRUDÊNCIA
==============================

TODO WORD GERADO NESTE MODO DEVE CONTER SUMÁRIO NO INÍCIO, após a identificação do diploma e antes do desenvolvimento material.

O SUMÁRIO DEVE SER UMA VERSÃO COMPACTA DA MESMA ARQUITETURA VISUAL DA LEI, E NÃO UMA LISTA ADMINISTRATIVA GENÉRICA.

ESPELHE, QUANDO EXISTIREM:
🔷 **TÍTULO [NÚMERO] — [NOME]**
    ♦️ **CAPÍTULO [NÚMERO] — [NOME]**
        ▶️ **SEÇÃO [NÚMERO] — [NOME]**
            ✅ **ART. [NÚMERO]: [SÍNTESE FUNCIONAL].**

Inclua ao final do sumário:
♦️ **⚖️ QUADRO FINAL DE JURISPRUDÊNCIA**

NÃO crie entrada independente para cada linha ⚖️ JURISPRUDÊNCIA; a tese deve ser localizada pelo artigo ao qual está vinculada.

MANTENHA:
* a mesma fonte e texto preto #000000;
* negrito real dos cabeçalhos;
* emojis e marcadores funcionais;
* recuos progressivos reais;
* alinhamento à esquerda;
* quebra natural de títulos longos;
* número da página alinhado à direita com líder pontilhado quando a paginação for confiável.

NUNCA justifique os parágrafos do sumário.
NÃO distribua artificialmente espaços entre palavras.
NÃO invente nem estime números de página.

Quando a ferramenta de DOCX suportar sumário automático real:
* use estilos estruturais equivalentes a Título 1, Título 2 e Título 3, e nível adicional apenas quando realmente necessário para artigos;
* personalize os estilos TOC para preservar a gramática visual da LEI;
* habilite hiperlinks internos quando suportado;
* atualize o campo depois da paginação final quando possível.

Se o campo automático não puder ser criado com segurança, gere SUMÁRIO MANUAL DIDÁTICO com a mesma hierarquia e hiperlinks internos quando tecnicamente possíveis, sem páginas inventadas.

==============================
PADRÃO VISUAL DO MÓDULO INTEGRADO
==============================

MANTENHA integralmente a identidade visual do MÓDULO LEI definido no prompt-base.

A faixa azul-clara continua pertencendo aos CABEÇALHOS DE ARTIGO ✅, exatamente como no módulo LEI.
NÃO use a faixa azul-clara nas linhas de jurisprudência.

As linhas ⚖️ JURISPRUDÊNCIA devem usar texto preto #000000 e negrito real apenas no ícone/rótulo funcional até os dois-pontos; a explicação permanece sem negrito, salvo necessidade pontual já autorizada pelo padrão-base.

O título ♦️ ⚖️ QUADRO FINAL DE JURISPRUDÊNCIA deve seguir a hierarquia visual dos grandes blocos e não receber a faixa reservada aos artigos.

NÃO introduza nova paleta de cores.
NÃO use tabelas.
NÃO use alinhamento justificado que gere espaços excessivos.

==============================
VALIDAÇÃO FINAL DO MÓDULO INTEGRADO
==============================

ANTES DE ENTREGAR, CONFIRME:
* o texto oficial vigente e o recorte legal foram preservados;
* nenhum tema classificado como PEÇA foi convertido indevidamente em LEI + JURISPRUDÊNCIA;
* cada tese jurisprudencial está vinculada ao dispositivo correto;
* não há jurisprudência ornamental ou duplicada;
* não há identificadores inventados;
* o quadro final contém somente teses já contextualizadas;
* o sumário espelha a arquitetura da lei e permite localizar os dispositivos;
* a jurisprudência permanece visualmente distinta do texto legal;
* a formatação do Word continua compatível com o padrão canônico do módulo LEI.
`;

  function currentLeiPrompt() {
    try {
      const configured = String(state?.factoryPromptLibrary?.lei || "").trim();
      if (configured) return configured;
    } catch {}
    try {
      const canonical = String(defaultFactoryPromptLibrary?.lei || "").trim();
      if (canonical) return canonical;
    } catch {}
    try {
      const fallback = String(factoryPromptBase?.("lei") || "").trim();
      if (fallback) return fallback;
    } catch {}
    return "";
  }

  function adaptLeiBase(basePrompt) {
    let text = String(basePrompt || "").trim();
    if (!text) return "";
    for (const [from, to] of BASE_REPLACEMENTS) {
      if (text.includes(from)) text = text.replace(from, to);
    }
    return text;
  }

  function buildPrompt(basePrompt = currentLeiPrompt()) {
    const base = adaptLeiBase(basePrompt);
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
      const leiIndex = FACTORY_PROMPT_TYPES.findIndex((entry) => entry?.key === "lei");
      FACTORY_PROMPT_TYPES.splice(leiIndex >= 0 ? leiIndex + 1 : FACTORY_PROMPT_TYPES.length, 0, {
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
    if (!prompt) return { installed: false, changed: false, reason: "lei-unavailable" };

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

  function installPromptBase() {
    try {
      if (typeof factoryPromptBase !== "function") return false;
      if (factoryPromptBase?.[API_MARKER] === VERSION) return true;
      const previous = factoryPromptBase;
      const wrapped = function(type) {
        if (type !== TYPE_KEY) return previous(type);
        const configured = String(state?.factoryPromptLibrary?.[TYPE_KEY] || "").trim();
        return configured || buildPrompt();
      };
      Object.defineProperty(wrapped, API_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, "__aldusFactoryLeiJurisprudenciaOriginal", { value: previous });
      factoryPromptBase = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  function installRouter() {
    try {
      if (typeof factoryRouterText !== "function") return false;
      if (factoryRouterText?.[API_MARKER] === VERSION) return true;
      const previous = factoryRouterText;
      const wrapped = function(type, item = {}) {
        if (type !== TYPE_KEY) return previous(type, item);
        const leiRouter = String(previous("lei", item) || "");
        const moduleIndex = leiRouter.indexOf("\nMÓDULO:");
        const common = moduleIndex >= 0 ? leiRouter.slice(0, moduleIndex).trimEnd() : leiRouter.trimEnd();
        return `${common}\n\nMÓDULO: LEI + JURISPRUDÊNCIA. Produza um único módulo integrado: a LEI usa o diploma, a fonte oficial e o recorte autorizados pelo módulo LEI; a camada jurisprudencial usa exclusivamente a pasta jurisprudencial indicada no prompt completo. A jurisprudência deve ser inserida junto do dispositivo correspondente e consolidada, sem repetição integral, em quadro final de revisão. ESTE MODO NÃO É PEÇA: se o tema pertencer à categoria PEÇA, não o converta em LEI + JURISPRUDÊNCIA.\n\nENTREGA OBRIGATÓRIA DESTA ETAPA:\n- gerar somente o MÓDULO LEI + JURISPRUDÊNCIA;\n- gerar um arquivo Word editável contendo o módulo integrado;\n- preservar a arquitetura e a formatação canônica do módulo LEI;\n- incluir sumário didático compatível com a arquitetura da lei;\n- não gerar RESUMO/AULA, PEÇA, JURISPRUDÊNCIA autônoma ou CONSOLIDAÇÃO FINAL;\n- salvar no Drive apenas quando a pasta de destino estiver preenchida e a ação de upload for efetivamente concluída.`;
      };
      Object.defineProperty(wrapped, API_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, "__aldusFactoryLeiJurisprudenciaRouterOriginal", { value: previous });
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
    const promptBase = installPromptBase();
    const router = installRouter();

    if (!promptType || !library.installed || !promptBase || !router) {
      return { installed: false, promptType, library, promptBase, router };
    }

    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset[INSTALL_FLAG] = "true";
    }
    refreshFactoryUi();
    return { installed: true, changed: library.changed };
  }

  const api = Object.freeze({
    version: VERSION,
    typeKey: TYPE_KEY,
    sourceFolder: SOURCE_FOLDER,
    priorityFolders: Object.freeze([...PRIORITY_FOLDERS]),
    adaptLeiBase,
    buildPrompt,
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
