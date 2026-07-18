(() => {
  "use strict";

  const THEME_VERSION = "20260717-premium-estavel-v46";
  const root = document.documentElement;

  root.dataset.aldusTheme = "premium-stable";
  document.title = "Aldus Metas Concurso — Painel de Estudos";

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", "#031426");

  if (!document.getElementById("aldusPremiumStableTheme")) {
    const link = document.createElement("link");
    link.id = "aldusPremiumStableTheme";
    link.rel = "stylesheet";
    link.href = `aldus-premium-stable-v46.css?v=${THEME_VERSION}`;
    link.addEventListener("error", () => {
      delete root.dataset.aldusTheme;
      link.remove();
      console.warn("[Aldus] Tema premium indisponível; visual clássico mantido.");
    }, { once: true });
    document.head.appendChild(link);
  }
})();