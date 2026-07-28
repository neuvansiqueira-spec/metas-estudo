(() => {
  "use strict";

  const PATCH_VERSION = "20260727-fabrica-polimento-visual-v164";
  const METADATA_SEGMENTS = new Set([
    "estudo",
    "estudo novo",
    "meta de reforco",
    "reforco",
    "revisao",
    "questoes",
    "meta concluida",
    "em andamento",
    "meta pendente",
    "material ja disponivel",
    "material a produzir"
  ]);

  if (typeof document === "undefined" || globalThis.__ALDUS_FACTORY_POLISH_V164__) return;

  let summaryScheduled = false;

  function canonical(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sameTheme(segment, title) {
    const left = canonical(segment);
    const right = canonical(title);
    if (!left || !right) return false;
    if (left === right) return true;
    const shorter = left.length <= right.length ? left : right;
    const longer = left.length > right.length ? left : right;
    return longer.startsWith(shorter) && shorter.length / longer.length >= 0.9;
  }

  function uniqueText(values) {
    const seen = new Set();
    return values.filter((value) => {
      const key = canonical(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function setSummaryLine(paragraph, label, values) {
    const cleanValues = uniqueText(values);
    if (!cleanValues.length) {
      paragraph.hidden = true;
      return;
    }

    paragraph.hidden = false;
    paragraph.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = label;
    paragraph.append(strong, document.createTextNode(` ${cleanValues.join(" • ")}`));
    paragraph.dataset.factoryPolishedV164 = "true";
  }

  function polishSummaryCard() {
    const card = document.querySelector("#factorySummary .factory-summary-now");
    const title = card?.querySelector(".factory-theme-title")?.textContent?.trim() || "";
    const paragraph = card?.querySelector(".factory-theme-recorte");
    if (!card || !title || !paragraph || paragraph.dataset.factoryPolishedV164 === "true") return;

    const raw = paragraph.textContent
      .replace(/^\s*Recorte da meta:\s*/i, "")
      .trim();

    const segments = uniqueText(
      raw.split(/\s*•\s*/).map((segment) => segment.trim()).filter(Boolean)
    ).filter((segment) => !sameTheme(segment, title));

    const metadata = segments.filter((segment) => METADATA_SEGMENTS.has(canonical(segment)));
    const distinctRecorte = segments.filter((segment) => !METADATA_SEGMENTS.has(canonical(segment)));

    if (distinctRecorte.length) {
      setSummaryLine(paragraph, "Recorte da meta:", [...distinctRecorte, ...metadata]);
      return;
    }

    setSummaryLine(paragraph, "Situação:", metadata);
  }

  function scheduleSummaryPolish() {
    if (summaryScheduled) return;
    summaryScheduled = true;
    queueMicrotask(() => {
      summaryScheduled = false;
      polishSummaryCard();
    });
  }

  function injectStyles() {
    if (document.getElementById("factoryPolishStylesV164")) return;
    const style = document.createElement("style");
    style.id = "factoryPolishStylesV164";
    style.textContent = `
      #view-fabrica-resumos.factory-simple-v163 > details.factory-top-panel-v163 > summary::after,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-filter-panel > summary::after,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-register-panel > summary::after {
        content: "" !important;
        display: block;
        flex: 0 0 auto;
        width: 9px;
        height: 9px;
        margin: 0 5px 3px 12px;
        border: 0 !important;
        border-right: 2px solid rgba(221, 235, 245, .88) !important;
        border-bottom: 2px solid rgba(221, 235, 245, .88) !important;
        font-size: 0 !important;
        line-height: 0 !important;
        opacity: .9;
        transform: rotate(-45deg) !important;
        transform-origin: 55% 55%;
        transition: transform .2s ease, border-color .2s ease, opacity .2s ease !important;
      }
      #view-fabrica-resumos.factory-simple-v163 > details[open].factory-top-panel-v163 > summary::after,
      #view-fabrica-resumos.factory-simple-v163 > details[open].factory-filter-panel > summary::after,
      #view-fabrica-resumos.factory-simple-v163 > details[open].factory-register-panel > summary::after {
        transform: rotate(45deg) !important;
      }
      #view-fabrica-resumos.factory-simple-v163 > details.factory-top-panel-v163 > summary:hover::after,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-filter-panel > summary:hover::after,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-register-panel > summary:hover::after,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-top-panel-v163 > summary:focus-visible::after,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-filter-panel > summary:focus-visible::after,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-register-panel > summary:focus-visible::after {
        border-color: #f2cf65 !important;
        opacity: 1;
      }
      #view-fabrica-resumos.factory-simple-v163 #factorySummary .factory-summary-now .factory-theme-recorte {
        max-width: 42rem;
        line-height: 1.45;
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    const view = document.getElementById("view-fabrica-resumos");
    const summary = document.getElementById("factorySummary");
    const simpleStyles = document.getElementById("factorySimpleStylesV163");

    if (!view || !summary || !simpleStyles || view.dataset.factorySimpleV163 !== "true") {
      console.error("[Fábrica v164] O polimento visual não pôde ser instalado. Nenhum dado foi alterado.");
      return;
    }

    injectStyles();
    scheduleSummaryPolish();

    const observer = new MutationObserver(() => scheduleSummaryPolish());
    observer.observe(summary, { childList: true, subtree: true });

    Object.defineProperty(globalThis, "__ALDUS_FACTORY_POLISH_V164__", {
      value: Object.freeze({
        version: PATCH_VERSION,
        installedAt: new Date().toISOString(),
        scope: "visual-only"
      }),
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => install(), { once: true });
  } else {
    install();
  }
})();
