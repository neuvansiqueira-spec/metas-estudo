(() => {
  "use strict";
  if (typeof document === "undefined") return;
  const current = document.currentScript;
  const script = document.createElement("script");
  script.id = "aldusAppBundleScript";
  script.src = "app-v158.js?v=20260727-fabrica-plano-dia-v159";
  script.async = false;
  (current?.parentNode || document.head || document.documentElement).insertBefore(script, current?.nextSibling || null);
})();
