(() => {
  "use strict";

  const VERSION = "20260824-final-review-consolidation-v384-compat";
  const API_MARKER = "__aldusFactoryFinalReviewCompatV384";
  const WRAP_MARKER = "__aldusFactoryFinalReviewCompatWrappedV384";
  const FINAL_ROUTER_MARKER = "__aldusFactoryFinalReviewRouterWrappedV384";
  const FINAL_ROUTER_VERSION = "20260824-final-review-consolidation-v384";
  const FINAL_TYPE = "consolidacao";

  function removeRangeKeepingSecond(text, firstMarker, secondMarker = firstMarker) {
    const source = String(text || "");
    const first = source.indexOf(firstMarker);
    if (first < 0) return source;
    const second = source.indexOf(secondMarker, first + firstMarker.length);
    if (second < 0) return source;
    return `${source.slice(0, first).trimEnd()}\n\n${source.slice(second).trimStart()}`;
  }

  function stripLegacyFinalOutput(value) {
    let text = String(value || "");

    const singleOld = "MODO AUTOMÁTICO: REFINAMENTO FINAL DE MÓDULO ÚNICO.";
    const singleNew = "MODO AUTOMÁTICO: REFINAMENTO FINAL DE PRODUTO ÚNICO.";
    const singleStart = text.indexOf(singleOld);
    if (singleStart >= 0) {
      const singleNext = text.indexOf(singleNew, singleStart + singleOld.length);
      if (singleNext >= 0) {
        text = `${text.slice(0, singleStart).trimEnd()}\n\n${text.slice(singleNext).trimStart()}`;
      }
    }

    const multiOld = "MODO AUTOMÁTICO: REVISÃO E CONSOLIDAÇÃO FINAL DE MÚLTIPLOS MÓDULOS.";
    const multiNew = "MODO AUTOMÁTICO: REVISÃO E CONSOLIDAÇÃO FINAL DE MÚLTIPLOS PRODUTOS.";
    const multiStart = text.indexOf(multiOld);
    if (multiStart >= 0) {
      const multiNext = text.indexOf(multiNew, multiStart + multiOld.length);
      if (multiNext >= 0) {
        text = `${text.slice(0, multiStart).trimEnd()}\n\n${text.slice(multiNext).trimStart()}`;
      }
    }

    const blocked = "REVISÃO E CONSOLIDAÇÃO FINAL — BLOQUEADA COM SEGURANÇA.";
    text = removeRangeKeepingSecond(text, blocked);
    return text;
  }

  function install() {
    try {
      if (typeof factoryRouterText !== "function") return false;
      if (factoryRouterText?.[WRAP_MARKER] === VERSION) return true;
      const previous = factoryRouterText;
      const wrapped = function(type, item = {}) {
        const result = previous(type, item);
        return type === FINAL_TYPE ? stripLegacyFinalOutput(result) : result;
      };
      Object.defineProperty(wrapped, WRAP_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, FINAL_ROUTER_MARKER, { value: FINAL_ROUTER_VERSION });
      Object.defineProperty(wrapped, "__aldusFactoryFinalReviewCompatOriginal", { value: previous });
      factoryRouterText = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  const api = Object.freeze({
    version: VERSION,
    finalRouterMarker: FINAL_ROUTER_MARKER,
    finalRouterVersion: FINAL_ROUTER_VERSION,
    stripLegacyFinalOutput,
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
