(() => {
  "use strict";
  if (typeof document === "undefined") return;

  const current = document.currentScript;
  const parent = current?.parentNode || document.head || document.documentElement;
  const insertionPoint = current?.nextSibling || null;

  const script = document.createElement("script");
  script.id = "aldusAppBundleScript";
  script.src = "app-v158.js?v=20260727-fabrica-plano-dia-v159";
  script.async = false;
  parent.insertBefore(script, insertionPoint);

  const timerFirstBeepFix = document.createElement("script");
  timerFirstBeepFix.id = "aldusTimerFirstBeepV160";
  timerFirstBeepFix.src = "timer-first-beep-v160.js?v=20260727-cronometro-primeiro-bip-v160";
  timerFirstBeepFix.async = false;
  parent.insertBefore(timerFirstBeepFix, script.nextSibling);
})();