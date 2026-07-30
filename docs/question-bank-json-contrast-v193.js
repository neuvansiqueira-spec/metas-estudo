(() => {
  "use strict";

  const VERSION = "20260730-contraste-revisao-json-qconcursos-v193";
  if (globalThis.__ALDUS_QB_JSON_CONTRAST_V193__) return;

  function installContrastStyle() {
    if (document.getElementById("aldusQbJsonContrastV193Style")) return;
    const style = document.createElement("style");
    style.id = "aldusQbJsonContrastV193Style";
    style.textContent = `
      .aldus-json-review-v192{color-scheme:light!important}
      .aldus-json-review-v192 .aldus-json-review-card-v192{background:#f8fafc!important;color:#172033!important;border:1px solid #d5dde8!important}
      .aldus-json-review-v192 .aldus-json-review-head-v192,
      .aldus-json-review-v192 .aldus-json-review-head-v192 h2,
      .aldus-json-review-v192 .aldus-json-review-head-v192 p{color:#172033!important;opacity:1!important}
      .aldus-json-review-v192 .aldus-json-review-head-v192 .eyebrow{color:#174e78!important;font-weight:800!important;letter-spacing:.04em!important}
      .aldus-json-review-v192 .aldus-json-review-stat-v192{background:#ffffff!important;border-color:#cbd5e1!important;color:#172033!important}
      .aldus-json-review-v192 .aldus-json-review-stat-v192 span{color:#526174!important;opacity:1!important;font-weight:600!important}
      .aldus-json-review-v192 .aldus-json-review-stat-v192 strong{color:#10233c!important;opacity:1!important}
      .aldus-json-review-v192 .aldus-json-review-note-v192{background:#fff8e6!important;border-color:#ddb650!important;color:#6b4b00!important;opacity:1!important}
      .aldus-json-review-v192 .aldus-json-review-table-wrap-v192{background:#ffffff!important;border-color:#cbd5e1!important}
      .aldus-json-review-v192 .aldus-json-review-table-v192{background:#ffffff!important;color:#243449!important}
      .aldus-json-review-v192 .aldus-json-review-table-v192 th{background:#0b3552!important;color:#ffe17d!important;border-bottom-color:#06263c!important;opacity:1!important}
      .aldus-json-review-v192 .aldus-json-review-table-v192 td{background:#ffffff!important;color:#243449!important;border-bottom-color:#d9e1ea!important;opacity:1!important}
      .aldus-json-review-v192 .aldus-json-review-table-v192 tbody tr:nth-child(even) td{background:#eef4f9!important}
      .aldus-json-review-v192 .aldus-json-review-table-v192 td strong,
      .aldus-json-review-v192 .aldus-json-review-code-v192{color:#103b5c!important;opacity:1!important}
      .aldus-json-review-v192 .aldus-json-review-actions-v192{background:#f8fafc!important}
      .aldus-json-review-v192 [data-json-review-cancel]{background:#fff8e6!important;border:1px solid #d6aa38!important;color:#6b4b00!important;opacity:1!important;box-shadow:none!important}
      .aldus-json-review-v192 [data-json-review-confirm]{background:linear-gradient(135deg,#3379e6,#2357b8)!important;border:1px solid #1f4fa8!important;color:#ffffff!important;opacity:1!important}
      .aldus-json-review-v192 .aldus-json-review-close-v192{background:#ffffff!important;border:1px solid #b8c5d4!important;color:#17324d!important}
      .aldus-json-review-v192 button:focus-visible{outline:3px solid #f0b429!important;outline-offset:2px!important}
    `;
    document.head.appendChild(style);
  }

  if (typeof document !== "undefined") installContrastStyle();
  const api = Object.freeze({ version: VERSION, installContrastStyle });
  globalThis.AldusQuestionBankJsonContrastV193 = api;
  globalThis.__ALDUS_QB_JSON_CONTRAST_V193__ = api;
})();
