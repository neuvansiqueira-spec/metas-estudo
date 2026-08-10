(() => {
  "use strict";

  const VERSION = "20260810-revisao-json-explicacoes-v299";
  const GLOBAL_KEY = "__aldusQuestionBankJsonDetailsV299";
  if (globalThis[GLOBAL_KEY]) return;

  function text(value) {
    if (Array.isArray(value)) return value.map(text).filter(Boolean).join("\n\n");
    if (value && typeof value === "object") {
      return text(value.texto ?? value.text ?? value.conteudo ?? value.content ?? value.valor ?? value.value ?? "");
    }
    return String(value ?? "").trim();
  }

  function firstText(...values) {
    for (const value of values) {
      const candidate = text(value);
      if (candidate) return candidate;
    }
    return "";
  }

  function html(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function sourceItems(payload) {
    if (Array.isArray(payload)) return payload;
    return payload?.questionBank || payload?.questoes || payload?.questions || payload?.items || [];
  }

  function detailsFromRaw(raw = {}) {
    return {
      justification: firstText(
        raw.justificativa,
        raw.justification,
        raw.explanation,
        raw.fundamento,
        raw.fundamentacao,
        raw["fundamentação"],
        raw.legalBasis,
        raw.baseLegal
      ),
      comment: firstText(
        raw.comentario,
        raw["comentário"],
        raw.comentarioQc,
        raw.comment,
        raw.comments,
        raw.officialComment,
        raw.comentarioOficial
      )
    };
  }

  function detailLabel(details) {
    if (details.justification && details.comment) return "Justificativa e comentário";
    if (details.justification) return "Justificativa";
    if (details.comment) return "Comentário";
    return "";
  }

  function ensureStyle() {
    if (document.getElementById("aldusQuestionBankJsonDetailsV299Style")) return;
    const style = document.createElement("style");
    style.id = "aldusQuestionBankJsonDetailsV299Style";
    style.textContent = `
      .aldus-json-detail-trigger-v299{display:inline-flex;align-items:center;gap:6px;margin-top:7px;padding:5px 9px;border:1px solid rgba(41,112,169,.32);border-radius:999px;background:rgba(41,112,169,.09);color:inherit;font-size:.72rem;font-weight:700;line-height:1.2;white-space:nowrap}
      .aldus-json-detail-trigger-v299::after{content:"⌄";font-size:.84rem;transition:transform .18s ease}
      .aldus-json-detail-trigger-v299[aria-expanded="true"]::after{transform:rotate(180deg)}
      .aldus-json-detail-row-v299[hidden]{display:none}
      .aldus-json-detail-cell-v299{padding:0 10px 12px!important;background:rgba(63,111,151,.055)}
      .aldus-json-detail-grid-v299{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px;border:1px solid rgba(74,119,157,.22);border-radius:12px;background:rgba(255,255,255,.52)}
      .aldus-json-detail-card-v299{min-width:0;padding:11px 12px;border-left:4px solid #2b78b5;border-radius:8px;background:rgba(37,99,145,.075)}
      .aldus-json-detail-card-v299[data-detail-kind="comment"]{border-left-color:#b98524;background:rgba(185,133,36,.08)}
      .aldus-json-detail-card-v299 strong{display:block;margin-bottom:6px;font-size:.76rem;letter-spacing:.025em;text-transform:uppercase}
      .aldus-json-detail-card-v299 p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}
      html[data-aldus-theme="premium-stable"] .aldus-json-detail-grid-v299{background:rgba(7,32,52,.72);border-color:rgba(120,174,214,.25)}
      html[data-aldus-theme="premium-stable"] .aldus-json-detail-cell-v299{background:rgba(3,24,42,.6)}
      @media(max-width:720px){.aldus-json-detail-grid-v299{grid-template-columns:1fr}.aldus-json-detail-trigger-v299{white-space:normal}}
      @media(prefers-reduced-motion:reduce){.aldus-json-detail-trigger-v299::after{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function detailCard(kind, label, content) {
    if (!content) return "";
    return `<article class="aldus-json-detail-card-v299" data-detail-kind="${kind}"><strong>${label}</strong><p>${html(content)}</p></article>`;
  }

  function enhanceModal(rawRows) {
    const modal = document.getElementById("aldusQbJsonReviewV192");
    if (!modal || modal.dataset.jsonDetailsV299 === VERSION) return Boolean(modal);
    const tableRows = Array.from(modal.querySelectorAll(".aldus-json-review-table-v192 tbody > tr"));
    if (!tableRows.length) return false;
    ensureStyle();

    tableRows.forEach((tableRow, index) => {
      const details = detailsFromRaw(rawRows[index]);
      const label = detailLabel(details);
      if (!label) return;
      const panelId = `aldusJsonDetailV299-${index + 1}`;
      const resultCell = tableRow.cells?.[7] || tableRow.lastElementChild;
      if (!resultCell) return;

      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "aldus-json-detail-trigger-v299";
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-controls", panelId);
      trigger.textContent = label;
      resultCell.appendChild(document.createElement("br"));
      resultCell.appendChild(trigger);

      const detailRow = document.createElement("tr");
      detailRow.id = panelId;
      detailRow.className = "aldus-json-detail-row-v299";
      detailRow.hidden = true;
      detailRow.innerHTML = `<td class="aldus-json-detail-cell-v299" colspan="8"><div class="aldus-json-detail-grid-v299">${detailCard("justification", "Justificativa", details.justification)}${detailCard("comment", "Comentário", details.comment)}</div></td>`;
      tableRow.after(detailRow);

      trigger.addEventListener("click", () => {
        const expanded = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", String(!expanded));
        detailRow.hidden = expanded;
      });
    });

    modal.dataset.jsonDetailsV299 = VERSION;
    return true;
  }

  function reviewRows(payload) {
    const importer = globalThis.AldusQuestionBankJsonImportV191;
    if (!importer?.normalizeImportedQuestion) return sourceItems(payload);
    return sourceItems(payload).filter((raw, index) => {
      try { return text(importer.normalizeImportedQuestion(raw, index)?.enunciado); }
      catch { return false; }
    });
  }

  function watchForReview(rawRows) {
    if (enhanceModal(rawRows)) return;
    const observer = new MutationObserver(() => {
      if (enhanceModal(rawRows)) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }

  function captureJsonBeforeReview(event) {
    const target = event?.target;
    if (!target || target.id !== "qbFile") return;
    const file = target.files?.[0];
    if (!file) return;
    file.text()
      .then((content) => JSON.parse(content))
      .then((payload) => watchForReview(reviewRows(payload)))
      .catch((error) => console.warn("[Aldus V299] Não foi possível preparar justificativas e comentários.", error));
  }

  if (typeof document !== "undefined") document.addEventListener("change", captureJsonBeforeReview, true);

  const api = Object.freeze({ version: VERSION, detailsFromRaw, detailLabel, enhanceModal });
  globalThis.AldusQuestionBankJsonDetailsV299 = api;
  globalThis[GLOBAL_KEY] = api;
})();
