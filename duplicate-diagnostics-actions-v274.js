(() => {
  "use strict";

  const VERSION = "20260808-duplicate-manual-overlap-actions-v274";
  const ROOT_ID = "aldusDuplicateDiagnosticsV260";

  function stateReference() {
    try {
      if (typeof state === "object" && state) return state;
    } catch {}
    return globalThis.state || null;
  }

  function cleanTitle(value) {
    return String(value ?? "")
      .replace(/^\s*\d+(?:\.\d+){0,6}\s*(?:[-–—:.)]+\s*)?/, "")
      .replace(/^\s*[-–—:.)]+\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function numericCode(value) {
    return String(value ?? "").match(/(?:^|\b)(\d+(?:\.\d+){0,6})(?=\b|\s|$)/)?.[1] || "";
  }

  function itemById(id) {
    const currentState = stateReference();
    return (Array.isArray(currentState?.syllabusItems) ? currentState.syllabusItems : [])
      .find((item) => String(item?.id || "") === String(id || "")) || null;
  }

  function itemCode(item) {
    const values = [item?.code, item?.codigo, item?.referenceCode, item?.ref, item?.reference, item?.subtopic, item?.topic];
    for (const value of values) {
      const code = numericCode(value);
      if (code) return code;
    }
    return "";
  }

  function itemTitle(item, fallback = "meta") {
    const values = [item?.subtopic, item?.topic, item?.subject, item?.title, item?.name, item?.assunto, item?.tema, item?.reference];
    for (const value of values) {
      const title = cleanTitle(value);
      if (title && /[a-zA-ZÀ-ÿ]/.test(title)) return title;
    }
    return fallback;
  }

  function shortLabel(id) {
    const item = itemById(id);
    if (!item) return "meta";
    const code = itemCode(item);
    const title = itemTitle(item, "meta");
    const compact = title.length > 34 ? `${title.slice(0, 31).trim()}…` : title;
    return [code, compact].filter(Boolean).join(" — ") || compact;
  }

  function createButton(text, className = "aldus-dup-action") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    return button;
  }

  function enhancePairCard(card) {
    if (!card || card.dataset.v274ActionsInstalled === "true") return;
    const key = String(card.dataset.v273Pair || "");
    const ids = key.split("::").filter(Boolean);
    if (ids.length !== 2 || ids[0] === ids[1]) return;

    const [firstId, secondId] = ids;
    const firstLabel = shortLabel(firstId);
    const secondLabel = shortLabel(secondId);
    const badge = String(card.querySelector(".aldus-dup-v266-badge")?.textContent || "").trim();

    const note = document.createElement("p");
    note.className = "aldus-dup-v266-warning aldus-dup-v274-manual-note";
    note.textContent = /sobreposição|relação/i.test(badge)
      ? "A classificação é informativa. A consolidação só ocorrerá se você escolher uma das opções abaixo e confirmar manualmente; uma cópia integral de segurança será criada antes da alteração."
      : "A consolidação abaixo é sempre manual e exige confirmação; uma cópia integral de segurança será criada antes da alteração.";

    const actions = document.createElement("div");
    actions.className = "aldus-dup-actions aldus-dup-v274-actions";
    actions.setAttribute("role", "group");
    actions.setAttribute("aria-label", "Decisão manual sobre o vínculo localizado");

    const keepFirst = createButton(`Manter ${firstLabel} e consolidar ${secondLabel}`, "aldus-dup-action is-primary");
    keepFirst.dataset.action = "keep";
    keepFirst.dataset.keepId = firstId;
    keepFirst.dataset.removeId = secondId;

    const keepSecond = createButton(`Manter ${secondLabel} e consolidar ${firstLabel}`, "aldus-dup-action is-primary");
    keepSecond.dataset.action = "keep";
    keepSecond.dataset.keepId = secondId;
    keepSecond.dataset.removeId = firstId;

    const separate = createButton("Manter separados");
    separate.dataset.action = "not-duplicate";
    separate.dataset.leftId = firstId;
    separate.dataset.rightId = secondId;

    const later = createButton("Analisar depois");
    later.dataset.action = "later";
    later.dataset.leftId = firstId;
    later.dataset.rightId = secondId;

    actions.append(keepFirst, keepSecond, separate, later);
    card.append(note, actions);
    card.dataset.v274ActionsInstalled = "true";
  }

  function enhanceOrphanMapping(card) {
    if (!card || card.dataset.v274OrphanExplained === "true") return;
    const status = String(card.querySelector("header strong")?.textContent || "").trim();
    if (!/meta canônica ausente/i.test(status)) return;
    const list = card.querySelector(".aldus-dup-v266-reasons");
    if (!list) return;
    const item = document.createElement("li");
    item.textContent = "Não há tombstone de exclusão disponível para esse identificador no estado atual. Uma exclusão manual antiga continua possível, mas não pode ser comprovada apenas pelos dados presentes.";
    list.appendChild(item);
    card.dataset.v274OrphanExplained = "true";
  }

  function enhance(root = document.getElementById(ROOT_ID)) {
    if (!root) return;
    root.querySelectorAll("[data-v273-pair]").forEach(enhancePairCard);
    root.querySelectorAll("[data-v273-mapping]").forEach(enhanceOrphanMapping);
  }

  function install() {
    const root = document.getElementById(ROOT_ID);
    if (!root) {
      window.setTimeout(install, 120);
      return;
    }
    enhance(root);
    const observer = new MutationObserver(() => enhance(root));
    observer.observe(root, { childList: true, subtree: true });
    globalThis.__aldusDuplicateManualActionsV274 = Object.freeze({ VERSION, enhance });
  }

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
