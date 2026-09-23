(() => {
  "use strict";

  const VERSION = "20260921-factory-lei-jurisprudencia-v383-planalto-v635";
  const TYPE_KEY = "leiJurisprudencia";
  const TYPE_LABEL = "Gerar prompt Lei + Jurisprudência";
  const MIGRATION_ID = "factoryLeiJurisprudenciaV383";
  const SOURCE_FOLDER = "https://drive.google.com/drive/folders/1ECc_otgQKwH7WfPdQr8CtD0kB07pz9Xe";
  const PRIORITY_FOLDERS = ["JULGADOS STF RESUMIDOS", "JULGADOS STJ RESUMIDOS"];
  const API_MARKER = "__aldusFactoryLeiJurisprudenciaV383";
  const INSTALL_FLAG = "aldusFactoryLeiJurisprudenciaV383";

  // V635 (21/09): Planalto como fonte normativa principal, obrigatória e verificável nos
  // módulos LEI e LEI + JURISPRUDÊNCIA. Resolve o conflito do roteador comum ("conteúdo
  // externo não fornecido" proibido x consulta obrigatória ao Planalto) e troca a linha fixa
  // "📍 FONTE: PLANALTO" por URL e data da consulta. Os demais tipos, inclusive a TRIAGEM,
  // continuam passando direto pelos invólucros, sem alteração.
  const PLANALTO_TYPES = Object.freeze(["lei", TYPE_KEY]);
  const PLANALTO_MARKER = "REGRA OBRIGATÓRIA DO MÓDULO LEI — FONTE NORMATIVA OFICIAL (PLANALTO)";
  const PLANALTO_ROUTER_REPLACEMENTS = Object.freeze([
    [
      "Fontes a usar: conforme a triagem e as fontes classificadas para este módulo.",
      "Fontes a usar: para o TEXTO NORMATIVO, obrigatoriamente o texto oficial vigente no site do Planalto (www.planalto.gov.br); para identificar diploma, dispositivos e recorte, as fontes classificadas na triagem e a pasta do Google Drive; no modo com jurisprudência, a pasta jurisprudencial indicada no prompt completo."
    ],
    [
      "Fontes a não usar: fontes de outros módulos, conteúdo externo não fornecido e materiais não aprovados na triagem.",
      "Fontes a não usar: fontes de outros módulos, conteúdo externo não fornecido e materiais não aprovados na triagem. EXCEÇÃO OFICIAL E OBRIGATÓRIA DESTE MÓDULO: a consulta ao site oficial do Planalto é exigida e não se enquadra como conteúdo externo proibido."
    ],
    [
      "Confira o conteúdo normativo exclusivamente no texto oficial vigente do Planalto.",
      "Obtenha o conteúdo normativo exclusivamente do texto oficial vigente no Planalto, conforme a regra obrigatória abaixo."
    ]
  ]);
  const PLANALTO_BASE_LINE = /^📍 FONTE: PLANALTO[ \t]*$/m;
  const PLANALTO_BASE_REPLACEMENT = "📍 FONTE OFICIAL: [URL EXATA DA PÁGINA DO PLANALTO EFETIVAMENTE CONSULTADA]\n📅 CONSULTA AO PLANALTO: [DATA DA CONSULTA — DD/MM/AAAA]";
  const PLANALTO_SECTION = `==============================
${PLANALTO_MARKER}
==============================

Para legislação federal, o site oficial do Planalto (www.planalto.gov.br) é a FONTE NORMATIVA PRINCIPAL E OBRIGATÓRIA. Esta consulta é uma exceção oficial à restrição de conteúdo externo não fornecido: ela não é opcional e não pode ser substituída pelos materiais do Drive.

FUNÇÃO DE CADA FONTE:
- PLANALTO: fornece e confirma a redação vigente de artigo, parágrafo, inciso, alínea e item, com alterações, revogações e inclusões.
- GOOGLE DRIVE (triagem e materiais): identifica diploma, artigos, incisos, parágrafos, alterações relevantes e recorte; fornece organização didática, doutrina, jurisprudência (no modo com jurisprudência), atualizações e pontos de prova. PDF, apostila ou resumo do Drive nunca é fonte oficial da redação da lei, ainda que reproduza o texto legal.

FLUXO OBRIGATÓRIO:
1. Com o Drive, a triagem e o recorte informado, identifique o diploma e os dispositivos.
2. Abra no Planalto a página oficial do diploma, preferencialmente a versão compilada.
3. Leia nela a redação vigente dos dispositivos do recorte e confira as alterações, revogações e inclusões indicadas na própria página.
4. Só então produza o material, a partir dessa redação.

REGISTRO OBRIGATÓRIO NO WORD, logo abaixo da identificação da lei:
📍 FONTE OFICIAL: [URL exata da página do Planalto efetivamente consultada]
📅 CONSULTA AO PLANALTO: [data da consulta, DD/MM/AAAA]
Não escreva “FONTE: PLANALTO” sem a URL e a data, e não preencha URL ou data que não correspondam a uma consulta efetivamente realizada nesta conversa. Informe a mesma URL e data na resposta final.

DIVERGÊNCIA: se a redação do Planalto divergir de PDF, apostila ou resumo do Drive, prevalece o Planalto na redação da norma. Registre a divergência de forma objetiva: dispositivo, redação do Planalto e o que diz o material.

PLANALTO INACESSÍVEL: não finja a consulta e não use o Drive como substituto silencioso. Escreva no topo do Word e na resposta “⚠️ TEXTO OFICIAL NÃO CONFIRMADO NO PLANALTO — [motivo]”, identifique os dispositivos sem confirmação e não apresente o material como conferido com a redação oficial.

PROIBIDO: reconstruir redação legal de memória; reproduzir apostila como se fosse lei; apresentar paráfrase como redação literal; completar lacuna normativa com resumo; usar PDF antigo do Drive como fonte superior ao Planalto.`;

  function withPlanaltoRouter(routerText) {
    let text = String(routerText || "");
    if (!text || text.includes(PLANALTO_MARKER)) return text;
    for (const [from, to] of PLANALTO_ROUTER_REPLACEMENTS) {
      if (text.includes(from)) text = text.split(from).join(to);
    }
    const delivery = text.indexOf("\n\nENTREGA OBRIGATÓRIA DESTA ETAPA:");
    return delivery >= 0
      ? `${text.slice(0, delivery)}\n\n${PLANALTO_SECTION}${text.slice(delivery)}`
      : `${text.trimEnd()}\n\n${PLANALTO_SECTION}`;
  }

  function withPlanaltoBase(basePrompt) {
    const text = String(basePrompt || "");
    return text ? text.replace(PLANALTO_BASE_LINE, PLANALTO_BASE_REPLACEMENT) : text;
  }

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

  // Trecho estável da seção que este módulo acrescenta: identifica um prompt montado por ele.
  const INTEGRATION_MARKER = "MÓDULO INTEGRADO — LEI + JURISPRUDÊNCIA";

  function rememberPromptBackup(targetState, type, prompt) {
    try {
      if (!targetState || !String(prompt || "").trim()) return;
      targetState.factoryPromptLibraryBackups ||= {};
      targetState.factoryPromptLibraryBackups[`${type}BeforeValoresFixos20260923`] ??= prompt;
    } catch {}
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
      const saved = String(state.factoryPromptLibrary[TYPE_KEY] || "").trim();
      const hasPrompt = Boolean(saved);
      // Mesmo caso do RESUMO/AULA + JURISPRUDÊNCIA (V380): este prompt é montado a partir do da LEI e
      // só era gravado quando ainda não existia, de modo que congelava e não recebia as correções
      // posteriores do prompt-base. Refaz quando o texto salvo foi montado aqui e ficou para trás.
      const builtHere = hasPrompt && saved.includes(INTEGRATION_MARKER);
      const outdated = builtHere && saved !== prompt;
      const changed = !alreadyMigrated || !hasPrompt || outdated;
      if (outdated) rememberPromptBackup(state, TYPE_KEY, saved);
      if (!hasPrompt || outdated) state.factoryPromptLibrary[TYPE_KEY] = prompt;
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
        if (!PLANALTO_TYPES.includes(type)) return previous(type);
        if (type !== TYPE_KEY) return withPlanaltoBase(previous(type));
        const configured = String(state?.factoryPromptLibrary?.[TYPE_KEY] || "").trim();
        return withPlanaltoBase(configured || buildPrompt());
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
        if (!PLANALTO_TYPES.includes(type)) return previous(type, item);
        if (type !== TYPE_KEY) return withPlanaltoRouter(previous(type, item));
        const leiRouter = String(previous("lei", item) || "");
        const moduleIndex = leiRouter.indexOf("\nMÓDULO:");
        const common = moduleIndex >= 0 ? leiRouter.slice(0, moduleIndex).trimEnd() : leiRouter.trimEnd();
        return withPlanaltoRouter(`${common}\n\nMÓDULO: LEI + JURISPRUDÊNCIA. Produza um único módulo integrado: a LEI usa o diploma, a fonte oficial e o recorte autorizados pelo módulo LEI; a camada jurisprudencial usa exclusivamente a pasta jurisprudencial indicada no prompt completo. A jurisprudência deve ser inserida junto do dispositivo correspondente e consolidada, sem repetição integral, em quadro final de revisão. ESTE MODO NÃO É PEÇA: se o tema pertencer à categoria PEÇA, não o converta em LEI + JURISPRUDÊNCIA.\n\nENTREGA OBRIGATÓRIA DESTA ETAPA:\n- gerar somente o MÓDULO LEI + JURISPRUDÊNCIA;\n- gerar um arquivo Word editável contendo o módulo integrado;\n- preservar a arquitetura e a formatação canônica do módulo LEI;\n- incluir sumário didático compatível com a arquitetura da lei;\n- não gerar RESUMO/AULA, PEÇA, JURISPRUDÊNCIA autônoma ou CONSOLIDAÇÃO FINAL;\n- salvar no Drive apenas quando a pasta de destino estiver preenchida e a ação de upload for efetivamente concluída.\n- gravar o Word uma única vez nesta conversa; se já gravou, ou se a gravação pode ter ocorrido antes de um erro ou queda, conferir a pasta de destino e devolver o link do arquivo existente em vez de gravar outro.`);
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
    withPlanaltoRouter,
    withPlanaltoBase,
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
