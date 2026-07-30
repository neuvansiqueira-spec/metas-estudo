(() => {
  "use strict";

  if (globalThis.__aldusDailyPieceAuditPreludeV186) return;
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;

  const suppressedTypes = new Set([
    "aldus:bootstrap-ready",
    "aldus:post-bootstrap-maintenance-complete",
    "pageshow"
  ]);
  const originalAddEventListener = window.addEventListener;
  const originalBootstrapReady = globalThis.__aldusBootstrapReady;
  const suppressed = [];

  try {
    if (originalBootstrapReady) globalThis.__aldusBootstrapReady = false;
  } catch {}

  window.addEventListener = function suppressLegacyDailyPieceAuditV186(type, listener, options) {
    if (suppressedTypes.has(type)) {
      suppressed.push({ type, listener, options });
      return undefined;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  globalThis.__aldusDailyPieceAuditPreludeV186 = {
    version: "20260730-auditoria-peca-consolidada-v186",
    originalAddEventListener,
    originalBootstrapReady,
    suppressed
  };
})();
