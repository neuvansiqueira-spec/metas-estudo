(() => {
  "use strict";

  const PANEL_ID = "questionHistoryPiePanel";
  const GRID_ID = "questionHistoryPieCharts";
  const TABLE_BODY_ID = "questionHistoryBody";
  const FILTER_IDS = [
    "questionFilterDiscipline",
    "questionFilterSubject",
    "questionFilterOrigin",
    "questionFilterBoard"
  ];

  const COLORS = {
    correct: "#1f9d67",
    wrong: "#d94b4b",
    null: "#d7a514",
    empty: "#dfe7ef"
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
      .qh-pie-panel {
        margin: 1.25rem 0 1.5rem;
        padding: 1.1rem;
        border: 1px solid rgba(8, 43, 73, 0.12);
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(246,250,253,.98));
        box-shadow: 0 14px 32px rgba(8, 43, 73, 0.08);
      }

      .qh-pie-panel-heading {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
        margin-bottom: .85rem;
      }

      .qh-pie-panel-heading h3 {
        margin: .15rem 0 0;
        color: #082b49;
        font-size: 1.16rem;
      }

      .qh-pie-panel-heading p {
        margin: 0;
        color: #61768a;
        font-size: .88rem;
      }

      .qh-pie-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }

      .qh-pie-card {
        min-width: 0;
        padding: 1rem;
        border: 1px solid rgba(8, 43, 73, 0.11);
        border-radius: 18px;
        background: #fff;
        box-shadow: 0 8px 20px rgba(8, 43, 73, 0.07);
      }

      .qh-pie-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: .75rem;
      }

      .qh-pie-card-header strong {
        color: #082b49;
        font-size: 1rem;
      }

      .qh-pie-card-header span {
        color: #667b8f;
        font-size: .82rem;
        white-space: nowrap;
      }

      .qh-pie-stage {
        display: grid;
        place-items: center;
        min-height: 184px;
        padding: .7rem 0 .9rem;
        perspective: 850px;
      }

      .qh-pie {
        --qh-pie-gradient: conic-gradient(${COLORS.empty} 0 100%);
        position: relative;
        width: 158px;
        aspect-ratio: 1;
        border-radius: 50%;
        background: var(--qh-pie-gradient);
        transform: rotateX(58deg) rotateZ(-4deg);
        transform-style: preserve-3d;
        box-shadow:
          0 16px 0 rgba(8, 43, 73, .22),
          0 23px 18px rgba(8, 43, 73, .20),
          inset 0 3px 2px rgba(255, 255, 255, .62);
      }

      .qh-pie::before {
        content: "";
        position: absolute;
        inset: 24px;
        border-radius: 50%;
        background: #fff;
        box-shadow:
          inset 0 3px 8px rgba(8, 43, 73, .12),
          0 2px 0 rgba(255,255,255,.7);
      }

      .qh-pie-center {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: grid;
        place-content: center;
        text-align: center;
        transform: translateZ(16px) rotateZ(4deg);
      }

      .qh-pie-center strong {
        color: #082b49;
        font-size: 1.55rem;
        line-height: 1;
      }

      .qh-pie-center small {
        margin-top: .2rem;
        color: #667b8f;
        font-size: .72rem;
      }

      .qh-pie-legend {
        display: grid;
        gap: .55rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .qh-pie-legend li {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: .6rem;
        color: #253f55;
        font-size: .88rem;
      }

      .qh-pie-label {
        display: flex;
        align-items: center;
        gap: .48rem;
        min-width: 0;
      }

      .qh-pie-dot {
        flex: 0 0 auto;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        box-shadow: inset 0 -2px 2px rgba(0,0,0,.15);
      }

      .qh-pie-dot.correct { background: ${COLORS.correct}; }
      .qh-pie-dot.wrong { background: ${COLORS.wrong}; }
      .qh-pie-dot.null { background: ${COLORS.null}; }

      .qh-pie-number {
        color: #526b7f;
        font-weight: 700;
        text-align: right;
        white-space: nowrap;
      }

      .qh-pie-empty {
        display: grid;
        place-items: center;
        min-height: 184px;
        color: #72869a;
        text-align: center;
        border-radius: 14px;
        background: #f5f8fb;
        border: 1px dashed rgba(8, 43, 73, .18);
      }

      @media (max-width: 620px) {
        .qh-pie-panel { padding: .9rem; }
        .qh-pie-panel-heading { display: block; }
        .qh-pie-grid { grid-template-columns: 1fr; }
        .qh-pie { width: 148px; }
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
    if (match) {
      return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12);
    }

    match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
    }

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
    return first.getFullYear() === second.getFullYear()
      && first.getMonth() === second.getMonth();
  }

  function ensurePanel() {
    const view = document.getElementById("view-historico-questoes");
    if (!view) return null;

    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel.querySelector(`#${GRID_ID}`);

    panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.className = "qh-pie-panel";
    panel.setAttribute("aria-labelledby", "questionHistoryPieTitle");
    panel.innerHTML = `
      <div class="qh-pie-panel-heading">
        <div>
          <p>VISÃO POR PERÍODO</p>
          <h3 id="questionHistoryPieTitle">Acertos, Erros e Nulos</h3>
        </div>
        <p>Dia, semana, mês, ano e histórico completo</p>
      </div>
      <div id="${GRID_ID}" class="qh-pie-grid" aria-live="polite"></div>
    `;

    const summary = document.getElementById("questionHistorySummary");
    const filters = view.querySelector(".filters");

    if (summary) {
      summary.insertAdjacentElement("afterend", panel);
    } else if (filters) {
      view.insertBefore(panel, filters);
    } else {
      view.appendChild(panel);
    }

    return panel.querySelector(`#${GRID_ID}`);
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

  function formatPercent(value, total) {
    if (!total) return "0%";
    return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format((value / total) * 100)}%`;
  }

  function gradientFor(values) {
    const total = values.correct + values.wrong + values.null;
    if (!total) return `conic-gradient(${COLORS.empty} 0 100%)`;

    const correctEnd = (values.correct / total) * 100;
    const wrongEnd = correctEnd + (values.wrong / total) * 100;

    return `conic-gradient(
      ${COLORS.correct} 0 ${correctEnd}%,
      ${COLORS.wrong} ${correctEnd}% ${wrongEnd}%,
      ${COLORS.null} ${wrongEnd}% 100%
    )`;
  }

  function legendItem(className, label, value, total) {
    return `
      <li>
        <span class="qh-pie-label"><span class="qh-pie-dot ${className}"></span>${label}</span>
        <span class="qh-pie-number">${formatInteger(value)} · ${formatPercent(value, total)}</span>
      </li>
    `;
  }

  function cardFor(period, values) {
    const total = values.correct + values.wrong + values.null;

    if (!total) {
      return `
        <article class="qh-pie-card">
          <div class="qh-pie-card-header">
            <strong>${period.label}</strong>
            <span>0 questões</span>
          </div>
          <div class="qh-pie-empty">Nenhum resultado neste período.</div>
        </article>
      `;
    }

    return `
      <article class="qh-pie-card">
        <div class="qh-pie-card-header">
          <strong>${period.label}</strong>
          <span>${formatInteger(total)} questões</span>
        </div>
        <div class="qh-pie-stage">
          <div class="qh-pie" style="--qh-pie-gradient: ${gradientFor(values)}">
            <div class="qh-pie-center">
              <strong>${formatInteger(total)}</strong>
              <small>total</small>
            </div>
          </div>
        </div>
        <ul class="qh-pie-legend">
          ${legendItem("correct", "Acertos", values.correct, total)}
          ${legendItem("wrong", "Erros", values.wrong, total)}
          ${legendItem("null", "Nulos", values.null, total)}
        </ul>
      </article>
    `;
  }

  function render() {
    injectStyles();
    const grid = ensurePanel();
    if (!grid) return;

    const stats = collectStats();
    grid.innerHTML = PERIODS.map((period) => cardFor(period, stats[period.key])).join("");
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
