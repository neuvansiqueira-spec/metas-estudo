(() => {
  "use strict";

  const VERSION = "20260920-factory-juris-reuse-v632";
  const TARGET_TYPE = "resumoAulaJurisprudencia";
  const MARKER = "REGRA ESPECIAL DE DESEMPENHO — REAPROVEITAMENTO DA TRIAGEM JURISPRUDENCIAL";

  function promptMeta(id) {
    const escaped = CSS.escape(String(id || ""));
    const field = document.querySelector('[data-factory-prompt-text="' + escaped + '"]');
    const router = document.querySelector('[data-factory-router-text="' + escaped + '"]');
    return { field, router };
  }

  function payload() {
    return [
      "",
      "",
      "==============================",
      MARKER,
      "==============================",
      "",
      "Esta regra é específica desta etapa e PREVALECE sobre qualquer instrução anterior que determine inventário completo, varredura recursiva total ou releitura integral de toda a pasta jurisprudencial.",
      "",
      "1. REUTILIZE A TRIAGEM JÁ CONCLUÍDA.",
      "Se a TRIAGEM imediatamente anterior classificou JURISPRUDÊNCIA como SUFICIENTE e já identificou fontes principais, secundárias ou de apoio, use essas fontes diretamente.",
      "Não refaça inventário geral de STF/STJ, não percorra todos os anos e não repita buscas amplas apenas para confirmar o que a TRIAGEM já consolidou.",
      "",
      "2. LEITURA DIRECIONADA.",
      "Abra somente as fontes jurisprudenciais já aprovadas na TRIAGEM e os trechos necessários para extrair ou confirmar as teses relacionadas aos institutos efetivamente tratados no RESUMO/AULA.",
      "",
      "3. BUSCA COMPLEMENTAR SOMENTE SE HOUVER LACUNA CONCRETA.",
      "Faça busca adicional na pasta jurisprudencial exclusiva apenas quando faltar jurisprudência para um ponto material relevante, houver conflito entre fontes, arquivo essencial estiver inacessível/ilegível ou a TRIAGEM tiver classificado JURISPRUDÊNCIA como PARCIALMENTE SUFICIENTE/INSUFICIENTE.",
      "Quando complementar, faça pesquisa direcionada pelo instituto específico e encerre a busca assim que a lacuna estiver resolvida.",
      "",
      "4. NÃO REDUZA A QUALIDADE.",
      "Não omita tese relevante, requisito, condição, exceção, distinção ou evolução já identificada nas fontes aprovadas.",
      "A otimização elimina repetição de busca, não conteúdo jurídico.",
      "",
      "5. SE A TRIAGEM NÃO ESTIVER DISPONÍVEL NESTA CONVERSA.",
      "Não faça inventário recursivo completo por padrão. Use a pasta jurisprudencial exclusiva com buscas direcionadas ao tema e aos institutos do resumo, priorizando arquivos claramente pertinentes; amplie somente se os resultados forem insuficientes.",
      "",
      "FIM DA REGRA ESPECIAL DE REAPROVEITAMENTO"
    ].join("\n");
  }

  function append(id) {
    const { field, router } = promptMeta(id);
    if (!field || typeof field.value !== "string") return;
    if (field.value.includes(MARKER)) return;

    const block = payload();
    field.value = field.value.trimEnd() + block;
    if (router && typeof router.value === "string" && !router.value.includes(MARKER)) {
      router.value = router.value.trimEnd() + block;
    }

    const escaped = CSS.escape(String(id || ""));
    const status = document.querySelector('[data-factory-prompt-message="' + escaped + '"]');
    if (status) status.textContent = "Triagem jurisprudencial será reaproveitada; nova varredura ampla foi desativada.";
  }

  function handleFactoryClick(event) {
    const button = event.target?.closest?.("[data-factory-prompt]");
    if (!button) return;
    const [id, type] = String(button.dataset.factoryPrompt || "").split("|");
    if (!id || type !== TARGET_TYPE) return;
    queueMicrotask(() => append(id));
  }

  function install() {
    document.addEventListener("click", handleFactoryClick, false);
    window.__ALDUS_FACTORY_JURIS_REUSE_V632__ = Object.freeze({
      version: VERSION,
      targetType: TARGET_TYPE,
      marker: MARKER,
      payload
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();