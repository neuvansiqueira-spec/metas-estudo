(() => {
  "use strict";

  // V635 (21/09): a triagem passa a ser ponto de partida, não teto. A regra anterior
  // (REGRA ESPECIAL DE DESEMPENHO) declarava prevalência sobre a busca da V380 e
  // dispensava a complementação quando o pacote parecia "suficiente".
  // V636 (21/09): pacote jurisprudencial do índice local. Ao gerar o prompt de
  // RESUMO/AULA + JURISPRUDÊNCIA, LEI + JURISPRUDÊNCIA ou JURISPRUDÊNCIA, busca no
  // bridge (/jurisprudencia) os informativos pertinentes do acervo exclusivo STF/STJ,
  // já extraídos no cache, e anexa a lista ao prompt. Não usa vaga do top-10 da
  // TRIAGEM e não mexe no /search. Sem bridge, o prompt segue como antes.
  const VERSION = "20260921-factory-juris-reuse-v632-v636";
  const TARGET_TYPE = "resumoAulaJurisprudencia";
  const MARKER = "REGRA DE REAPROVEITAMENTO E COMPLEMENTAÇÃO JURISPRUDENCIAL — A TRIAGEM É PONTO DE PARTIDA, NÃO TETO";
  const BRIDGE_URL = "http://127.0.0.1:8765";
  const PACOTE_TYPES = Object.freeze(["resumoAulaJurisprudencia", "leiJurisprudencia", "jurisprudencia"]);
  const PACOTE_MARKER = "PACOTE JURISPRUDENCIAL DO ÍNDICE LOCAL — PASTA EXCLUSIVA STF/STJ";
  const PACOTE_END = "FIM DO PACOTE JURISPRUDENCIAL DO ÍNDICE LOCAL";
  // Limite técnico do tamanho do bloco no prompt (não é limite jurídico): passado
  // dele, os itens restantes continuam listados, em uma linha cada, sem trechos.
  const PACOTE_MAX_CHARS = 45000;
  const PACOTE_TIMEOUT_MS = 90000;
  const pacotes = new Map();

  function promptMeta(id) {
    const escaped = CSS.escape(String(id || ""));
    const field = document.querySelector('[data-factory-prompt-text="' + escaped + '"]');
    const router = document.querySelector('[data-factory-router-text="' + escaped + '"]');
    const prompt = field?.value || "";
    const disciplina = prompt.match(/^Disciplina:\s*(.+)$/mi)?.[1]?.trim() || "";
    const tema = prompt.match(/^Tema:\s*(.+)$/mi)?.[1]?.trim() || "";
    return { field, router, disciplina, tema };
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
      "Use diretamente as fontes jurisprudenciais já identificadas e lidas na TRIAGEM ou nesta conversa. Não reabra nem releia arquivo já examinado nesta conversa, salvo para extrair trecho ainda não aproveitado. Quando este prompt trouxer o PACOTE JURISPRUDENCIAL DO ÍNDICE LOCAL, ele é o ponto de partida obrigatório: examine todos os itens dele.",
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
    setMessage(id, "Triagem jurisprudencial reaproveitada como ponto de partida; lacunas serão complementadas.");
  }

  function setMessage(id, message, alerta = false) {
    const escaped = CSS.escape(String(id || ""));
    const status = document.querySelector('[data-factory-prompt-message="' + escaped + '"]');
    if (status && message) {
      status.textContent = message;
      // V638: mesma classe de alerta do módulo do bridge (estilo injetado lá).
      status.classList.toggle("aldus-bridge-off", Boolean(alerta));
    }
  }

  function setBusy(id, busy, message, alerta = false) {
    const escaped = CSS.escape(String(id || ""));
    for (const selector of ['[data-factory-prompt-copy="' + escaped + '"]', '[data-factory-router-copy="' + escaped + '"]']) {
      const button = document.querySelector(selector);
      if (button) button.disabled = Boolean(busy);
    }
    setMessage(id, message, alerta);
  }

  function rotulo(item) {
    const partes = [item?.tribunal || "Tribunal não identificado"];
    if (item?.informativo) partes.push(`Informativo ${item.informativo}${item.edicao_extraordinaria ? " (edição extraordinária)" : ""}`);
    return partes.join(" — ");
  }

  function evidencia(item) {
    const expr = Object.entries(item?.por_expressao || {}).map(([k, v]) => `${k} ${v}`).join("; ");
    const sinais = Object.values(item?.sinais || {}).join("; ");
    return `${expr || "-"}${sinais ? ` · sinais: ${sinais}` : ""}`;
  }

  function buildJurisPackage(result) {
    const itens = Array.isArray(result?.itens) ? result.itens : [];
    const expressoes = (result?.expressoes_do_tema || []).join(" | ") || "nenhuma";
    const linhas = [
      "",
      "",
      "==============================",
      PACOTE_MARKER,
      "==============================",
      "",
      `Seleção automática do bridge local no acervo jurisprudencial exclusivo (pasta STF/STJ), com leitura do texto completo de ${result?.analisados ?? 0} arquivo(s) já extraído(s). Critério: expressões do próprio tema (${expressoes}), sem limite de quantidade.`
    ];
    if (!itens.length) {
      linhas.push(
        "",
        result?.aviso || `O índice local não encontrou informativo com as expressões do tema (${expressoes}).`,
        "Isso NÃO prova ausência de jurisprudência: faça a busca por instituto na pasta jurisprudencial exclusiva, conforme a regra de complementação deste prompt.",
        "",
        PACOTE_END
      );
      return linhas.join("\n");
    }
    linhas.push(
      "",
      `Resultado: ${result?.pertinentes ?? itens.length} informativo(s) pertinente(s)${result?.equivalentes_consolidados ? `; ${result.equivalentes_consolidados} arquivo(s) equivalente(s) (mesmo informativo) consolidado(s)` : ""}.`,
      "",
      "COMO USAR ESTE PACOTE:",
      "1. É a base OBRIGATÓRIA da camada jurisprudencial: examine TODOS os informativos listados e incorpore cada tese pertinente junto do instituto ou dispositivo correspondente.",
      "2. Os trechos vêm do próprio arquivo (texto normalizado, sem acentos). Abra o arquivo quando precisar confirmar tese, tribunal, processo, relator ou data; não invente o que o trecho não trouxer.",
      "3. O pacote NÃO é teto: instituto do resumo sem julgado aqui exige a busca direcionada da regra de complementação. Ausência no pacote não prova ausência no acervo.",
      "4. Arquivos equivalentes do mesmo informativo trazem as mesmas decisões: não repita a tese.",
      ""
    );
    let tamanho = linhas.join("\n").length;
    const compactos = [];
    itens.forEach((item, i) => {
      const cabeca = `${i + 1}. ${rotulo(item)} — ${item?.nome || "arquivo sem nome"}`;
      if (tamanho > PACOTE_MAX_CHARS) {
        compactos.push(`${cabeca} — ${item?.link || ""}`);
        return;
      }
      const bloco = [
        cabeca,
        item?.link ? `   Link: ${item.link}` : "",
        `   Evidência: ${evidencia(item)}`,
        ...(Array.isArray(item?.trechos) ? item.trechos : []).map((t) => `   Trecho: "${t}"`),
        Array.isArray(item?.equivalentes) && item.equivalentes.length ? `   Equivalente(s): ${item.equivalentes.map((e) => e.nome).join("; ")}` : ""
      ].filter(Boolean).join("\n");
      linhas.push(bloco, "");
      tamanho += bloco.length + 1;
    });
    if (compactos.length) {
      linhas.push(`Demais ${compactos.length} informativo(s) pertinente(s), listados sem trechos para não exceder o limite técnico do prompt (examine-os também):`, ...compactos, "");
    }
    const cortados = result?.cortados_por_limite_tecnico || [];
    if (cortados.length) {
      linhas.push(`Aviso técnico: ${cortados.length} item(ns) além do limite técnico do bridge (${result?.limite_tecnico}) não vieram na lista; complemente pela busca direcionada.`, "");
    }
    linhas.push(PACOTE_END);
    return linhas.join("\n");
  }

  async function fetchPacote(disciplina, tema) {
    const chave = `${disciplina}::${tema}`.toLowerCase();
    if (pacotes.has(chave)) return pacotes.get(chave);
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), PACOTE_TIMEOUT_MS) : null;
    try {
      const response = await fetch(`${BRIDGE_URL}/jurisprudencia`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disciplina, tema }),
        signal: controller?.signal
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok === false) throw new Error(result?.erro || `HTTP ${response.status}`);
      pacotes.set(chave, result);
      return result;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function appendPacote(id) {
    const meta = promptMeta(id);
    if (!meta.field || typeof meta.field.value !== "string" || !meta.tema) return;
    if (meta.field.value.includes(PACOTE_MARKER)) return;
    setBusy(id, true, "Buscando a jurisprudência pertinente no índice local…");
    try {
      const result = await fetchPacote(meta.disciplina, meta.tema);
      const atual = promptMeta(id);
      if (!atual.field || atual.field.value.includes(PACOTE_MARKER)) return;
      const bloco = buildJurisPackage(result);
      for (const field of [atual.field, atual.router]) {
        if (field && typeof field.value === "string" && !field.value.includes(PACOTE_MARKER)) {
          field.value = field.value.trimEnd() + bloco;
        }
      }
      const n = Array.isArray(result?.itens) ? result.itens.length : 0;
      setBusy(id, false, n
        ? `Pacote jurisprudencial incluído: ${n} informativo(s) pertinente(s). Prompt pronto para copiar.`
        : "Índice local sem julgado com as expressões do tema; o prompt manda buscar por instituto. Pronto para copiar.");
    } catch (_error) {
      setBusy(id, false, "⚠️ BRIDGE DESLIGADO — este prompt saiu SEM o pacote de jurisprudência do acervo STF/STJ. O guardião costuma religar o bridge em até 1 minuto: aguarde e gere o prompt de novo.", true);
    }
  }

  function handleFactoryClick(event) {
    const button = event.target?.closest?.("[data-factory-prompt]");
    if (!button) return;
    const [id, type] = String(button.dataset.factoryPrompt || "").split("|");
    if (!id || !PACOTE_TYPES.includes(type)) return;
    queueMicrotask(() => {
      if (type === TARGET_TYPE) append(id);
      appendPacote(id);
    });
  }

  function install() {
    document.addEventListener("click", handleFactoryClick, false);
    window.__ALDUS_FACTORY_JURIS_REUSE_V632__ = Object.freeze({
      version: VERSION,
      targetType: TARGET_TYPE,
      pacoteTypes: PACOTE_TYPES,
      marker: MARKER,
      pacoteMarker: PACOTE_MARKER,
      payload,
      buildJurisPackage
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();