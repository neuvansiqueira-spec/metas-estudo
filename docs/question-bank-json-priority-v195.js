(() => {
  "use strict";

  const VERSION = "20260730-prioridade-revisao-json-qconcursos-v195";
  if (globalThis.__ALDUS_QB_JSON_PRIORITY_V195__) return;

  function priorityJsonReview(event) {
    const target = event?.target;
    if (!target || target.id !== "qbFile" || !target.files?.[0]) return;
    const review = globalThis.AldusQuestionBankJsonReviewV192;
    if (!review?.handleJsonChange) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void review.handleJsonChange(event);
  }

  if (typeof window !== "undefined") {
    window.addEventListener("change", priorityJsonReview, true);
  }

  const api = Object.freeze({ version: VERSION, priorityJsonReview });
  globalThis.AldusQuestionBankJsonPriorityV195 = api;
  globalThis.__ALDUS_QB_JSON_PRIORITY_V195__ = api;
})();
