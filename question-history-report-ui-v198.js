(() => {
  "use strict";
  const ns = globalThis.__AldusQuestionHistoryReportV198;
  if (!ns?.coreReady || !ns?.exportReady || ns.uiReady) return;
  const PANEL_ID = "questionHistoryFilterExportV198";
  const STYLE_ID = "questionHistoryFilterExportStylesV198";
  const STATUS_ID = "questionHistoryFilterExportStatusV198";
  const RESULT_ID = "questionHistoryFilterExportResultV198";
  const FORM_ID = "questionHistoryFilterExportFormV198";
  const GLOBAL_KEY = "__ALDUS_QUESTION_HISTORY_FILTER_EXPORT_V198__";
  const BLANK_MARK = "__blank__";
  const { text, html, formatDateLocal, statusLabel, originLabel, collectRowsFromState, applyFilters, summarize, groupRows, filterDescription, buildCsv, buildReportSvg, exportReport } = ns;
  function selectOptions(values = [], selected = "", emptyLabel = "Todos") {
    const unique = [...new Set(values.map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return `<option value="">${html(emptyLabel)}</option>${unique.map((value) => `<option value="${html(value)}"${value === selected ? " selected" : ""}>${html(value)}</option>`).join("")}`;
  }
  function injectStyles() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{margin:18px 0 22px;border:1px solid #c9d8e8;border-radius:22px;background:linear-gradient(180deg,#fff,#f7fbff);box-shadow:0 14px 32px rgba(6,36,65,.08);overflow:hidden;color:#172033}
      #${PANEL_ID}>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;cursor:pointer;background:#eef6ff;color:#082b49;font-weight:900;list-style:none}
      #${PANEL_ID}>summary::-webkit-details-marker{display:none} #${PANEL_ID}>summary small{color:#526b7f;font-weight:700}
      .qhfe-content-v198{padding:16px 18px 20px}.qhfe-grid-v198{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.qhfe-grid-v198 label{display:grid;gap:6px;color:#243b53;font-size:.78rem;font-weight:800}
      .qhfe-grid-v198 input,.qhfe-grid-v198 select{width:100%;min-width:0;padding:10px 11px;border:1px solid #bfd0e2;border-radius:11px;background:#fff;color:#172033}
      .qhfe-wide-v198{grid-column:span 2}.qhfe-checkbox-v198{display:flex!important;grid-template-columns:auto 1fr!important;align-items:center;gap:9px!important;padding-top:22px}.qhfe-checkbox-v198 input{width:auto}
      .qhfe-actions-v198{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}.qhfe-actions-v198 button{width:auto;min-width:132px}.qhfe-actions-v198 .qhfe-export-v198{background:#0b5cab;color:#fff}.qhfe-actions-v198 .qhfe-clear-v198{background:#e8eef5;color:#17324d}
      #${STATUS_ID}{margin:12px 0 0;color:#31506b;font-weight:700}.qhfe-summary-v198{display:grid;grid-template-columns:repeat(8,minmax(105px,1fr));gap:9px;margin-top:15px}.qhfe-summary-v198 article{padding:11px;border:1px solid #d5e0eb;border-radius:13px;background:#fff}.qhfe-summary-v198 span{display:block;color:#61758a;font-size:.7rem;font-weight:700}.qhfe-summary-v198 strong{display:block;margin-top:4px;color:#082b49;font-size:1.1rem}
      .qhfe-breakdowns-v198{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.qhfe-breakdown-v198{padding:12px;border:1px solid #d5e0eb;border-radius:14px;background:#fff}.qhfe-breakdown-v198 h4{margin:0 0 9px;color:#082b49}.qhfe-bar-v198{display:grid;grid-template-columns:minmax(0,1fr) 50px;gap:8px;align-items:center;margin:7px 0}.qhfe-bar-copy-v198{min-width:0}.qhfe-bar-copy-v198 span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#334e68;font-size:.76rem;font-weight:700}.qhfe-bar-track-v198{height:7px;margin-top:3px;border-radius:999px;background:#e7eef5;overflow:hidden}.qhfe-bar-track-v198 i{display:block;height:100%;background:linear-gradient(90deg,#1f6fb2,#35a37a)}.qhfe-bar-v198 strong{text-align:right;color:#082b49;font-size:.78rem}
      .qhfe-table-v198{margin-top:14px;overflow:auto;border:1px solid #d5e0eb;border-radius:14px;background:#fff}.qhfe-table-v198 table{min-width:1180px}.qhfe-table-v198 th,.qhfe-table-v198 td{padding:9px 10px;font-size:.76rem}.qhfe-result-v198{font-weight:900}.qhfe-result-v198.certo{color:#137a4b}.qhfe-result-v198.errado{color:#b4232c}.qhfe-result-v198.branco{color:#8a6500}.qhfe-result-v198.duvida{color:#7651a8}
      @media(max-width:1000px){.qhfe-grid-v198{grid-template-columns:repeat(2,minmax(0,1fr))}.qhfe-summary-v198{grid-template-columns:repeat(4,minmax(0,1fr))}.qhfe-breakdowns-v198{grid-template-columns:1fr}}
      @media(max-width:620px){#${PANEL_ID}>summary{align-items:flex-start;flex-direction:column}.qhfe-content-v198{padding:13px}.qhfe-grid-v198{grid-template-columns:1fr}.qhfe-wide-v198{grid-column:auto}.qhfe-checkbox-v198{padding-top:4px}.qhfe-summary-v198{grid-template-columns:repeat(2,minmax(0,1fr))}.qhfe-actions-v198 button{width:100%}}
    `;
    document.head.appendChild(style);
  }
  function panelTemplate() {
    return `<summary><span>Filtrar e gerar relatório</span><small>PDF • Excel • Imagem PNG</small></summary><div class="qhfe-content-v198">
      <form id="${FORM_ID}"><div class="qhfe-grid-v198">
        <label>Data inicial<input type="date" name="startDate"></label><label>Data final<input type="date" name="endDate"></label>
        <label>Disciplina<select name="discipline"></select></label><label>Assunto<select name="subject"></select></label>
        <label>Banca<select name="board"></select></label><label>Órgão<select name="agency"></select></label>
        <label>Cargo<select name="role"></select></label><label>Prova<select name="exam"></select></label>
        <label>Ano<select name="year"></select></label><label>Resultado<select name="result"><option value="">Todos</option><option value="certo">Certas</option><option value="errado">Erradas</option><option value="branco">Não respondidas</option><option value="duvida">Dúvidas</option></select></label>
        <label>Origem<select name="origin"></select></label><label>Código da questão<input name="code" placeholder="Ex.: Q3015546"></label>
        <label class="qhfe-wide-v198">Pesquisa no enunciado, assunto ou comentário<input name="query" type="search" placeholder="Digite uma palavra ou expressão"></label>
        <label class="qhfe-checkbox-v198"><input name="notebookOnly" type="checkbox"><span>Somente Caderno de Erros</span></label>
      </div><div class="qhfe-actions-v198"><button type="submit">Aplicar filtros</button><button type="button" class="qhfe-clear-v198" data-qhfe-clear>Limpar filtros</button><button type="button" class="qhfe-export-v198" data-qhfe-export="pdf">Gerar PDF</button><button type="button" class="qhfe-export-v198" data-qhfe-export="xlsx">Gerar Excel</button><button type="button" class="qhfe-export-v198" data-qhfe-export="png">Gerar imagem</button></div></form>
      <p id="${STATUS_ID}" role="status" aria-live="polite"></p><div id="${RESULT_ID}"></div></div>`;
  }
  function ensurePanel() {
    if (typeof document === "undefined") return null;
    injectStyles();
    const view = document.getElementById("view-historico-questoes");
    if (!view) return null;
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement("details");
      panel.id = PANEL_ID;
      panel.open = true;
      panel.innerHTML = panelTemplate();
      const anchor = document.getElementById("questionHistoryPiePanel") || document.getElementById("questionHistorySummary") || view.querySelector(".section-heading")?.nextElementSibling;
      if (anchor?.parentElement) anchor.parentElement.insertBefore(panel, anchor);
      else view.appendChild(panel);
    }
    const pie = document.getElementById("questionHistoryPiePanel");
    if (pie?.parentElement && panel.parentElement === pie.parentElement && panel.nextElementSibling !== pie) pie.parentElement.insertBefore(panel, pie);
    return panel;
  }
  function formFilters(form) {
    const data = new FormData(form);
    return {
      startDate: text(data.get("startDate")), endDate: text(data.get("endDate")), discipline: text(data.get("discipline")), subject: text(data.get("subject")),
      board: text(data.get("board")), agency: text(data.get("agency")), role: text(data.get("role")), exam: text(data.get("exam")), year: text(data.get("year")),
      result: text(data.get("result")), origin: text(data.get("origin")), code: text(data.get("code")), query: text(data.get("query")), notebookOnly: data.get("notebookOnly") === "on"
    };
  }
  function fillSelect(form, name, values, initial = "") {
    const select = form?.elements?.[name];
    if (!select) return;
    const current = select.value || initial;
    const label = name === "origin" ? "Todas" : "Todos";
    select.innerHTML = selectOptions(values, current, label);
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  }
  function syncOptions(form, rows) {
    const initial = {
      discipline: document.getElementById("questionFilterDiscipline")?.value || "",
      subject: document.getElementById("questionFilterSubject")?.selectedOptions?.[0]?.textContent || "",
      board: document.getElementById("questionFilterBoard")?.value || "",
      origin: document.getElementById("questionFilterOrigin")?.selectedOptions?.[0]?.textContent || ""
    };
    fillSelect(form, "discipline", rows.map((row) => row.discipline), initial.discipline);
    fillSelect(form, "subject", rows.map((row) => row.subject), initial.subject);
    fillSelect(form, "board", rows.map((row) => row.board), initial.board);
    fillSelect(form, "agency", rows.map((row) => row.agency));
    fillSelect(form, "role", rows.map((row) => row.role));
    fillSelect(form, "exam", rows.map((row) => row.exam));
    fillSelect(form, "year", rows.map((row) => row.year));
    fillSelect(form, "origin", rows.map((row) => row.sourceLabel), initial.origin);
  }
  function breakdownHtml(rows, field, title) {
    const grouped = groupRows(rows, field).slice(0, 7);
    const max = Math.max(1, ...grouped.map((entry) => entry.total));
    return `<article class="qhfe-breakdown-v198"><h4>${html(title)}</h4>${grouped.length ? grouped.map((entry) => `<div class="qhfe-bar-v198"><div class="qhfe-bar-copy-v198"><span title="${html(entry.label)}">${html(entry.label)}</span><div class="qhfe-bar-track-v198"><i style="width:${Math.max(2, entry.total / max * 100).toFixed(1)}%"></i></div></div><strong>${entry.total}</strong></div>`).join("") : "<p>Nenhum dado.</p>"}</article>`;
  }
  function summaryHtml(summary) {
    const values = [["Registros", summary.records], ["Questões", summary.total], ["Certas", summary.correct], ["Erradas", summary.wrong], ["Não respondidas", summary.blank], ["Dúvidas", summary.doubt], ["Acerto", `${summary.accuracy}%`], ["Líquido", summary.net]];
    return `<div class="qhfe-summary-v198">${values.map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("")}</div>`;
  }
  function reportTableHtml(rows, limit = 100) {
    const visible = rows.slice(0, limit);
    return `<div class="qhfe-table-v198"><table><thead><tr><th>Data</th><th>Código</th><th>Disciplina</th><th>Assunto</th><th>Banca</th><th>Resultado</th><th>Marcada</th><th>Gabarito</th><th>Total</th><th>Origem</th><th>Enunciado/observação</th></tr></thead><tbody>${visible.map((row) => `<tr><td>${formatDateLocal(row.date)}</td><td>${html(row.code || "-")}</td><td>${html(row.discipline)}</td><td>${html(row.subject)}</td><td>${html(row.board || "-")}</td><td><span class="qhfe-result-v198 ${html(row.status)}">${html(row.statusLabel)}</span></td><td>${html(row.marked === BLANK_MARK ? "Em branco" : row.marked || "-")}</td><td>${html(row.answerKey || "-")}</td><td>${row.total}</td><td>${html(row.sourceLabel)}</td><td>${html(row.statement || row.notes || row.explanation || "-")}</td></tr>`).join("") || '<tr><td colspan="11">Nenhum resultado encontrado.</td></tr>'}</tbody></table>${rows.length > limit ? `<p style="padding:10px 12px">Prévia limitada a ${limit} registros. Os arquivos exportados incluem todos.</p>` : ""}</div>`;
  }
  function updateNativeHistory(report) {
    const summaryBox = document.getElementById("questionHistorySummary");
    const body = document.getElementById("questionHistoryBody");
    const s = report.summary;
    if (summaryBox) summaryBox.innerHTML = [["Registros", s.records], ["Total", s.total], ["Acertos", s.correct], ["Erros", s.wrong], ["Brancos", s.blank], ["Dúvidas", s.doubt], ["Percentual de acerto", `${s.accuracy}%`], ["Líquido Cebraspe", s.net]].map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
    if (!body) return;
    body.innerHTML = report.rows.map((row) => `<tr><td>${formatDateLocal(row.date)}</td><td>${html(row.discipline)}</td><td>${html(row.subject)}</td><td>${html(row.board || "-")}</td><td>${row.total}</td><td>${row.correct}</td><td>${row.wrong}</td><td>${row.blank}</td><td>${row.total ? (row.correct / row.total * 100).toFixed(1) : 0}%</td><td>${row.net}</td><td>${html(row.sourceLabel)}</td><td>${html([row.code ? `Código: ${row.code}` : "", row.statusLabel, row.notes || row.explanation].filter(Boolean).join(" • ") || "-")}</td><td>${row.recordType === "manual-session" ? `<button type="button" data-edit-question="${html(row.id)}">Editar</button><button class="danger" type="button" data-delete-question="${html(row.id)}">Excluir</button>` : "Somente leitura"}</td></tr>`).join("") || '<tr><td colspan="13">Nenhum resultado encontrado.</td></tr>';
  }
  let currentReport = { rows: [], filters: {}, summary: summarize([]) };
  function renderReport() {
    const panel = ensurePanel();
    if (!panel) return currentReport;
    const form = document.getElementById(FORM_ID);
    const allRows = collectRowsFromState(typeof state !== "undefined" ? state : {});
    syncOptions(form, allRows);
    const filters = formFilters(form);
    const rows = applyFilters(allRows, filters);
    const summary = summarize(rows);
    currentReport = { rows, filters, summary, generatedAt: new Date().toISOString() };
    const result = document.getElementById(RESULT_ID);
    if (result) result.innerHTML = `${summaryHtml(summary)}<div class="qhfe-breakdowns-v198">${breakdownHtml(rows, "discipline", "Por disciplina")}${breakdownHtml(rows, "subject", "Por assunto")}${breakdownHtml(rows, "board", "Por banca")}</div>${reportTableHtml(rows)}`;
    const status = document.getElementById(STATUS_ID);
    if (status) status.textContent = `Exibindo ${summary.records} registro(s), correspondentes a ${summary.total} questão(ões). ${filterDescription(filters)}.`;
    updateNativeHistory(currentReport);
    return currentReport;
  }
  function clearFilters() {
    const form = document.getElementById(FORM_ID); if (!form) return;
    form.reset(); renderReport();
  }
  function bindEvents(panel) {
    if (!panel || panel.dataset.eventsBoundV198 === "true") return;
    panel.dataset.eventsBoundV198 = "true";
    panel.querySelector(`#${FORM_ID}`)?.addEventListener("submit", (event) => { event.preventDefault(); renderReport(); });
    panel.addEventListener("click", (event) => {
      if (event.target.closest("[data-qhfe-clear]")) { event.preventDefault(); clearFilters(); return; }
      const exportButton = event.target.closest("[data-qhfe-export]");
      if (exportButton) { event.preventDefault(); void exportReport(exportButton.dataset.qhfeExport); }
    });
    panel.addEventListener("change", (event) => {
      if (event.target.matches("select,input[type=date],input[type=checkbox]")) renderReport();
    });
  }
  let renderTimer = null;
  function scheduleRender(delay = 0) { clearTimeout(renderTimer); renderTimer = setTimeout(() => { const panel = ensurePanel(); bindEvents(panel); renderReport(); }, delay); }
  function initialize() {
    if (typeof document === "undefined") return false;
    const panel = ensurePanel(); if (!panel) return false;
    bindEvents(panel); renderReport();
    window.addEventListener("aldus:view-active", (event) => { if (event.detail?.view === "historico-questoes") scheduleRender(30); });
    window.addEventListener("hashchange", () => { if (location.hash.includes("historico-questoes")) scheduleRender(30); });
    ["questionFilterDiscipline","questionFilterSubject","questionFilterOrigin","questionFilterBoard"].forEach((id)=>document.getElementById(id)?.addEventListener("change",()=>scheduleRender(20)));
    return true;
  }

  const api = Object.freeze({ version: ns.VERSION, normalizeStatus: ns.normalizeStatus, statusLabel, originLabel, collectRowsFromState, applyFilters, summarize, groupRows, filterDescription, buildCsv, buildReportSvg, renderReport, exportReport, initialize });
  globalThis.AldusQuestionHistoryFilterExportV198 = api;
  globalThis[GLOBAL_KEY] = api;
  ns.renderReport = renderReport;
  ns.uiReady = true;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initialize(), { once: true });
    else setTimeout(() => initialize(), 0);
  }
})();
