(() => {
  "use strict";

  if (window.__aldusFactoryFinalReviewV128) return;
  window.__aldusFactoryFinalReviewV128 = true;

  const VERSION = "20260722-revisao-consolidacao-v128";
  const MIGRATION_ID = "factoryFinalReviewConsolidationV128";
  const FALLBACK = "[PROMPT COMPLETO AINDA NÃO CADASTRADO NA BIBLIOTECA DA FÁBRICA]";
  const FINAL_TYPE = "consolidacao";
  const FINAL_LABEL = "Gerar prompt Revisão e Consolidação Final";
  const MODULES = [
    { key: "resumoAula", label: "RESUMO/AULA" },
    { key: "lei", label: "LEI" },
    { key: "jurisprudencia", label: "JURISPRUDÊNCIA" },
    { key: "peca", label: "PEÇA" }
  ];
  const PRODUCED_STATUSES = new Set(["Aguardando revisão", "Aprovado", "PDF gerado"]);

  const BASE_PROMPT = `REALIZE A REVISÃO FINAL DO MATERIAL DISPONÍVEL E, SOMENTE QUANDO HOUVER DOIS OU MAIS MÓDULOS EFETIVAMENTE PRODUZIDOS, FAÇA TAMBÉM A CONSOLIDAÇÃO FINAL.

## REGRA DE DECISÃO OBRIGATÓRIA

1. SE HOUVER APENAS UM MÓDULO PRODUZIDO E ACESSÍVEL:
- faça o REFINAMENTO FINAL EXCLUSIVAMENTE DESSE MÓDULO;
- não exija os demais módulos;
- não crie, complete, simule ou invente módulos ausentes;
- não transforme o módulo em outro tipo de material.

2. SE HOUVER DOIS OU MAIS MÓDULOS PRODUZIDOS E ACESSÍVEIS:
- revise cada módulo separadamente antes de reuni-los;
- consolide somente os módulos efetivamente disponíveis;
- preserve a identidade, o método e as limitações de fonte de cada módulo;
- mantenha a ordem: RESUMO/AULA, LEI, JURISPRUDÊNCIA e PEÇA, omitindo os que não existirem ou estiverem marcados como “Não se aplica”.

3. SE NÃO HOUVER NENHUM MÓDULO PRODUZIDO E ACESSÍVEL:
- interrompa a tarefa;
- não gere Word nem PDF;
- informe que é necessário produzir ou disponibilizar ao menos um módulo.

## PRINCÍPIO DE PRESERVAÇÃO

NÃO REESCREVA CONTEÚDO CORRETO APENAS PARA MODIFICÁ-LO.

Altere somente o que tiver motivo verificável: erro jurídico, omissão relevante, contradição, repetição desnecessária, perda de sentido, problema de hierarquia, falha didática ou defeito de formatação.

Antes de alterar qualquer trecho, verifique se a mudança aumenta a fidelidade, a completude ou a clareza. Se não aumentar, preserve o texto original.

## LIMITES DE FONTE E CONTEÚDO

- use somente os módulos produzidos e as fontes autorizadas para o tema;
- não pesquise conteúdo externo para ampliar o material;
- não use módulos ausentes como pretexto para acrescentar conhecimento por memória;
- não misture lei com doutrina;
- não apresentar jurisprudência como texto legal;
- não transformar estrutura de peça em comentário teórico;
- no módulo LEI, confira apenas o texto oficial vigente e o recorte expressamente autorizado;
- no módulo JURISPRUDÊNCIA, preserve tribunal, súmula, informativo, tema, ano, tese e distinções quando constarem nas fontes;
- no módulo RESUMO/AULA, preserve a explicação didática sem inserir jurisprudência, lei topificada ou peça não autorizadas;
- no módulo PEÇA, preserve estrutura, requisitos, fundamentos, pedidos e determinações sem criar peça pronta ou fundamento não fornecido.

## AUDITORIA OBRIGATÓRIA

Para cada módulo disponível, confira:
- fidelidade ao recorte autorizado;
- ausência de omissões relevantes;
- prazos, competências, legitimidades, requisitos, exceções, vedações, efeitos, sanções, valores, percentuais, quóruns e limites numéricos;
- distinção entre regra, exceção, faculdade, obrigação e consequência;
- repetição, contradição e duplicação;
- clareza, hierarquia e utilidade para revisão;
- títulos, subtítulos, negritos, indentações e alinhamentos;
- fonte textual exclusivamente preta #000000, salvo as cores nativas dos emojis e fundos expressamente autorizados;
- fonte compatível com emojis, sem quadrados, símbolos quebrados ou substituições indevidas.

## ARQUIVOS E SEGURANÇA

- preserve todos os arquivos originais;
- não sobrescreva nem exclua módulos já produzidos;
- gere novos arquivos identificados como REVISADO FINAL ou CONSOLIDADO REVISADO FINAL;
- não altere automaticamente o status dos módulos no site;
- não afirme que salvou no Google Drive sem gravação efetiva;
- use ferramenta autorizada para salvar na pasta de destino e devolva os links exatos;
- se não houver ferramenta autorizada, gere os arquivos para download e informe que o envio à pasta deverá ser manual;
- se algum arquivo estiver inacessível, informe exatamente qual e prossiga apenas quando o material restante permitir uma revisão segura.

## ENTREGA

- módulo único: gerar Word e PDF do módulo refinado, sem acrescentar módulos ausentes;
- múltiplos módulos: gerar Word e PDF consolidados somente com os módulos disponíveis;
- apresentar uma nota breve das correções realmente efetuadas;
- não listar mudanças inexistentes;
- não apresentar como corrigido aquilo que não pôde ser verificado.`;

  function safeModules(item = {}) {
    try {
      if (typeof normalizeFactoryModules === "function") {
        return normalizeFactoryModules(item.modules || {}, item);
      }
    } catch (error) {
      console.warn("[Aldus] Não foi possível normalizar os módulos para a revisão final.", error);
    }
    return item.modules && typeof item.modules === "object" ? item.modules : {};
  }

  function moduleInfo(item = {}) {
    const modules = safeModules(item);
    return MODULES.map(({ key, label }) => {
      const module = modules[key] || {};
      const status = String(module.status || "Não iniciado");
      const wordLink = String(module.wordLink || module.linkWord || module.word || "").trim();
      const pdfLink = String(module.pdfLink || module.linkPdf || module.pdf || "").trim();
      const hasFile = Boolean(wordLink || pdfLink);
      const produced = status !== "Não se aplica" && (PRODUCED_STATUSES.has(status) || hasFile);
      return { key, label, status, wordLink, pdfLink, hasFile, produced };
    });
  }

  function moduleLine(module) {
    const links = [
      module.wordLink ? `Word: ${module.wordLink}` : "",
      module.pdfLink ? `PDF: ${module.pdfLink}` : ""
    ].filter(Boolean).join(" | ");
    return `- ${module.label}: status “${module.status}”${links ? ` | ${links}` : " | sem link individual cadastrado; verificar a pasta de destino"}`;
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
      return `${common}\n\nREVISÃO E CONSOLIDAÇÃO FINAL — BLOQUEADA COM SEGURANÇA.\n\nINVENTÁRIO DOS MÓDULOS:\n${inventory}\n\nNão há módulo produzido e acessível identificado. Interrompa a tarefa, não gere Word nem PDF e solicite que ao menos um módulo seja produzido, vinculado ou marcado como aguardando revisão/aprovado. Não crie conteúdo para suprir a ausência.`;
    }

    const producedList = produced.map((module, index) => `${index + 1}. ${module.label}`).join("\n");
    const unavailableList = unavailable.length
      ? unavailable.map((module) => `- ${module.label}: ${module.status}`).join("\n")
      : "- nenhum";

    if (produced.length === 1) {
      const only = produced[0];
      return `${common}\n\nMODO AUTOMÁTICO: REFINAMENTO FINAL DE MÓDULO ÚNICO.\n\nMÓDULO AUTORIZADO PARA ESTA ETAPA:\n1. ${only.label}\n\nINVENTÁRIO DOS MÓDULOS:\n${inventory}\n\nMÓDULOS QUE NÃO DEVEM SER CRIADOS NESTA ETAPA:\n${unavailableList}\n\nFaça auditoria e refinamento somente do módulo ${only.label}. Não exija, não produza e não simule RESUMO/AULA, LEI, JURISPRUDÊNCIA ou PEÇA que não estejam disponíveis. Preserve o conteúdo correto e modifique apenas falhas comprovadas.\n\nENTREGA OBRIGATÓRIA:\n- gerar novo Word e novo PDF do módulo ${only.label} revisado;\n- usar no nome do arquivo a indicação REVISADO_FINAL;\n- preservar os arquivos originais;\n- salvar na pasta de destino somente com ferramenta autorizada;\n- devolver separadamente os links exatos do Word e do PDF, ou informar claramente a necessidade de upload manual.`;
    }

    return `${common}\n\nMODO AUTOMÁTICO: REVISÃO E CONSOLIDAÇÃO FINAL DE MÚLTIPLOS MÓDULOS.\n\nMÓDULOS AUTORIZADOS E DISPONÍVEIS:\n${producedList}\n\nINVENTÁRIO DOS MÓDULOS:\n${inventory}\n\nMÓDULOS AUSENTES OU NÃO PRONTOS — NÃO CRIAR NEM COMPLETAR:\n${unavailableList}\n\nRevise individualmente os módulos disponíveis e depois os reúna, na ordem canônica, omitindo os módulos ausentes ou marcados como “Não se aplica”. Não declare que todos os quatro módulos foram aprovados quando isso não estiver demonstrado. Preserve as diferenças metodológicas entre os módulos.\n\nENTREGA OBRIGATÓRIA:\n- gerar novo Word consolidado e novo PDF consolidado;\n- usar no nome dos arquivos a indicação CONSOLIDADO_REVISADO_FINAL;\n- preservar os arquivos originais;\n- salvar na pasta de destino somente com ferramenta autorizada;\n- devolver separadamente os links exatos do Word e do PDF, ou informar claramente a necessidade de upload manual.`;
  }

  function migratePrompt() {
    let changed = false;
    try {
      if (typeof defaultFactoryPromptLibrary === "object" && defaultFactoryPromptLibrary) {
        defaultFactoryPromptLibrary[FINAL_TYPE] = BASE_PROMPT;
      }
      if (typeof state === "object" && state) {
        state.migrations ||= {};
        state.factoryPromptLibrary ||= {};
        state.factoryPromptLibraryBackups ||= {};
        if (!state.migrations[MIGRATION_ID]) {
          const current = String(state.factoryPromptLibrary[FINAL_TYPE] || "").trim();
          if (current && current !== FALLBACK && current !== BASE_PROMPT) {
            state.factoryPromptLibraryBackups.consolidacaoBeforeV128 ||= current;
          }
          state.factoryPromptLibrary[FINAL_TYPE] = BASE_PROMPT;
          state.migrations[MIGRATION_ID] = new Date().toISOString();
          changed = true;
        }
      }
      if (changed && typeof saveData === "function") saveData();
    } catch (error) {
      console.error("[Aldus] Falha ao migrar o prompt de revisão e consolidação final v128.", error);
    }
  }

  function patchPromptFunctions() {
    try {
      if (typeof FACTORY_PROMPT_TYPES !== "undefined" && Array.isArray(FACTORY_PROMPT_TYPES)) {
        const finalType = FACTORY_PROMPT_TYPES.find((entry) => entry.key === FINAL_TYPE);
        if (finalType) finalType.label = FINAL_LABEL;
      }

      if (typeof factoryPromptBase === "function") {
        const previousBase = factoryPromptBase;
        factoryPromptBase = function patchedFactoryPromptBase(type) {
          if (type === FINAL_TYPE) {
            const current = String(typeof state === "object" ? state.factoryPromptLibrary?.[FINAL_TYPE] || "" : "").trim();
            return current || BASE_PROMPT;
          }
          return previousBase(type);
        };
      }

      if (typeof normalizeFactoryPromptLibrary === "function") {
        const previousNormalize = normalizeFactoryPromptLibrary;
        normalizeFactoryPromptLibrary = function patchedNormalizeFactoryPromptLibrary(library = {}) {
          const normalized = previousNormalize(library);
          if (!String(normalized[FINAL_TYPE] || "").trim()) normalized[FINAL_TYPE] = BASE_PROMPT;
          return normalized;
        };
      }

      if (typeof factoryRouterText === "function") {
        const previousRouter = factoryRouterText;
        factoryRouterText = function patchedFactoryRouterText(type, item = {}) {
          if (type !== FINAL_TYPE) return previousRouter(type, item);
          return dynamicFinalRouter(item, previousRouter);
        };
      }
    } catch (error) {
      console.error("[Aldus] Falha ao proteger a revisão e consolidação final v128.", error);
    }
  }

  function refreshFactory() {
    try {
      if (typeof renderFactory === "function") renderFactory();
      if (typeof renderFactoryPromptLibrary === "function" && typeof elements !== "undefined" && elements?.factoryPromptLibraryPanel && !elements.factoryPromptLibraryPanel.hidden) {
        renderFactoryPromptLibrary();
      }
    } catch (error) {
      console.warn("[Aldus] Não foi possível atualizar imediatamente a interface da Fábrica.", error);
    }
  }

  function showVersion() {
    document.querySelectorAll(".app-version").forEach((element) => {
      element.textContent = `Versão: ${VERSION}`;
    });
  }

  patchPromptFunctions();
  migratePrompt();
  refreshFactory();
  showVersion();

  window.addEventListener("load", () => {
    refreshFactory();
    showVersion();
    window.setTimeout(showVersion, 1000);
  });
})();
