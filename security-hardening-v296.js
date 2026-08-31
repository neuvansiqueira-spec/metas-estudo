(() => {
  "use strict";

  const VERSION = "20260810-seguranca-estabilidade-v296";
  const MUTATION_BATCH_VERSION = "20260831-security-dom-batch-v415";
  const FILE_LIMITS = Object.freeze({
    json: 32 * 1024 * 1024,
    pdf: 120 * 1024 * 1024,
    png: 25 * 1024 * 1024
  });
  const validatedFiles = new WeakSet();
  const recentSubmits = new WeakMap();
  const pendingAddedRoots = new Set();
  let persistenceRequested = false;
  let mutationHardeningScheduled = false;
  let weeklyStatusNeedsRefresh = false;

  if (globalThis.__ALDUS_SECURITY_HARDENING_V296__) return;

  function isCrossOriginFrame() {
    if (globalThis.top === globalThis.self) return false;
    try {
      return globalThis.top.location.origin !== globalThis.location.origin;
    } catch {
      return true;
    }
  }

  function blockFramedInteraction() {
    if (!isCrossOriginFrame()) return false;
    const renderBlocker = () => {
      if (!document.body) return;
      const blocker = document.createElement("main");
      blocker.setAttribute("role", "alert");
      blocker.style.cssText = "max-width:720px;margin:12vh auto;padding:32px;font:16px/1.55 system-ui,sans-serif;color:#102a43;background:#fff;border:2px solid #b42318;border-radius:16px;box-shadow:0 18px 60px rgba(15,23,42,.22)";
      const title = document.createElement("h1");
      title.textContent = "Abertura protegida";
      const message = document.createElement("p");
      message.textContent = "Por segurança, o Aldus Meta não funciona incorporado em páginas de terceiros. Abra o endereço oficial diretamente no navegador.";
      blocker.append(title, message);
      document.body.replaceChildren(blocker);
    };
    document.documentElement.dataset.aldusFramingBlocked = "true";
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderBlocker, { once: true });
    else renderBlocker();
    return true;
  }

  function fileKind(input, file) {
    const expected = `${input?.id || ""} ${input?.accept || ""}`.toLowerCase();
    if (expected.includes("json")) return "json";
    if (expected.includes("pdf")) return "pdf";
    if (expected.includes("png")) return "png";
    const actual = `${file?.type || ""} ${file?.name || ""}`.toLowerCase();
    if (actual.includes("json")) return "json";
    if (actual.includes("pdf")) return "pdf";
    if (actual.includes("png")) return "png";
    return "";
  }

  function hasPrefix(bytes, prefix) {
    return prefix.every((value, index) => bytes[index] === value);
  }

  async function validateFile(input, file) {
    const kind = fileKind(input, file);
    if (!kind) throw new Error("Tipo de arquivo não autorizado para esta importação.");
    if (!file.size) throw new Error("O arquivo selecionado está vazio.");
    if (file.size > FILE_LIMITS[kind]) {
      const limitMb = Math.round(FILE_LIMITS[kind] / 1024 / 1024);
      throw new Error(`O arquivo excede o limite seguro de ${limitMb} MB.`);
    }

    const header = new Uint8Array(await file.slice(0, 256).arrayBuffer());
    if (kind === "pdf" && !hasPrefix(header, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
      throw new Error("O conteúdo não corresponde a um PDF válido.");
    }
    if (kind === "png" && !hasPrefix(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
      throw new Error("O conteúdo não corresponde a uma imagem PNG válida.");
    }
    if (kind === "json") {
      const prefix = new TextDecoder("utf-8", { fatal: false }).decode(header).replace(/^\ufeff/, "").trimStart();
      if (!prefix.startsWith("{") && !prefix.startsWith("[")) {
        throw new Error("O conteúdo não corresponde a um JSON válido.");
      }
    }
    return true;
  }

  function reportRejectedFile(input, error) {
    const message = `Importação bloqueada por segurança: ${String(error?.message || error)}`;
    input.value = "";
    globalThis.dispatchEvent(new CustomEvent("aldus:unsafe-file-blocked", {
      detail: Object.freeze({ version: VERSION, inputId: input.id || "", message })
    }));
    globalThis.alert?.(message);
  }

  function guardFileChange(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
    const file = input.files?.[0];
    if (!file) return;
    if (validatedFiles.has(file)) {
      validatedFiles.delete(file);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    validateFile(input, file).then(() => {
      validatedFiles.add(file);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }).catch((error) => reportRejectedFile(input, error));
  }

  function isAllowedLink(anchor) {
    const raw = String(anchor.getAttribute("href") || "").trim();
    if (!raw || raw.startsWith("#")) return true;
    let url;
    try {
      url = new URL(raw, document.baseURI);
    } catch {
      return false;
    }
    if (url.protocol === "http:" || url.protocol === "https:") return true;
    return url.protocol === "blob:" && anchor.hasAttribute("download");
  }

  function hardenAnchor(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.target === "_blank") anchor.rel = "noopener noreferrer";
  }

  function guardLinkClick(event) {
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor) return;
    hardenAnchor(anchor);
    if (isAllowedLink(anchor)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    globalThis.alert?.("Este endereço foi bloqueado porque utiliza um protocolo não permitido.");
  }

  function hardenAddedLinks(root = document) {
    if (root instanceof HTMLAnchorElement) hardenAnchor(root);
    root.querySelectorAll?.("a[target='_blank']").forEach(hardenAnchor);
  }

  function simplifyWeeklyGoalStatus() {
    const status = document.getElementById("weeklyGoalStatus");
    if (!status) return;
    const current = String(status.textContent || "");
    const simplified = current.replace(/\s+registradas\b/iu, "").trim();
    if (simplified !== current) status.textContent = simplified;
  }

  function isWeeklyStatusMutation(record) {
    const target = record?.target;
    if (target instanceof Element && (target.id === "weeklyGoalStatus" || target.closest?.("#weeklyGoalStatus"))) return true;
    return [...(record?.addedNodes || [])].some((node) => node instanceof Element
      && (node.id === "weeklyGoalStatus" || Boolean(node.querySelector?.("#weeklyGoalStatus"))));
  }

  function flushMutationHardening() {
    mutationHardeningScheduled = false;
    const roots = [...pendingAddedRoots].filter((root) => root?.isConnected);
    pendingAddedRoots.clear();

    if (roots.length > 24) hardenAddedLinks(document);
    else roots.forEach(hardenAddedLinks);

    if (weeklyStatusNeedsRefresh) {
      weeklyStatusNeedsRefresh = false;
      simplifyWeeklyGoalStatus();
    }
  }

  function scheduleMutationHardening(records) {
    for (const record of records) {
      if (isWeeklyStatusMutation(record)) weeklyStatusNeedsRefresh = true;
      record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) pendingAddedRoots.add(node);
      });
    }
    if (mutationHardeningScheduled || (!pendingAddedRoots.size && !weeklyStatusNeedsRefresh)) return;
    mutationHardeningScheduled = true;
    if (typeof globalThis.requestIdleCallback === "function") {
      globalThis.requestIdleCallback(flushMutationHardening, { timeout: 300 });
    } else {
      globalThis.setTimeout(flushMutationHardening, 0);
    }
  }

  function guardRapidSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const now = Date.now();
    const previous = recentSubmits.get(form) || 0;
    recentSubmits.set(form, now);
    if (now - previous >= 800) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  async function requestPersistentStorage() {
    if (persistenceRequested) return;
    persistenceRequested = true;
    try {
      if (!navigator.storage?.persist || await navigator.storage.persisted?.()) return;
      await navigator.storage.persist();
    } catch {}
  }

  const framingBlocked = blockFramedInteraction();
  if (!framingBlocked) {
    document.addEventListener("change", guardFileChange, true);
    document.addEventListener("click", guardLinkClick, true);
    document.addEventListener("submit", guardRapidSubmit, true);
    document.addEventListener("pointerdown", requestPersistentStorage, { once: true, capture: true });
    document.addEventListener("keydown", requestPersistentStorage, { once: true, capture: true });
    const prepareDocument = () => {
      hardenAddedLinks();
      simplifyWeeklyGoalStatus();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", prepareDocument, { once: true });
    else prepareDocument();

    const observer = new MutationObserver(scheduleMutationHardening);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  globalThis.__ALDUS_SECURITY_HARDENING_V296__ = Object.freeze({
    version: VERSION,
    mutationBatchVersion: MUTATION_BATCH_VERSION,
    fileLimits: FILE_LIMITS,
    framingBlocked,
    validateFile,
    isAllowedLink
  });
})();
