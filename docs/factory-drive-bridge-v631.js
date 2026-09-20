(() => {
  "use strict";

  const VERSION = "20260920-factory-drive-bridge-resumo-aula-v631";
  const TRIAGEM_MARKER = "PACOTE LOCAL DE PRÉ-TRIAGEM — GOOGLE DRIVE";
  const TRIAGEM_END = "FIM DO PACOTE LOCAL DE PRÉ-TRIAGEM";
  const RESUMO_MARKER = "PACOTE LOCAL PARA RESUMO/AULA — GOOGLE DRIVE";
  const SESSION_PREFIX = "aldus.factory.driveBridge.v631.";
  const pending = new Map();

  function normalize(value) {
    return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function key(disciplina, tema) {
    return SESSION_PREFIX + normalize(disciplina) + "::" + normalize(tema);
  }

  function promptMeta(id) {
    const escaped = CSS.escape(String(id || ""));
    const field = document.querySelector('[data-factory-prompt-text="' + escaped + '"]');
    const prompt = field?.value || "";
    const disciplina = prompt.match(/^Disciplina:\s*(.+)$/mi)?.[1]?.trim() || "";
    const tema = prompt.match(/^Tema:\s*(.+)$/mi)?.[1]?.trim() || "";
    return { field, prompt, disciplina, tema };
  }

  function extractPackage(prompt) {
    const source = String(prompt || "");
    const start = source.indexOf(TRIAGEM_MARKER);
    if (start < 0) return "";
    const end = source.indexOf(TRIAGEM_END, start);
    return (end < 0 ? source.slice(start) : source.slice(start, end + TRIAGEM_END.length)).trim();
  }

  function save(meta, packageText) {
    if (!meta.disciplina || !meta.tema || !packageText) return;
    try { sessionStorage.setItem(key(meta.disciplina, meta.tema), packageText); } catch {}
  }

  function load(meta) {
    try { return String(sessionStorage.getItem(key(meta.disciplina, meta.tema)) || "").trim(); } catch { return ""; }
  }

  function remember(id) {
    const meta = promptMeta(id);
    const packageText = extractPackage(meta.prompt);
    if (!packageText) return "";
    pending.set(String(id), packageText);
    save(meta, packageText);
    return packageText;
  }

  function wrapper(packageText) {
    return [
      "",
      "",
      "==============================",
      RESUMO_MARKER,
      "==============================",
      "",
      "Este pacote reaproveita a pré-triagem local já executada para o mesmo tema.",
      "Use PRIMEIRO os arquivos priorizados abaixo no módulo RESUMO/AULA.",
      "Respeite a classificação final da TRIAGEM: candidato automático não vira fonte RESUMO/AULA apenas por constar na lista.",
      "Não refaça varredura ampla do Drive enquanto as fontes adequadas forem suficientes.",
      "Esta lista NÃO é limite absoluto. Se faltar conteúdo necessário, houver lacuna relevante, conflito ou insuficiência documental, complemente a busca somente nas pastas autorizadas pelo prompt.",
      "Não sacrifique profundidade, completude, fidelidade documental ou qualidade para economizar tempo.",
      "",
      packageText,
      "",
      "FIM DO PACOTE LOCAL PARA RESUMO/AULA"
    ].join("\n");
  }

  function setMessage(id, message) {
    const escaped = CSS.escape(String(id || ""));
    const status = document.querySelector('[data-factory-prompt-message="' + escaped + '"]');
    if (status) status.textContent = message;
  }

  function append(id) {
    const meta = promptMeta(id);
    if (!meta.field || !meta.disciplina || !meta.tema) return;
    if (meta.field.value.includes(RESUMO_MARKER)) return;

    const packageText = pending.get(String(id)) || load(meta);
    pending.delete(String(id));
    if (!packageText) {
      setMessage(id, "Pré-triagem local não encontrada nesta sessão. Prompt original mantido.");
      return;
    }

    const escaped = CSS.escape(String(id || ""));
    const router = document.querySelector('[data-factory-router-text="' + escaped + '"]');
    const payload = wrapper(packageText);
    for (const field of [meta.field, router]) {
      if (!field || typeof field.value !== "string" || field.value.includes(RESUMO_MARKER)) continue;
      field.value = field.value.trimEnd() + payload;
    }
    setMessage(id, "Fontes da pré-triagem reaproveitadas. Prompt Resumo/Aula pronto para copiar.");
  }

  function buttonInfo(event) {
    const button = event.target?.closest?.("[data-factory-prompt]");
    if (!button) return null;
    const parts = String(button.dataset.factoryPrompt || "").split("|");
    return parts[0] && parts[1] ? { id: parts[0], type: parts[1] } : null;
  }

  function captureBeforeNative(event) {
    const info = buttonInfo(event);
    if (!info || info.type !== "resumoAula") return;
    remember(info.id);
  }

  function afterNative(event) {
    const info = buttonInfo(event);
    if (!info || info.type !== "resumoAula") return;
    queueMicrotask(() => append(info.id));
  }

  function rememberOnCopy(event) {
    const button = event.target?.closest?.("[data-factory-prompt-copy]");
    if (!button) return;
    const id = button.dataset.factoryPromptCopy;
    if (id) remember(id);
  }

  function install() {
    document.addEventListener("click", captureBeforeNative, true);
    document.addEventListener("click", afterNative, false);
    document.addEventListener("click", rememberOnCopy, false);
    window.__ALDUS_FACTORY_DRIVE_BRIDGE_V631__ = Object.freeze({ version: VERSION, target: "resumoAula", extractPackage, wrapper });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();