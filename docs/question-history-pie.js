(() => {
  "use strict";

  const RUNTIME_KEY = "__aldusQuestionHistoryPieV110";
  if (globalThis[RUNTIME_KEY]) return;
  globalThis[RUNTIME_KEY] = true;

  const PANEL_ID = "questionHistoryPiePanel";
  const CHART_ID = "questionHistorySelectedChart";
  const SELECT_ID = "questionHistoryPeriodFilter";
  const PERIOD_LABEL_ID = "questionHistoryPeriodLabel";
  const PERIOD_DESCRIPTION_ID = "questionHistoryPeriodDescription";
  const TABLE_BODY_ID = "questionHistoryBody";
  const PERIOD_STORAGE_KEY = "questionHistorySelectedPeriod";
  const PANEL_STORAGE_KEY = "questionHistoryPeriodPanelOpen";
  const FILTER_IDS = [
    "questionFilterDiscipline",
    "questionFilterSubject",
    "questionFilterOrigin",
    "questionFilterBoard"
  ];

  const COLORS = {
    correct: "#159b63",
    wrong: "#d94b4b",
    null: "#d6a40d",
    empty: "#dfe7ef",
    navy: "#082b49"
  };

  const PERIODS = [
    { key: "day", label: "Hoje", matches: (date, now) => sameDay(date, now) },
    { key: "week", label: "Semana", matches: (date, now) => sameWeek(date, now) },
    { key: "month", label: "Mês", matches: (date, now) => sameMonth(date, now) },
    { key: "year", label: "Ano", matches: (date, now) => date.getFullYear() === now.getFullYear() },
    { key: "all", label: "Completo", matches: () => true }
  ];

  function injectStyles() {
    if (document.getElementById("questionHistoryPieStyles")) return;

    const style = document.createElement("style");
    style.id = "questionHistoryPieStyles";
    style.textContent = `
      .qh-period-details {
        margin: 1.25rem 0 1.5rem;
        border: 1px solid rgba(8, 43, 73, .13);
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(255,255,255,.99), rgba(246,250,253,.98));
        box-shadow: 0 14px 32px rgba(8, 43, 73, .08);
        overflow: hidden;
      }

      .qh-period-details > summary {
        list-style: none;
      }

      .qh-period-details > summary::-webkit-details-marker {
        display: none;
      }

      .qh-period-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.15rem;
        cursor: pointer;
        user-select: none;
        background: rgba(255,255,255,.82);
      }

      .qh-period-summary:hover {
        background: #fff;
      }

      .qh-period-summary-copy {
        display: grid;
        gap: .16rem;
        min-width: 0;
      }

      .qh-period-summary-copy small {
        color: #667b8f;
        font-size: .76rem;
        font-weight: 700;
        letter-spacing: .06em;
      }

      .qh-period-summary-copy strong {
        color: ${COLORS.navy};
        font-size: 1.08rem;
      }

      .qh-period-summary-status {
        display: flex;
        align-items: center;
        gap: .7rem;
        color: #526b7f;
        font-size: .84rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .qh-period-chevron {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #edf4f8;
        color: ${COLORS.navy};
        font-size: 1.35rem;
        line-height: 1;
        transform: rotate(90deg);
        transition: transform .2s ease;
      }

      .qh-period-details[open] .qh-period-chevron {
        transform: rotate(-90deg);
      }

      .qh-period-content {
        padding: 0 1.15rem 1.15rem;
        border-top: 1px solid rgba(8, 43, 73, .08);
      }

      .qh-period-toolbar {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 0;
      }

      .qh-period-filter {
        display: grid;
        gap: .38rem;
        min-width: min(100%, 260px);
        color: ${COLORS.navy};
        font-size: .82rem;
        font-weight: 700;
      }

      .qh-period-filter select {
        width: 100%;
        min-height: 44px;
        padding: .65rem 2.4rem .65rem .8rem;
        border: 1px solid rgba(8, 43, 73, .18);
        border-radius: 12px;
        background: #fff;
        color: ${COLORS.navy};
        font: inherit;
        font-weight: 700;
      }

      .qh-period-description {
        margin: 0;
        color: #657a8e;
        font-size: .86rem;
        text-align: right;
      }

      .qh-chart-card {
        display: grid;
        grid-template-columns: minmax(280px, .95fr) minmax(310px, 1.05fr);
        align-items: center;
        gap: 1.4rem;
        min-height: 350px;
        padding: 1.2rem;
        border: 1px solid rgba(8, 43, 73, .11);
        border-radius: 18px;
        background: #fff;
        box-shadow: 0 9px 24px rgba(8, 43, 73, .07);
      }

      .qh-chart-visual {
        position: relative;
        display: grid;
        place-items: center;
        min-width: 0;
        min-height: 330px;
        padding: .65rem;
        overflow: hidden;
        border-radius: 16px;
        background:
          radial-gradient(ellipse at 50% 42%, rgba(62,157,213,.18), transparent 43%),
          linear-gradient(155deg, #f9fcff 0%, #e5f0f7 54%, #d7e7f1 100%);
        border: 1px solid rgba(146, 180, 204, .56);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.92), 0 11px 24px rgba(3,32,58,.10);
        isolation: isolate;
      }

      .qh-chart-visual::before {
        content: "";
        position: absolute;
        inset: 12% 8% 9%;
        z-index: -1;
        border-radius: 50%;
        background: radial-gradient(ellipse, rgba(8,43,73,.12), transparent 67%);
        filter: blur(8px);
      }

      .qh-chart-visual::after {
        content: "";
        position: absolute;
        left: 16%;
        right: 16%;
        bottom: 12%;
        z-index: -1;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(199,154,59,.55), transparent);
        box-shadow: 0 13px 24px rgba(3,32,58,.14);
      }

      .qh-donut-wrap {
        position: relative;
        display: grid;
        place-items: center;
        width: min(100%, 440px);
        aspect-ratio: 44 / 30;
        border-radius: 50%;
        background: radial-gradient(ellipse at 50% 45%, rgba(255,255,255,.74), rgba(206,225,238,.28) 49%, transparent 70%);
      }

      .qh-donut-svg {
        display: block;
        width: 100%;
        height: auto;
        overflow: visible;
        filter: drop-shadow(0 9px 8px rgba(3,32,58,.13));
      }

      .qh-donut-ground-shadow {
        fill: rgba(8, 43, 73, .24);
        filter: url(#qhDonutShadow);
      }

      .qh-donut-depth path {
        stroke: rgba(4, 23, 39, .16);
        stroke-width: 1;
      }

      .qh-donut-top path {
        stroke: rgba(247, 251, 255, .94);
        stroke-width: 3;
        stroke-linejoin: round;
        filter: url(#qhSegmentShadow);
        transform-box: fill-box;
        transform-origin: center;
        transition: filter .18s ease, opacity .18s ease;
      }

      .qh-donut-top:hover path { opacity: .9; }
      .qh-donut-top path:hover { opacity: 1; filter: url(#qhSegmentHoverShadow); }

      .qh-donut-rim {
        fill: none;
        stroke: rgba(199, 154, 59, .58);
        stroke-width: 2.4;
        pointer-events: none;
      }

      .qh-donut-inner-rim {
        fill: none;
        stroke: rgba(255, 255, 255, .66);
        stroke-width: 2;
        pointer-events: none;
      }

      .qh-donut-gloss {
        fill: url(#qhDonutGloss);
        opacity: .34;
        pointer-events: none;
      }

      .qh-donut-center-shadow {
        fill: rgba(4, 23, 39, .34);
        filter: url(#qhCenterBlur);
      }

      .qh-donut-center-disc {
        fill: url(#qhCenterDiscGradient);
        stroke: rgba(199,154,59,.68);
        stroke-width: 2.2;
      }

      .qh-donut-center-value {
        fill: ${COLORS.navy};
        font: 900 39px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: -1.5px;
      }

      .qh-donut-center-label {
        fill: #526b7f;
        font: 800 15px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: .3px;
      }

      .qh-donut-caption {
        fill: #7a8fa1;
        font: 700 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .qh-chart-info {
        display: grid;
        gap: 1rem;
        min-width: 0;
      }

      .qh-chart-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }

      .qh-chart-heading-copy {
        display: grid;
        gap: .25rem;
      }

      .qh-chart-heading-copy small {
        color: #687d91;
        font-size: .8rem;
        font-weight: 700;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      .qh-chart-heading-copy strong {
        color: ${COLORS.navy};
        font-size: 1.35rem;
      }

      .qh-total-badge {
        padding: .48rem .7rem;
        border-radius: 999px;
        background: #edf4f8;
        color: ${COLORS.navy};
        font-size: .82rem;
        font-weight: 800;
        white-space: nowrap;
      }

      .qh-result-grid {
        display: grid;
        gap: .7rem;
      }

      .qh-result-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: .8rem;
        padding: .82rem .9rem;
        border: 1px solid rgba(8,43,73,.09);
        border-left: 4px solid var(--qh-result-accent, #7b91a5);
        border-radius: 13px;
        background: #fbfdff;
        box-shadow: 0 4px 10px rgba(3,32,58,.055);
        transition: transform .18s ease, box-shadow .18s ease;
      }

      .qh-result-row:hover { transform: translateY(-1px); box-shadow: 0 8px 16px rgba(3,32,58,.09); }
      .qh-result-row.correct { --qh-result-accent: ${COLORS.correct}; background: linear-gradient(90deg, rgba(21,155,99,.09), #fbfdff 42%); }
      .qh-result-row.wrong { --qh-result-accent: ${COLORS.wrong}; background: linear-gradient(90deg, rgba(217,75,75,.09), #fbfdff 42%); }
      .qh-result-row.null { --qh-result-accent: ${COLORS.null}; background: linear-gradient(90deg, rgba(214,164,13,.10), #fbfdff 42%); }

      .qh-result-label {
        display: flex;
        align-items: center;
        gap: .58rem;
        min-width: 0;
        color: #29465d;
        font-weight: 700;
      }

      .qh-result-dot {
        flex: 0 0 auto;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        box-shadow: inset 0 -2px 2px rgba(0,0,0,.15);
      }

      .qh-result-dot.correct { background: linear-gradient(145deg, #3bd693, ${COLORS.correct}); }
      .qh-result-dot.wrong { background: linear-gradient(145deg, #ff8585, ${COLORS.wrong}); }
      .qh-result-dot.null { background: linear-gradient(145deg, #ffd866, ${COLORS.null}); }

      .qh-result-values {
        display: flex;
        align-items: baseline;
        gap: .55rem;
        white-space: nowrap;
      }

      .qh-result-values strong {
        color: ${COLORS.navy};
        font-size: 1.05rem;
      }

      .qh-result-values small {
        color: #687d91;
        font-size: .8rem;
        font-weight: 700;
      }

      .qh-accuracy-box {
        padding: .9rem;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(21,155,99,.10), rgba(8,43,73,.05));
      }

      .qh-accuracy-line {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: .55rem;
        color: ${COLORS.navy};
        font-weight: 800;
      }

      .qh-accuracy-track {
        height: 12px;
        overflow: hidden;
        border-radius: 999px;
        border: 1px solid #cbdbe6;
        background: #dbe7ef;
        box-shadow: inset 0 1px 3px rgba(3,32,58,.14);
      }

      .qh-accuracy-fill {
        position: relative;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, ${COLORS.correct}, #38b980);
        box-shadow: 0 0 12px rgba(21,155,99,.3);
        transition: width .35s ease;
      }

      .qh-accuracy-fill::after {
        content: "";
        position: absolute;
        inset: 0 0 48%;
        border-radius: inherit;
        background: rgba(255,255,255,.32);
      }

      .qh-chart-empty {
        display: grid;
        place-items: center;
        align-content: center;
        gap: .75rem;
        min-height: 315px;
        padding: 1.4rem;
        border: 1px dashed rgba(8,43,73,.2);
        border-radius: 16px;
        background: #f7fafc;
        text-align: center;
        color: #6b8093;
      }

      .qh-empty-ring {
        width: 112px;
        aspect-ratio: 1;
        border-radius: 50%;
        border: 20px solid ${COLORS.empty};
        box-shadow: 0 12px 18px rgba(8,43,73,.10);
      }

      .qh-chart-empty strong {
        color: ${COLORS.navy};
        font-size: 1.05rem;
      }

      html[data-aldus-theme="premium-stable"] .qh-chart-card {
        border-color: rgba(199,154,59,.44) !important;
        background: linear-gradient(155deg, #eef6fb 0%, #dfeaf3 100%) !important;
        box-shadow: 0 14px 30px rgba(3,32,58,.18), inset 0 2px 0 rgba(199,154,59,.56) !important;
      }

      html[data-aldus-theme="premium-stable"] .qh-chart-visual {
        background:
          radial-gradient(ellipse at 50% 42%, rgba(60,158,214,.19), transparent 44%),
          linear-gradient(155deg, #f8fcff 0%, #dfedf6 56%, #cfdfeb 100%) !important;
        border-color: #b9cedd !important;
      }

      html[data-aldus-theme="premium-stable"] .qh-result-label,
      html[data-aldus-theme="premium-stable"] .qh-accuracy-line {
        color: #173a58 !important;
      }

      html[data-aldus-theme="premium-stable"] .qh-result-row {
        border-color: #bfd1df !important;
        border-left-color: var(--qh-result-accent) !important;
      }

      html[data-aldus-theme="premium-stable"] .qh-result-row.correct {
        background: linear-gradient(90deg, rgba(21,155,99,.11), rgba(249,252,255,.96) 44%) !important;
      }

      html[data-aldus-theme="premium-stable"] .qh-result-row.wrong {
        background: linear-gradient(90deg, rgba(217,75,75,.11), rgba(249,252,255,.96) 44%) !important;
      }

      html[data-aldus-theme="premium-stable"] .qh-result-row.null {
        background: linear-gradient(90deg, rgba(214,164,13,.13), rgba(249,252,255,.96) 44%) !important;
      }

      html[data-aldus-theme="premium-stable"] .qh-chart-heading-copy strong,
      html[data-aldus-theme="premium-stable"] .qh-total-badge {
        color: #082b49 !important;
      }

      html[data-aldus-theme="premium-stable"] .qh-chart-heading-copy small {
        color: #5c7489 !important;
      }

      html[data-aldus-theme="premium-stable"] .qh-total-badge {
        border: 1px solid #bfd2df !important;
        background: linear-gradient(180deg, #f8fcff, #dceaf3) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.88) !important;
      }

      html[data-aldus-theme="premium-stable"] .qh-accuracy-box {
        border: 1px solid #bfd6d0 !important;
        background: linear-gradient(135deg, rgba(21,155,99,.12), rgba(255,255,255,.5)) !important;
      }

      html[data-aldus-theme="premium-stable"] .qh-result-values strong {
        color: #082b49 !important;
      }

      html[data-aldus-theme="premium-stable"] .qh-result-values small,
      html[data-aldus-theme="premium-stable"] .qh-donut-caption {
        color: #526b7f !important;
        fill: #526b7f !important;
      }

      @media (max-width: 820px) {
        .qh-chart-card {
          grid-template-columns: 1fr;
        }

        .qh-chart-visual {
          min-height: 290px;
        }
      }

      @media (max-width: 620px) {
        .qh-period-summary {
          align-items: flex-start;
          padding: .9rem;
        }

        .qh-period-summary-status span:first-child {
          display: none;
        }

        .qh-period-content {
          padding: 0 .9rem .9rem;
        }

        .qh-period-toolbar {
          display: grid;
          align-items: stretch;
        }

        .qh-period-filter {
          min-width: 0;
        }

        .qh-period-description {
          text-align: left;
        }

        .qh-chart-card {
          min-height: 0;
          padding: .85rem;
        }

        .qh-donut-wrap {
          width: min(100%, 390px);
        }

        .qh-chart-heading {
          display: grid;
        }

        .qh-total-badge {
          justify-self: start;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function parseNumber(value) {
    const cleaned = String(value ?? "")
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .replace(/[^\d.-]/g, "");
    const number = Number(cleaned);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  }

  function parseDate(value) {
    const text = String(value ?? "").trim();
    if (!text) return null;

    let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12);

    match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function normalizedDate(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  }

  function sameDay(first, second) {
    return normalizedDate(first).getTime() === normalizedDate(second).getTime();
  }

  function weekStart(date) {
    const result = normalizedDate(date);
    const mondayIndex = (result.getDay() + 6) % 7;
    result.setDate(result.getDate() - mondayIndex);
    return result;
  }

  function sameWeek(first, second) {
    return weekStart(first).getTime() === weekStart(second).getTime();
  }

  function sameMonth(first, second) {
    return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
  }

  function addDays(date, amount) {
    const result = normalizedDate(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function formatDate(date, options = {}) {
    return new Intl.DateTimeFormat("pt-BR", options).format(date);
  }

  function selectedPeriodKey() {
    const select = document.getElementById(SELECT_ID);
    const fallback = localStorage.getItem(PERIOD_STORAGE_KEY) || "month";
    return PERIODS.some((period) => period.key === select?.value) ? select.value : fallback;
  }

  function periodDescription(periodKey, now = new Date()) {
    if (periodKey === "day") return `Resultados de ${formatDate(now)}`;
    if (periodKey === "week") {
      const start = weekStart(now);
      const end = addDays(start, 6);
      return `Semana de ${formatDate(start)} a ${formatDate(end)}`;
    }
    if (periodKey === "month") {
      return formatDate(now, { month: "long", year: "numeric" }).replace(/^./, (letter) => letter.toUpperCase());
    }
    if (periodKey === "year") return `Resultados de ${now.getFullYear()}`;
    return "Todo o histórico que corresponde aos filtros da tela";
  }

  function ensurePanel() {
    const view = document.getElementById("view-historico-questoes");
    if (!view) return null;

    let panel = document.getElementById(PANEL_ID);
    if (panel && !panel.matches("details.qh-period-details")) {
      panel.remove();
      panel = null;
    }

    if (!panel) {
      panel = document.createElement("details");
      panel.id = PANEL_ID;
      panel.className = "qh-period-details";
      panel.setAttribute("aria-labelledby", "questionHistoryPieTitle");
      panel.innerHTML = `
        <summary class="qh-period-summary">
          <span class="qh-period-summary-copy">
            <small>VISÃO POR PERÍODO</small>
            <strong id="questionHistoryPieTitle">Acertos, Erros e Nulos</strong>
          </span>
          <span class="qh-period-summary-status">
            <span id="${PERIOD_LABEL_ID}">Mês</span>
            <span class="qh-period-chevron" aria-hidden="true">›</span>
          </span>
        </summary>
        <div class="qh-period-content">
          <div class="qh-period-toolbar">
            <label class="qh-period-filter">Período do gráfico
              <select id="${SELECT_ID}" aria-label="Selecionar período do gráfico">
                ${PERIODS.map((period) => `<option value="${period.key}">${period.label}</option>`).join("")}
              </select>
            </label>
            <p id="${PERIOD_DESCRIPTION_ID}" class="qh-period-description"></p>
          </div>
          <div id="${CHART_ID}" aria-live="polite"></div>
        </div>
      `;

      const storedOpen = sessionStorage.getItem(PANEL_STORAGE_KEY);
      panel.open = storedOpen !== "closed";
      panel.addEventListener("toggle", () => {
        sessionStorage.setItem(PANEL_STORAGE_KEY, panel.open ? "open" : "closed");
      });

      const summary = document.getElementById("questionHistorySummary");
      const filters = view.querySelector(".filters");
      if (summary) summary.insertAdjacentElement("afterend", panel);
      else if (filters) view.insertBefore(panel, filters);
      else view.appendChild(panel);
    }

    const select = panel.querySelector(`#${SELECT_ID}`);
    const savedPeriod = localStorage.getItem(PERIOD_STORAGE_KEY) || "month";
    if (PERIODS.some((period) => period.key === savedPeriod)) select.value = savedPeriod;

    if (select.dataset.periodBound !== "true") {
      select.dataset.periodBound = "true";
      select.addEventListener("change", () => {
        localStorage.setItem(PERIOD_STORAGE_KEY, select.value);
        render();
      });
    }

    return panel.querySelector(`#${CHART_ID}`);
  }

  function getVisibleRows() {
    const body = document.getElementById(TABLE_BODY_ID);
    if (!body) return [];

    return Array.from(body.querySelectorAll("tr")).filter((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 8) return false;
      return row.hidden !== true && getComputedStyle(row).display !== "none";
    });
  }

  function collectStats() {
    const now = new Date();
    const result = Object.fromEntries(
      PERIODS.map((period) => [period.key, { correct: 0, wrong: 0, null: 0 }])
    );

    getVisibleRows().forEach((row) => {
      const cells = row.querySelectorAll("td");
      const date = parseDate(cells[0]?.textContent);
      if (!date) return;

      const correct = parseNumber(cells[5]?.textContent);
      const wrong = parseNumber(cells[6]?.textContent);
      const nullAnswers = parseNumber(cells[7]?.textContent);

      PERIODS.forEach((period) => {
        if (!period.matches(date, now)) return;
        result[period.key].correct += correct;
        result[period.key].wrong += wrong;
        result[period.key].null += nullAnswers;
      });
    });

    return result;
  }

  function formatInteger(value) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
  }

  function percentNumber(value, total) {
    return total ? (value / total) * 100 : 0;
  }

  function formatPercent(value, total) {
    return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(percentNumber(value, total))}%`;
  }

  function ellipsePoint(cx, cy, radiusX, radiusY, angle) {
    const radians = angle * Math.PI / 180;
    return {
      x: Number((cx + radiusX * Math.cos(radians)).toFixed(3)),
      y: Number((cy + radiusY * Math.sin(radians)).toFixed(3))
    };
  }

  function donutSegmentPath(startAngle, endAngle) {
    const cx = 220;
    const cy = 126;
    const outerX = 158;
    const outerY = 82;
    const innerX = 88;
    const innerY = 46;
    const safeEnd = endAngle - startAngle >= 359.999 ? startAngle + 359.99 : endAngle;
    const largeArc = safeEnd - startAngle > 180 ? 1 : 0;
    const outerStart = ellipsePoint(cx, cy, outerX, outerY, startAngle);
    const outerEnd = ellipsePoint(cx, cy, outerX, outerY, safeEnd);
    const innerEnd = ellipsePoint(cx, cy, innerX, innerY, safeEnd);
    const innerStart = ellipsePoint(cx, cy, innerX, innerY, startAngle);
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerX} ${outerY} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerX} ${innerY} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      "Z"
    ].join(" ");
  }

  function donutSegments(values) {
    const total = values.correct + values.wrong + values.null;
    const definitions = [
      { key: "correct", singular: "Acerto", label: "Acertos", value: values.correct, top: "url(#qhCorrectTop)", depth: "#087348" },
      { key: "wrong", singular: "Erro", label: "Erros", value: values.wrong, top: "url(#qhWrongTop)", depth: "#a92d35" },
      { key: "null", singular: "Nulo", label: "Nulos", value: values.null, top: "url(#qhNullTop)", depth: "#9a7000" }
    ];
    let angle = -90;
    return definitions.flatMap((definition) => {
      if (!definition.value || !total) return [];
      const span = definition.value / total * 360;
      const segment = {
        ...definition,
        path: donutSegmentPath(angle, angle + span),
        percent: formatPercent(definition.value, total)
      };
      angle += span;
      return [segment];
    });
  }

  function donutSvg(period, values, total) {
    const segments = donutSegments(values);
    const titleId = `qhDonutTitle-${period.key}`;
    const descriptionId = `qhDonutDescription-${period.key}`;
    const depth = [22, 18, 14, 10, 6].map((offset) => `
      <g transform="translate(0 ${offset})">
        ${segments.map((segment) => `<path d="${segment.path}" fill="${segment.depth}"></path>`).join("")}
      </g>
    `).join("");
    const top = segments.map((segment) => `
      <path d="${segment.path}" fill="${segment.top}">
        <title>${segment.value === 1 ? segment.singular : segment.label}: ${formatInteger(segment.value)} (${segment.percent})</title>
      </path>
    `).join("");
    const countLabel = (value, singular, plural) => `${formatInteger(value)} ${value === 1 ? singular : plural}`;
    const description = `${countLabel(values.correct, "acerto", "acertos")}, ${countLabel(values.wrong, "erro", "erros")} e ${countLabel(values.null, "nulo", "nulos")} em ${countLabel(total, "questão", "questões")}.`;

    return `
      <svg class="qh-donut-svg" viewBox="0 0 440 300" role="img" aria-labelledby="${titleId} ${descriptionId}">
        <title id="${titleId}">Distribuição 3D das respostas — ${period.label}</title>
        <desc id="${descriptionId}">${description}</desc>
        <defs>
          <linearGradient id="qhCorrectTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#58e8aa"></stop><stop offset=".48" stop-color="#20b977"></stop><stop offset="1" stop-color="#08764a"></stop>
          </linearGradient>
          <linearGradient id="qhWrongTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ff9a9a"></stop><stop offset=".48" stop-color="#eb5d65"></stop><stop offset="1" stop-color="#ad2933"></stop>
          </linearGradient>
          <linearGradient id="qhNullTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffe186"></stop><stop offset=".5" stop-color="#e7b933"></stop><stop offset="1" stop-color="#a77700"></stop>
          </linearGradient>
          <radialGradient id="qhCenterDiscGradient" cx="42%" cy="32%" r="74%">
            <stop offset="0" stop-color="#ffffff"></stop><stop offset=".66" stop-color="#edf6fb"></stop><stop offset="1" stop-color="#cfdfeb"></stop>
          </radialGradient>
          <linearGradient id="qhDonutGloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffffff" stop-opacity=".72"></stop><stop offset="1" stop-color="#ffffff" stop-opacity="0"></stop>
          </linearGradient>
          <filter id="qhDonutShadow" x="-30%" y="-80%" width="160%" height="260%">
            <feGaussianBlur stdDeviation="12"></feGaussianBlur>
          </filter>
          <filter id="qhCenterBlur" x="-25%" y="-45%" width="150%" height="190%">
            <feGaussianBlur stdDeviation="5"></feGaussianBlur>
          </filter>
          <filter id="qhSegmentShadow" x="-30%" y="-40%" width="160%" height="190%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#031a2d" flood-opacity=".22"></feDropShadow>
          </filter>
          <filter id="qhSegmentHoverShadow" x="-35%" y="-45%" width="170%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#031a2d" flood-opacity=".34"></feDropShadow>
          </filter>
        </defs>
        <ellipse class="qh-donut-ground-shadow" cx="220" cy="226" rx="152" ry="20"></ellipse>
        <g class="qh-donut-depth" aria-hidden="true">${depth}</g>
        <g class="qh-donut-top">${top}</g>
        <ellipse class="qh-donut-gloss" cx="220" cy="101" rx="140" ry="52"></ellipse>
        <ellipse class="qh-donut-rim" cx="220" cy="126" rx="155" ry="79"></ellipse>
        <ellipse class="qh-donut-inner-rim" cx="220" cy="126" rx="88" ry="46"></ellipse>
        <ellipse class="qh-donut-center-shadow" cx="220" cy="134" rx="87" ry="47"></ellipse>
        <ellipse class="qh-donut-center-disc" cx="220" cy="126" rx="83" ry="43"></ellipse>
        <text class="qh-donut-center-value" x="220" y="122" text-anchor="middle">${formatPercent(values.correct, total)}</text>
        <text class="qh-donut-center-label" x="220" y="148" text-anchor="middle">de acertos</text>
        <text class="qh-donut-caption" x="220" y="280" text-anchor="middle">Proporção das ${formatInteger(total)} questões selecionadas</text>
      </svg>
    `;
  }

  function resultRow(className, label, value, total) {
    return `
      <div class="qh-result-row ${className}">
        <span class="qh-result-label"><span class="qh-result-dot ${className}"></span>${label}</span>
        <span class="qh-result-values"><strong>${formatInteger(value)}</strong><small>${formatPercent(value, total)}</small></span>
      </div>
    `;
  }

  function chartFor(period, values) {
    const total = values.correct + values.wrong + values.null;
    const accuracy = percentNumber(values.correct, total);
    const description = periodDescription(period.key);

    if (!total) {
      return `
        <div class="qh-chart-empty">
          <div class="qh-empty-ring" aria-hidden="true"></div>
          <strong>Nenhum resultado em ${period.label.toLowerCase()}</strong>
          <span>${description}. Os demais filtros desta tela também são considerados.</span>
        </div>
      `;
    }

    return `
      <article class="qh-chart-card">
        <div class="qh-chart-visual">
          <div class="qh-donut-wrap">
            ${donutSvg(period, values, total)}
          </div>
        </div>
        <div class="qh-chart-info">
          <div class="qh-chart-heading">
            <span class="qh-chart-heading-copy">
              <small>Período selecionado</small>
              <strong>${period.label}</strong>
            </span>
            <span class="qh-total-badge">${formatInteger(total)} questões</span>
          </div>
          <div class="qh-result-grid">
            ${resultRow("correct", "Acertos", values.correct, total)}
            ${resultRow("wrong", "Erros", values.wrong, total)}
            ${resultRow("null", "Nulos", values.null, total)}
          </div>
          <div class="qh-accuracy-box">
            <div class="qh-accuracy-line"><span>Aproveitamento</span><strong>${formatPercent(values.correct, total)}</strong></div>
            <div class="qh-accuracy-track" aria-hidden="true"><div class="qh-accuracy-fill" style="width: ${Math.min(100, accuracy)}%"></div></div>
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    injectStyles();
    const host = ensurePanel();
    if (!host) return;

    const key = selectedPeriodKey();
    const period = PERIODS.find((item) => item.key === key) || PERIODS[2];
    const stats = collectStats();

    host.innerHTML = chartFor(period, stats[period.key]);
    const label = document.getElementById(PERIOD_LABEL_ID);
    const description = document.getElementById(PERIOD_DESCRIPTION_ID);
    if (label) label.textContent = period.label;
    if (description) description.textContent = periodDescription(period.key);
  }

  function scheduleRender() {
    window.clearTimeout(scheduleRender.timeoutId);
    scheduleRender.timeoutId = window.setTimeout(render, 40);
  }

  function observeTable() {
    const body = document.getElementById(TABLE_BODY_ID);
    if (!body || body.dataset.pieObserved === "true") return;

    body.dataset.pieObserved = "true";
    const observer = new MutationObserver(scheduleRender);
    observer.observe(body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["hidden", "style", "class"]
    });
  }

  function bindFilters() {
    FILTER_IDS.forEach((id) => {
      const element = document.getElementById(id);
      if (!element || element.dataset.pieBound === "true") return;
      element.dataset.pieBound = "true";
      element.addEventListener("change", () => window.setTimeout(render, 0));
      element.addEventListener("input", () => window.setTimeout(render, 0));
    });
  }

  function initialize() {
    injectStyles();
    ensurePanel();
    observeTable();
    bindFilters();
    render();

    window.setTimeout(() => {
      observeTable();
      bindFilters();
      render();
    }, 350);

    window.setTimeout(render, 1100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.addEventListener("hashchange", () => window.setTimeout(render, 80));
})();
