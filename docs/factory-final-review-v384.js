(() => {
  "use strict";

  const VERSION = "20260824-final-review-consolidation-v384";
  const FINAL_TYPE = "consolidacao";
  const FINAL_LABEL = "Gerar prompt Revisão e Consolidação Final";
  const MIGRATION_ID = "factoryFinalReviewConsolidationV384";
  const API_MARKER = "__aldusFactoryFinalReviewV384";
  const BASE_WRAP_MARKER = "__aldusFactoryFinalReviewBaseWrappedV384";
  const ROUTER_WRAP_MARKER = "__aldusFactoryFinalReviewRouterWrappedV384";
  const INSTALL_FLAG = "aldusFactoryFinalReviewV384";
  const FALLBACK = "[PROMPT COMPLETO AINDA NÃO CADASTRADO NA BIBLIOTECA DA FÁBRICA]";
  const PRODUCED_STATUSES = new Set(["Aguardando revisão", "Aprovado", "PDF gerado"]);
  const MODULES = Object.freeze([
    { key: "resumoAula", label: "RESUMO/AULA", variants: "RESUMO/AULA puro ou RESUMO/AULA + JURISPRUDÊNCIA" },
    { key: "lei", label: "LEI", variants: "LEI pura ou LEI + JURISPRUDÊNCIA" },
    { key: "jurisprudencia", label: "JURISPRUDÊNCIA", variants: "JURISPRUDÊNCIA autônoma" },
    { key: "peca", label: "PEÇA", variants: "PEÇA" }
  ]);

  const BASE_PROMPT = `REALIZE A REVISÃO FINAL DO MATERIAL DISPONÍVEL E, SOMENTE QUANDO HOUVER DOIS OU MAIS PRODUTOS EFETIVAMENTE PRODUZIDOS, FAÇA TAMBÉM A CONSOLIDAÇÃO FINAL.

ESTA VERSÃO RECONHECE EXPRESSAMENTE OS PRODUTOS INTEGRADOS:
- RESUMO/AULA + JURISPRUDÊNCIA;
- LEI + JURISPRUDÊNCIA.

A PRESENÇA DE JURISPRUDÊNCIA DENTRO DE UM PRODUTO INTEGRADO NÃO AUTORIZA CRIAR, EXIGIR OU REPETIR UM MÓDULO JURISPRUDÊNCIA AUTÔNOMO.

## 1. REGRA DE DECISÃO OBRIGATÓRIA

1. SE HOUVER APENAS UM PRODUTO PRODUZIDO E ACESSÍVEL:
- faça o REFINAMENTO FINAL exclusivamente desse produto;
- reconheça se ele é puro ou integrado;
- não exija produtos ausentes;
- não crie, complete, simule ou invente módulos ausentes;
- não transforme o produto em outro tipo de material.

2. SE HOUVER DOIS OU MAIS PRODUTOS PRODUZIDOS E ACESSÍVEIS:
- revise cada produto separadamente antes de reuni-los;
- consolide somente o que estiver efetivamente disponível;
- preserve a identidade, o método e as limitações de fonte de cada produto;
- elimine somente DUPLICAÇÕES REAIS, sobretudo de jurisprudência;
- mantenha a ordem final preferencial: RESUMO/AULA ou RESUMO/AULA + JURISPRUDÊNCIA; LEI ou LEI + JURISPRUDÊNCIA; JURISPRUDÊNCIA COMPLEMENTAR apenas quando houver conteúdo realmente único; PEÇA.

3. SE NÃO HOUVER NENHUM PRODUTO PRODUZIDO E ACESSÍVEL:
- interrompa a tarefa;
- não gere Word nem PDF;
- informe que é necessário produzir ou disponibilizar ao menos um produto.

## 2. AUDITORIA DE COMPOSIÇÃO — OBRIGATÓRIA ANTES DE CONSOLIDAR

O INVENTÁRIO DO SITE É LOGÍSTICO E PODE REGISTRAR UM ARQUIVO INTEGRADO NO SLOT RESUMO/AULA OU LEI. POR ISSO, NÃO CLASSIFIQUE O CONTEÚDO APENAS PELO NOME DO SLOT, STATUS OU NOME DO ARQUIVO.

ABRA E EXAMINE O CONTEÚDO REAL DE CADA WORD/PDF ACESSÍVEL E CLASSIFIQUE-O INTERNAMENTE COMO UMA DAS CATEGORIAS:
- RESUMO/AULA PURO;
- RESUMO/AULA + JURISPRUDÊNCIA;
- LEI PURA;
- LEI + JURISPRUDÊNCIA;
- JURISPRUDÊNCIA AUTÔNOMA;
- PEÇA;
- INDETERMINADO, quando o conteúdo não puder ser verificado com segurança.

INDÍCIOS DE PRODUTO INTEGRADO DEVEM SER CONFIRMADOS PELO CONTEÚDO, E NÃO APENAS PELO NOME DO ARQUIVO. VERIFIQUE A ARQUITETURA DO CORPO, A EXISTÊNCIA DE BLOCOS ⚖️ JURISPRUDÊNCIA CONTEXTUALIZADOS E, QUANDO PRESENTE, O QUADRO FINAL DE JURISPRUDÊNCIA.

SE UM ARQUIVO ESTIVER INACESSÍVEL OU ILEGÍVEL, NÃO PRESUMA QUE ELE É PURO OU INTEGRADO. REGISTRE A LIMITAÇÃO E NÃO ELIMINE CONTEÚDO COM BASE EM SUPOSIÇÃO.

## 3. MATRIZ DE COMBINAÇÕES

A) RESUMO/AULA PURO + LEI PURA + JURISPRUDÊNCIA AUTÔNOMA:
- preserve os três produtos na ordem tradicional;
- elimine somente repetições internas reais.

B) RESUMO/AULA + JURISPRUDÊNCIA + LEI PURA:
- não crie jurisprudência autônoma só porque existe slot próprio;
- mantenha a jurisprudência já contextualizada na AULA.

C) RESUMO/AULA PURO + LEI + JURISPRUDÊNCIA:
- mantenha a jurisprudência vinculada aos dispositivos da LEI;
- não replique as mesmas teses como seção autônoma sem conteúdo novo.

D) RESUMO/AULA + JURISPRUDÊNCIA + LEI + JURISPRUDÊNCIA:
- trate os dois como produtos integrados legítimos;
- faça deduplicação transversal das teses jurisprudenciais;
- jurisprudência específica de artigo/dispositivo tem colocação preferencial no bloco LEI + JURISPRUDÊNCIA;
- jurisprudência de instituto, conceito ou explicação geral tem colocação preferencial no bloco RESUMO/AULA + JURISPRUDÊNCIA;
- quando a mesma tese for útil nos dois contextos, mantenha o bloco completo somente no contexto principal e, no contexto secundário, use referência breve se ela realmente facilitar a navegação.

E) QUALQUER PRODUTO INTEGRADO + JURISPRUDÊNCIA AUTÔNOMA:
- compare a cobertura tese por tese;
- não descarte a jurisprudência autônoma por inteiro apenas porque existe um produto integrado;
- absorva no lugar materialmente correto toda tese única e relevante;
- se todo o conteúdo autônomo já estiver coberto, omita sua repetição integral no consolidado e registre na nota final que o conteúdo foi absorvido sem perda;
- se houver teses únicas que não se encaixem adequadamente em AULA ou LEI, mantenha uma seção curta de JURISPRUDÊNCIA COMPLEMENTAR.

F) PEÇA:
- permanece produto próprio;
- não converta PEÇA em AULA, LEI ou JURISPRUDÊNCIA;
- não use dispositivos legais relacionados para reclassificar tema de PEÇA.

## 4. DEDUPLICAÇÃO JURISPRUDENCIAL OBRIGATÓRIA

ANTES DA CONSOLIDAÇÃO, INVENTARIE INTERNAMENTE TODAS AS UNIDADES JURISPRUDENCIAIS DOS PRODUTOS DISPONÍVEIS.

COMPARE, QUANDO CONSTAREM DAS FONTES:
- tribunal;
- súmula, tema, repetitivo, informativo ou processo;
- núcleo da tese;
- hipótese de incidência;
- regra, condição, exceção, distinção ou evolução.

CONSIDERE DUPLICAÇÃO REAL quando dois trechos exprimirem a mesma proposição jurídica, com o mesmo alcance material, ainda que a redação seja diferente.

NÃO CONSIDERE DUPLICAÇÃO quando um julgado acrescentar:
- condição própria;
- exceção;
- distinção fática ou jurídica;
- mudança/evolução de entendimento;
- alcance diferente;
- consequência adicional relevante.

NÃO APAGUE DIVERGÊNCIAS REAIS. SE AS FONTES DEMONSTRAREM ENTENDIMENTOS DISTINTOS OU EVOLUÇÃO, PRESERVE-OS E IDENTIFIQUE A RELAÇÃO ENTRE ELES.

## 5. REGRA DE LOCALIZAÇÃO DA JURISPRUDÊNCIA NO CONSOLIDADO

A jurisprudência deve permanecer prioritariamente junto do conteúdo material ao qual pertence.

ORDEM DE PREFERÊNCIA:
1. tese diretamente vinculada a artigo/dispositivo legal -> LEI + JURISPRUDÊNCIA;
2. tese vinculada a instituto, conceito, classificação ou explicação geral -> RESUMO/AULA + JURISPRUDÊNCIA;
3. tese única sem encaixe adequado nos dois anteriores -> JURISPRUDÊNCIA COMPLEMENTAR.

NÃO CRIE UMA TERCEIRA CÓPIA DA MESMA TESE NO FINAL DO DOCUMENTO.

## 6. QUADRO FINAL ÚNICO DE JURISPRUDÊNCIA

QUANDO HOUVER DOIS OU MAIS PRODUTOS CONSOLIDADOS E EXISTIR CONTEÚDO JURISPRUDENCIAL, CRIE AO FINAL UM ÚNICO:

♦️ **⚖️ QUADRO FINAL DE JURISPRUDÊNCIA DO TEMA**

Esse quadro deve reunir, de forma concisa e sem duplicações, as teses essenciais que aparecem ao longo do consolidado.

AO FORMAR O CONSOLIDADO:
- absorva os quadros finais dos produtos integrados em um único quadro global;
- não mantenha vários QUADROS FINAIS repetindo as mesmas teses;
- não acrescente tese nova que não esteja nos produtos/fontes autorizados;
- preserve identificação de tribunal e precedente somente quando constar com segurança.

SE HOUVER APENAS UM PRODUTO INTEGRADO EM REFINAMENTO FINAL, preserve o quadro final próprio daquele produto, sem criar um segundo quadro global.

## 7. PRINCÍPIO DE PRESERVAÇÃO

NÃO REESCREVA CONTEÚDO CORRETO APENAS PARA MODIFICÁ-LO.

Altere somente o que tiver motivo verificável: erro jurídico, omissão relevante, contradição, repetição desnecessária, perda de sentido, problema de hierarquia, falha didática ou defeito de formatação.

ANTES DE ELIMINAR QUALQUER TRECHO COMO DUPLICADO, CONFIRME QUE TODA A INFORMAÇÃO JURÍDICA ÚTIL DAQUELE TRECHO ESTÁ PRESERVADA EM OUTRO PONTO.

## 8. LIMITES DE FONTE E CONTEÚDO

- use somente os produtos produzidos e as fontes autorizadas para o tema;
- não pesquise conteúdo externo para ampliar o material;
- não use produtos ausentes como pretexto para acrescentar conhecimento por memória;
- não misture lei com doutrina;
- não apresente jurisprudência como texto legal;
- não transforme estrutura de peça em comentário teórico;
- no RESUMO/AULA puro, preserve a explicação didática sem inserir jurisprudência nova;
- no RESUMO/AULA + JURISPRUDÊNCIA, preserve a integração contextual existente;
- na LEI pura, preserve texto oficial, recorte e arquitetura normativa;
- na LEI + JURISPRUDÊNCIA, preserve artigo como unidade central e jurisprudência vinculada ao dispositivo;
- na JURISPRUDÊNCIA autônoma, preserve tribunal, súmula, informativo, tema, ano, tese e distinções quando constarem nas fontes;
- na PEÇA, preserve estrutura, requisitos, fundamentos, pedidos e determinações sem criar fundamento não fornecido.

## 9. AUDITORIA JURÍDICA E DIDÁTICA

Para cada produto disponível, confira:
- fidelidade ao recorte autorizado;
- ausência de omissões relevantes;
- prazos, competências, legitimidades, requisitos, exceções, vedações, efeitos, sanções, valores, percentuais, quóruns e limites numéricos;
- distinção entre regra, exceção, faculdade, obrigação e consequência;
- repetição, contradição e duplicação;
- clareza, hierarquia e utilidade para revisão;
- títulos, subtítulos, negritos, indentações e alinhamentos;
- fonte textual exclusivamente preta #000000, salvo cores nativas dos emojis e fundos expressamente autorizados;
- fonte compatível com emojis, sem quadrados, símbolos quebrados ou substituições indevidas.

## 10. SUMÁRIO DIDÁTICO DO ARQUIVO FINAL

TODO WORD GERADO NESTA ETAPA DEVE CONTER, APÓS O TÍTULO E ANTES DO CONTEÚDO MATERIAL:

♦️ **📑 SUMÁRIO**

O SUMÁRIO DEVE ESPELHAR A MESMA DIDÁTICA VISUAL DO DOCUMENTO FINAL.

NO CONSOLIDADO:
- use como grandes entradas os produtos efetivamente presentes: RESUMO/AULA ou RESUMO/AULA + JURISPRUDÊNCIA; LEI ou LEI + JURISPRUDÊNCIA; JURISPRUDÊNCIA COMPLEMENTAR quando existir; PEÇA;
- abaixo de cada produto, preserve os principais eixos/títulos da sua própria gramática visual;
- em AULA, preserve ♦️ e ▶️📚 quando fizerem parte do corpo;
- em LEI, preserve 🔷 TÍTULO, ♦️ CAPÍTULO, ▶️ SEÇÃO e ✅ ARTIGO conforme a granularidade útil;
- em PEÇA, preserve a arquitetura visual própria da peça;
- não crie entrada para cada linha de REGRA, EXCEÇÃO, PRAZO, PONTO DE PROVA ou cada tese individual.

O SUMÁRIO DEVE SER ALINHADO À ESQUERDA, NUNCA JUSTIFICADO.

QUANDO a ferramenta suportar campo automático real do Word:
- prefira sumário automático;
- use estilos estruturais de Título 1, Título 2 e, quando necessário, Título 3;
- habilite hiperlinks internos;
- use números de página alinhados à direita e líder pontilhado quando a paginação estiver final e confiável;
- personalize os estilos TOC para manter a identidade visual do material.

SE o sumário automático não puder ser criado/atualizado com segurança, use fallback manual didático com hiperlinks internos quando possível, sem inventar números de página.

## 11. ARQUIVOS E SEGURANÇA

- preserve todos os arquivos originais;
- não sobrescreva nem exclua produtos já produzidos;
- gere novos arquivos identificados como REVISADO_FINAL ou CONSOLIDADO_REVISADO_FINAL;
- não altere automaticamente o status dos módulos no site;
- não afirme que salvou no Google Drive sem gravação efetiva;
- use ferramenta autorizada para salvar na pasta de destino e devolva os links exatos;
- se não houver ferramenta autorizada, gere os arquivos para download e informe que o envio à pasta deverá ser manual;
- se algum arquivo estiver inacessível, informe exatamente qual e prossiga somente quando o restante permitir revisão segura.

## 12. ENTREGA

- produto único: gerar Word e PDF do produto refinado, sem acrescentar produtos ausentes;
- múltiplos produtos: gerar Word e PDF consolidados somente com produtos efetivamente disponíveis;
- apresentar uma nota breve das correções e deduplicações realmente efetuadas;
- na nota, indicar quando jurisprudência autônoma tiver sido totalmente absorvida por produtos integrados;
- não listar mudanças inexistentes;
- não apresentar como corrigido ou verificado aquilo que não pôde ser examinado.`;

  function safeModules(item = {}) {
    try {
      if (typeof normalizeFactoryModules === "function") return normalizeFactoryModules(item.modules || {}, item);
    } catch {}
    return item.modules && typeof item.modules === "object" ? item.modules : {};
  }

  function moduleInfo(item = {}) {
    const modules = safeModules(item);
    return MODULES.map(({ key, label, variants }) => {
      const module = modules[key] || {};
      const status = String(module.status || "Não iniciado");
      const wordLink = String(module.wordLink || module.linkWord || module.word || "").trim();
      const pdfLink = String(module.pdfLink || module.linkPdf || module.pdf || "").trim();
      const hasFile = Boolean(wordLink || pdfLink);
      const produced = status !== "Não se aplica" && (PRODUCED_STATUSES.has(status) || hasFile);
      return { key, label, variants, status, wordLink, pdfLink, hasFile, produced };
    });
  }

  function moduleLine(module) {
    const links = [
      module.wordLink ? `Word: ${module.wordLink}` : "",
      module.pdfLink ? `PDF: ${module.pdfLink}` : ""
    ].filter(Boolean).join(" | ");
    return `- ${module.label}: status “${module.status}” | composição possível: ${module.variants}${links ? ` | ${links}` : " | sem link individual cadastrado; verificar a pasta de destino"}`;
  }

  function dynamicFinalRouter(item = {}, previousRouter) {
    const common = typeof previousRouter === "function"
      ? previousRouter(FINAL_TYPE, item)
      : `Disciplina: ${item.disciplina || "[DISCIPLINA]"}\nTema: ${item.tema || "[TEMA]"}`;
    const info = moduleInfo(item);
    const produced = info.filter((module) => module.produced);
    const unavailable = info.filter((module) => !module.produced);
    const inventory = info.map(moduleLine).join("\n");

    if (!produced.length) {
      return `${common}\n\nREVISÃO E CONSOLIDAÇÃO FINAL — BLOQUEADA COM SEGURANÇA.\n\nINVENTÁRIO LOGÍSTICO DOS SLOTS:\n${inventory}\n\nNão há produto produzido e acessível identificado. Interrompa a tarefa, não gere Word nem PDF e solicite que ao menos um produto seja produzido, vinculado ou marcado como aguardando revisão/aprovado. Não crie conteúdo para suprir a ausência.`;
    }

    const producedList = produced.map((module, index) => `${index + 1}. ${module.label} — verificar conteúdo para distinguir: ${module.variants}`).join("\n");
    const unavailableList = unavailable.length
      ? unavailable.map((module) => `- ${module.label}: ${module.status}`).join("\n")
      : "- nenhum";

    const compositionAudit = `AUDITORIA DE COMPOSIÇÃO OBRIGATÓRIA:\nO slot do site não identifica sozinho se o arquivo é puro ou integrado. Abra os arquivos acessíveis antes de decidir. RESUMO/AULA pode conter RESUMO/AULA + JURISPRUDÊNCIA; LEI pode conter LEI + JURISPRUDÊNCIA. Se houver jurisprudência integrada, não duplique automaticamente o módulo JURISPRUDÊNCIA. Compare tese por tese e preserve todo conteúdo único.`;

    if (produced.length === 1) {
      const only = produced[0];
      return `${common}\n\nMODO AUTOMÁTICO: REFINAMENTO FINAL DE PRODUTO ÚNICO.\n\nSLOT COM PRODUTO DISPONÍVEL:\n1. ${only.label}\n\n${compositionAudit}\n\nINVENTÁRIO LOGÍSTICO DOS SLOTS:\n${inventory}\n\nSLOTS QUE NÃO DEVEM SER CRIADOS NESTA ETAPA:\n${unavailableList}\n\nFaça auditoria e refinamento somente do produto realmente contido no slot ${only.label}. Primeiro determine se ele é puro ou integrado. Não exija, não produza e não simule produtos ausentes. Preserve o conteúdo correto e modifique apenas falhas comprovadas.\n\nENTREGA OBRIGATÓRIA:\n- gerar novo Word e novo PDF do produto revisado;\n- usar no nome do arquivo a indicação REVISADO_FINAL;\n- preservar os arquivos originais;\n- incluir sumário didático conforme o prompt completo;\n- salvar na pasta de destino somente com ferramenta autorizada;\n- devolver separadamente os links exatos do Word e do PDF, ou informar claramente a necessidade de upload manual.`;
    }

    return `${common}\n\nMODO AUTOMÁTICO: REVISÃO E CONSOLIDAÇÃO FINAL DE MÚLTIPLOS PRODUTOS.\n\nSLOTS COM PRODUTOS DISPONÍVEIS:\n${producedList}\n\n${compositionAudit}\n\nINVENTÁRIO LOGÍSTICO DOS SLOTS:\n${inventory}\n\nSLOTS AUSENTES OU NÃO PRONTOS — NÃO CRIAR NEM COMPLETAR:\n${unavailableList}\n\nRevise individualmente os produtos disponíveis e depois os reúna conforme a composição REAL detectada nos arquivos. Faça deduplicação jurisprudencial transversal. Se AULA + JURISPRUDÊNCIA ou LEI + JURISPRUDÊNCIA já contiverem as teses de um módulo JURISPRUDÊNCIA autônomo, não reproduza o mesmo bloco novamente; preserve apenas teses únicas. Quando houver dois produtos integrados, mantenha cada tese completa no contexto principal mais adequado e use referência breve no contexto secundário apenas se útil. Preserve PEÇA como produto próprio.\n\nENTREGA OBRIGATÓRIA:\n- gerar novo Word consolidado e novo PDF consolidado;\n- usar no nome dos arquivos a indicação CONSOLIDADO_REVISADO_FINAL;\n- incluir um único sumário didático do consolidado;\n- quando houver jurisprudência em múltiplos produtos, produzir um único QUADRO FINAL DE JURISPRUDÊNCIA DO TEMA, sem duplicações;\n- preservar os arquivos originais;\n- salvar na pasta de destino somente com ferramenta autorizada;\n- devolver separadamente os links exatos do Word e do PDF, ou informar claramente a necessidade de upload manual.`;
  }

  function isOfficialPreviousPrompt(value) {
    const text = String(value || "").trim();
    if (!text || text === FALLBACK || text === BASE_PROMPT) return true;
    return text.includes("REALIZE A REVISÃO FINAL DO MATERIAL DISPONÍVEL")
      && text.includes("## REGRA DE DECISÃO OBRIGATÓRIA")
      && text.includes("CONSOLIDADO REVISADO FINAL");
  }

  function patchPromptLibrary() {
    let changed = false;
    try {
      if (typeof defaultFactoryPromptLibrary === "object" && defaultFactoryPromptLibrary) {
        defaultFactoryPromptLibrary[FINAL_TYPE] = BASE_PROMPT;
      }
    } catch {}

    try {
      if (!state || typeof state !== "object") return changed;
      state.factoryPromptLibrary ||= {};
      state.factoryPromptLibraryBackups ||= {};
      state.migrations ||= {};
      const current = String(state.factoryPromptLibrary[FINAL_TYPE] || "").trim();
      if (isOfficialPreviousPrompt(current)) {
        if (current && current !== FALLBACK && current !== BASE_PROMPT) {
          state.factoryPromptLibraryBackups.consolidacaoBeforeV384 ||= current;
        }
        if (current !== BASE_PROMPT) {
          state.factoryPromptLibrary[FINAL_TYPE] = BASE_PROMPT;
          changed = true;
        }
      }
      state.migrations[MIGRATION_ID] ||= new Date().toISOString();
    } catch {}
    return changed;
  }

  function wrapPromptBase() {
    try {
      if (typeof factoryPromptBase !== "function") return false;
      if (factoryPromptBase?.[BASE_WRAP_MARKER] === VERSION) return true;
      const previous = factoryPromptBase;
      const wrapped = function(type) {
        if (type !== FINAL_TYPE) return previous(type);
        try {
          const current = String(state?.factoryPromptLibrary?.[FINAL_TYPE] || "").trim();
          return current || BASE_PROMPT;
        } catch {
          return BASE_PROMPT;
        }
      };
      Object.defineProperty(wrapped, BASE_WRAP_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, "__aldusFactoryFinalReviewOriginal", { value: previous });
      factoryPromptBase = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  function wrapRouter() {
    try {
      if (typeof factoryRouterText !== "function") return false;
      if (factoryRouterText?.[ROUTER_WRAP_MARKER] === VERSION) return true;
      const previous = factoryRouterText;
      const wrapped = function(type, item = {}) {
        if (type !== FINAL_TYPE) return previous(type, item);
        return dynamicFinalRouter(item, previous);
      };
      Object.defineProperty(wrapped, ROUTER_WRAP_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, "__aldusFactoryFinalReviewRouterOriginal", { value: previous });
      factoryRouterText = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  function ensureLabel() {
    try {
      if (!Array.isArray(FACTORY_PROMPT_TYPES)) return false;
      const entry = FACTORY_PROMPT_TYPES.find((item) => item?.key === FINAL_TYPE);
      if (entry) entry.label = FINAL_LABEL;
      return Boolean(entry);
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
    const changed = patchPromptLibrary();
    const label = ensureLabel();
    const base = wrapPromptBase();
    const router = wrapRouter();
    const installed = base && router;
    if (installed && typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset[INSTALL_FLAG] = "true";
    }
    if (installed) refreshFactoryUi();
    return { installed, changed, label, base, router };
  }

  const api = Object.freeze({
    version: VERSION,
    prompt: BASE_PROMPT,
    moduleInfo,
    dynamicFinalRouter,
    install
  });

  globalThis[API_MARKER] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", install, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", install, { once: true });
    window.addEventListener("aldus:bootstrap-ready", install, { once: true });
    window.addEventListener("load", install, { once: true });
  }
})();
