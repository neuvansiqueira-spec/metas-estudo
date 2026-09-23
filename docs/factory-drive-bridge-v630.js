(() => {
  "use strict";

  const VERSION = "20260920-factory-drive-bridge-v630";
  const BRIDGE_URL = "http://127.0.0.1:8765";
  const STATUS_ID = "factoryDriveBridgeStatusV630";
  const PACKAGE_MARKER = "PACOTE LOCAL DE PRÉ-TRIAGEM — GOOGLE DRIVE";
  const cache = new Map();

  // V638: o estado "sem bridge" tinha a mesma aparência do estado normal, e em 22/09/2026
  // vários prompts foram gerados sem pré-triagem sem que isso fosse percebido.
  const ALERT_STYLE_ID = "aldusBridgeAlertaEstiloV638";

  function ensureAlertStyle() {
    if (document.getElementById(ALERT_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = ALERT_STYLE_ID;
    style.textContent = `
      #${STATUS_ID}.aldus-bridge-off,
      [data-factory-prompt-message].aldus-bridge-off {
        color: #fecaca;
        background: rgba(220, 38, 38, .18);
        border: 1px solid rgba(220, 38, 38, .65);
        border-radius: 10px;
        padding: 6px 10px;
        font-weight: 700;
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeKey(value = "") {
    return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function bridgeKey(disciplina, tema) {
    return `${normalizeKey(disciplina)}::${normalizeKey(tema)}`;
  }

  async function bridgeFetch(path, options = {}) {
    const response = await fetch(`${BRIDGE_URL}${path}`, {
      cache: "no-store",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.erro || `Bridge respondeu HTTP ${response.status}`);
    }
    return payload;
  }

  function ensureStatusControl() {
    const actions = document.querySelector("#view-fabrica-resumos .factory-settings-actions");
    if (!actions) return null;
    let button = document.getElementById(STATUS_ID);
    if (button) return button;

    button = document.createElement("button");
    button.id = STATUS_ID;
    button.type = "button";
    button.className = "secondary-button";
    button.textContent = "Drive Bridge: verificando…";
    button.title = "Verifica a conexão local com o índice do Google Drive.";
    button.addEventListener("click", () => checkHealth(true));
    actions.appendChild(button);
    return button;
  }

  async function checkHealth(forceMessage = false) {
    const button = ensureStatusControl();
    if (!button) return false;
    button.disabled = true;
    button.textContent = "Drive Bridge: verificando…";
    try {
      const health = await bridgeFetch("/health", { method: "GET", headers: {} });
      const total = Number(health.main_index_files || 0).toLocaleString("pt-BR");
      button.textContent = `Drive Bridge: conectado • ${total} arquivos`;
      button.classList.remove("aldus-bridge-off");
      button.title = "Bridge local em modo somente leitura. Clique para verificar novamente.";
      if (forceMessage) button.blur();
      return true;
    } catch (error) {
      button.textContent = "⚠️ Drive Bridge: DESCONECTADO";
      button.classList.add("aldus-bridge-off");
      button.title = "Mantenha o CMD do bridge aberto. Se o navegador pedir acesso à rede local, permita.";
      return false;
    } finally {
      button.disabled = false;
    }
  }

  function promptMeta(id) {
    const selectorId = CSS.escape(String(id || ""));
    const textarea = document.querySelector(`[data-factory-prompt-text="${selectorId}"]`);
    const prompt = textarea?.value || "";
    const disciplina = prompt.match(/^Disciplina:\s*(.+)$/mi)?.[1]?.trim() || "";
    const tema = prompt.match(/^Tema:\s*(.+)$/mi)?.[1]?.trim() || "";
    return { textarea, prompt, disciplina, tema };
  }

  function plainSnippet(item) {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") return item.trecho || item.texto || item.snippet || JSON.stringify(item);
    return "";
  }

  function compactText(text, limit = 520) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean;
  }

  function buildCandidatePackage(result) {
    const rows = Array.isArray(result?.resultados) ? result.resultados : [];
    const categorySummary = Object.entries(result?.categorias || {})
      .map(([key, value]) => `${key}: ${value}`)
      .join(" • ");

    const header = [
      "",
      "",
      "==============================",
      PACKAGE_MARKER,
      "==============================",
      "",
      "Esta pré-busca foi executada pelo bridge local em modo SOMENTE LEITURA.",
      "O índice principal contém 4.850 arquivos. A busca local consultou o acervo e analisou os candidatos mais aderentes antes de gerar este pacote.",
      "Use PRIMEIRO os arquivos abaixo na triagem. Não refaça uma varredura ampla das pastas enquanto estes candidatos forem suficientes.",
      "Se o conjunto abaixo for insuficiente para alguma categoria obrigatória, aí sim complemente a busca nas pastas originais.",
      "A categoria indicada pelo bridge é apenas sugestão automática: a classificação final continua sendo feita pela TRIAGEM, após leitura do conteúdo.",
      "",
      `Candidatos encontrados pela API: ${result?.total_candidatos_api ?? 0}`,
      `Arquivos efetivamente analisados: ${result?.total_analisados ?? 0}`,
      `Arquivos selecionados para leitura prioritária: ${result?.total_selecionados ?? rows.length}`,
      categorySummary ? `Sugestões automáticas: ${categorySummary}` : ""
    ].filter(Boolean);

    const body = rows.map((item, index) => {
      const snippets = (Array.isArray(item?.trechos) ? item.trechos : [])
        .map(plainSnippet)
        .filter(Boolean)
        .slice(0, 2)
        .map((text, i) => `  Trecho ${i + 1}: ${compactText(text)}`);
      return [
        "",
        `${index + 1}. ${item?.nome || "Arquivo sem nome"}`,
        item?.caminho ? `   Caminho: ${item.caminho}` : "",
        `   Score de aderência: ${item?.score ?? "-"}`,
        `   Categoria sugerida: ${item?.categoria_sugerida || "REVISAR"}`,
        item?.possivel_duplicidade ? "   Atenção: possível duplicidade detectada." : "",
        ...snippets
      ].filter(Boolean).join("\n");
    });

    return [...header, ...body, "", "FIM DO PACOTE LOCAL DE PRÉ-TRIAGEM"].join("\n");
  }

  function appendPackage(id, result) {
    const escaped = CSS.escape(String(id || ""));
    const full = document.querySelector(`[data-factory-prompt-text="${escaped}"]`);
    const router = document.querySelector(`[data-factory-router-text="${escaped}"]`);
    const packageText = buildCandidatePackage(result);

    for (const field of [full, router]) {
      if (!field || typeof field.value !== "string") continue;
      if (field.value.includes(PACKAGE_MARKER)) continue;
      field.value = `${field.value.trimEnd()}${packageText}`;
    }
  }

  function setPromptBusy(id, busy, message = "", alerta = false) {
    const escaped = CSS.escape(String(id || ""));
    const copy = document.querySelector(`[data-factory-prompt-copy="${escaped}"]`);
    const routerCopy = document.querySelector(`[data-factory-router-copy="${escaped}"]`);
    const status = document.querySelector(`[data-factory-prompt-message="${escaped}"]`);
    if (copy) copy.disabled = Boolean(busy);
    if (routerCopy) routerCopy.disabled = Boolean(busy);
    if (status && message) {
      status.textContent = message;
      status.classList.toggle("aldus-bridge-off", Boolean(alerta));
    }
  }

  async function enrichTriagemPrompt(id) {
    const meta = promptMeta(id);
    if (!meta.textarea || !meta.disciplina || !meta.tema) return;

    if (meta.textarea.value.includes(PACKAGE_MARKER)) {
      setPromptBusy(id, false, "Pré-triagem local já incluída.");
      return;
    }

    const key = bridgeKey(meta.disciplina, meta.tema);
    if (cache.has(key)) {
      appendPackage(id, cache.get(key));
      setPromptBusy(id, false, "Pré-triagem local incluída. Prompt pronto para copiar.");
      return;
    }

    setPromptBusy(id, true, "Pesquisando fontes no Drive pelo bridge local…");
    try {
      const result = await bridgeFetch("/search", {
        method: "POST",
        body: JSON.stringify({
          disciplina: meta.disciplina,
          tema: meta.tema,
          modo: "triagem",
          limite: 10
        })
      });
      cache.set(key, result);
      appendPackage(id, result);
      setPromptBusy(id, false, `Pré-triagem concluída: ${result.total_selecionados || 0} arquivo(s) priorizado(s). Prompt pronto para copiar.`);
      checkHealth(false);
    } catch (error) {
      setPromptBusy(id, false, "⚠️ BRIDGE DESLIGADO — este prompt saiu SEM a pré-triagem do Drive e SEM o pacote de jurisprudência. Prompt original mantido; o guardião costuma religar o bridge em até 1 minuto: aguarde e gere o prompt de novo.", true);
      checkHealth(false);
    }
  }

  function handleFactoryClick(event) {
    const button = event.target?.closest?.("[data-factory-prompt]");
    if (!button) return;
    const raw = String(button.dataset.factoryPrompt || "");
    const [id, type] = raw.split("|");
    if (!id || type !== "triagem") return;

    // O handler nativo da Fábrica está no #factoryList e executa antes deste
    // listener no document. Assim, o textarea já existe quando chegamos aqui.
    queueMicrotask(() => enrichTriagemPrompt(id));
  }

  function install() {
    ensureAlertStyle();
    ensureStatusControl();
    document.addEventListener("click", handleFactoryClick, false);
    checkHealth(false);

    const observer = new MutationObserver(() => ensureStatusControl());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.__ALDUS_FACTORY_DRIVE_BRIDGE_V630__ = {
      version: VERSION,
      bridgeUrl: BRIDGE_URL,
      checkHealth,
      buildCandidatePackage
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
