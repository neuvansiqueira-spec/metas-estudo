(() => {
  "use strict";

  // V635 (21/09): a triagem passa a ser ponto de partida, não teto. A regra anterior
  // (REGRA ESPECIAL DE DESEMPENHO) declarava prevalência sobre a busca da V380 e
  // dispensava a complementação quando o pacote parecia "suficiente".
  const VERSION = "20260921-factory-juris-reuse-v632-v635";
  const TARGET_TYPE = "resumoAulaJurisprudencia";
  const MARKER = "REGRA DE REAPROVEITAMENTO E COMPLEMENTAÇÃO JURISPRUDENCIAL — A TRIAGEM É PONTO DE PARTIDA, NÃO TETO";

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
      "Esta regra define a ORDEM da busca jurisprudencial. Ela não substitui, não reduz e não prevalece sobre a metodologia de busca do módulo integrado RESUMO/AULA + JURISPRUDÊNCIA: reaproveitar fontes elimina releitura, não elimina a busca pelo que ainda falta.",
      "",
      "1. REUTILIZE TUDO O QUE JÁ FOI ENCONTRADO.",
      "Use diretamente as fontes jurisprudenciais já identificadas e lidas na TRIAGEM ou nesta conversa. Não reabra nem releia arquivo já examinado nesta conversa, salvo para extrair trecho ainda não aproveitado.",
      "",
      "2. VERIFIQUE A COBERTURA JURISPRUDENCIAL MATERIAL DO TEMA.",
      "Liste internamente os institutos e subtemas tratados no resumo. Para cada um, verifique se já há jurisprudência pertinente identificada: tese, súmula, tema repetitivo, repercussão geral ou informativo.",
      "",
      "3. CONSULTE O ÍNDICE DA PASTA JURISPRUDENCIAL.",
      "Para cada instituto ou subtema sem cobertura, pesquise por termos na pasta jurisprudencial exclusiva (nome do instituto, sinônimos, artigo de lei, súmula ou tema), usando a busca indexada do Drive, e abra os resultados pertinentes. Isso evita reler a pasta inteira e não dispensa a leitura do conteúdo efetivo dos arquivos candidatos.",
      "",
      "4. IDENTIFIQUE A JURISPRUDÊNCIA PERTINENTE AINDA AUSENTE.",
      "Todo entendimento materialmente relevante localizado e ainda não aproveitado deve ser lido e incorporado no ponto do instituto correspondente.",
      "",
      "5. COMPLEMENTE OBRIGATORIAMENTE QUANDO HOUVER LACUNA.",
      "Havendo instituto ou subtema sem cobertura, a complementação é obrigatória. Se as buscas direcionadas não bastarem, aplique a varredura recursiva prevista no módulo integrado. Continua valendo a regra do módulo integrado: só declare ausência de jurisprudência diretamente relevante depois da varredura recursiva completa e da leitura dos candidatos acessíveis.",
      "",
      "SIGNIFICADO DE \"SUFICIENTE\":",
      "\"Suficiente\" significa somente cobertura material suficiente de TODOS os institutos e subtemas do resumo. Haver alguma jurisprudência no pacote ou na TRIAGEM não torna a cobertura suficiente. A classificação \"SUFICIENTE\" dada pela TRIAGEM não dispensa as etapas 2 a 5.",
      "",
      "SE A TRIAGEM NÃO ESTIVER DISPONÍVEL NESTA CONVERSA:",
      "Execute as etapas 2 a 5 diretamente na pasta jurisprudencial exclusiva, com a metodologia de busca do módulo integrado.",
      "",
      "NÃO REDUZA A QUALIDADE:",
      "Não omita tese relevante, requisito, condição, exceção, distinção, divergência ou evolução. A otimização elimina repetição de busca e de leitura, não conteúdo jurídico.",
      "",
      "FIM DA REGRA DE REAPROVEITAMENTO E COMPLEMENTAÇÃO JURISPRUDENCIAL"
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
    if (status) status.textContent = "Triagem jurisprudencial reaproveitada como ponto de partida; lacunas serão complementadas.";
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