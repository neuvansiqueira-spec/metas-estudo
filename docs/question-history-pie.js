(() => {
  "use strict";

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
        display: grid;
        place-items: center;
        min-width: 0;
        min-height: 305px;
        padding: .5rem;
        border-radius: 16px;
        background:
          radial-gradient(circle at 50% 44%, rgba(21,155,99,.08), transparent 44%),
          linear-gradient(180deg, #fbfdff, #f3f7fa);
        perspective: 1000px;
      }

      .qh-donut-wrap {
        position: relative;
        display: grid;
        place-items: center;
        width: 280px;
        height: 250px;
      }

      .qh-donut-shadow {
        position: absolute;
        left: 50%;
        bottom: 28px;
        width: 210px;
        height: 40px;
        border-radius: 50%;
        background: rgba(8, 43, 73, .17);
        filter: blur(12px);
        transform: translateX(-50%);
      }

      .qh-donut {
        --qh-pie-gradient: conic-gradient(${COLORS.empty} 0 100%);
        position: relative;
        z-index: 1;
        width: 220px;
        aspect-ratio: 1;
        border-radius: 50%;
        background: var(--qh-pie-gradient);
        transform: rotateX(47deg) rotateZ(-3deg);
        transform-style: preserve-3d;
        box-shadow:
          0 18px 0 rgba(8, 43, 73, .22),
          0 26px 22px rgba(8, 43, 73, .17),
          inset 0 4px 3px rgba(255,255,255,.62);
      }

      .qh-donut::before {
        content: "";
        position: absolute;
        inset: 38px;
        border-radius: 50%;
        background: #fff;
        box-shadow:
          inset 0 4px 10px rgba(8,43,73,.13),
          0 2px 0 rgba(255,255,255,.8);
      }

      .qh-donut::after {
        content: "";
        position: absolute;
        inset: 4px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,.44);
        pointer-events: none;
      }

      .qh-donut-center {
        position: absolute;
        z-index: 3;
        display: grid;
        place-items: center;
        align-content: center;
        width: 120px;
        height: 92px;
        text-align: center;
        pointer-events: none;
      }

      .qh-donut-center strong {
        color: ${COLORS.navy};
        font-size: 2rem;
        line-height: 1;
      }

      .qh-donut-center span {
        margin-top: .28rem;
        color: #657a8e;
        font-size: .78rem;
        font-weight: 700;
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
        border-radius: 13px;
        background: #fbfdff;
      }

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

      .qh-result-dot.correct { background: ${COLORS.correct}; }
      .qh-result-dot.wrong { background: ${COLORS.wrong}; }
      .qh-result-dot.null { background: ${COLORS.null}; }

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
        height: 10px;
        overflow: hidden;
        border-radius: 999px;
        background: #dfe8ee;
      }

      .qh-accuracy-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, ${COLORS.correct}, #38b980);
        transition: width .35s ease;
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

      @media (max-width: 820px) {
        .qh-chart-card {
          grid-template-columns: 1fr;
        }

        .qh-chart-visual {
          min-height: 275px;
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
          width: 240px;
          height: 220px;
        }

        .qh-donut {
          width: 190px;
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

  function gradientFor(values) {
    const total = values.correct + values.wrong + values.null;
    if (!total) return `conic-gradient(${COLORS.empty} 0 100%)`;

    const correctEnd = percentNumber(values.correct, total);
    const wrongEnd = correctEnd + percentNumber(values.wrong, total);

    return `conic-gradient(
      ${COLORS.correct} 0 ${correctEnd}%,
      ${COLORS.wrong} ${correctEnd}% ${wrongEnd}%,
      ${COLORS.null} ${wrongEnd}% 100%
    )`;
  }

  function resultRow(className, label, value, total) {
    return `
      <div class="qh-result-row">
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
        <div class="qh-chart-visual" aria-label="Gráfico de ${period.label}: ${formatInteger(values.correct)} acertos, ${formatInteger(values.wrong)} erros e ${formatInteger(values.null)} nulos">
          <div class="qh-donut-wrap">
            <div class="qh-donut-shadow" aria-hidden="true"></div>
            <div class="qh-donut" style="--qh-pie-gradient: ${gradientFor(values)}" aria-hidden="true"></div>
            <div class="qh-donut-center">
              <strong>${formatPercent(values.correct, total)}</strong>
              <span>de acertos</span>
            </div>
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