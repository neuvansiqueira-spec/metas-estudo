(() => {
  "use strict";

  const MODULE_MARKER = "/* Aldus runtime source: question-history-charts-v215.js */";
  const PANEL_ID = "questionHistoryChartsV215";
  const STYLE_ID = "questionHistoryChartsStylesV215";
  const RESULT_ID = "questionHistoryFilterExportResultV198";
  const COLORS = Object.freeze([
    "#1f70b3",
    "#35a37a",
    "#c79a3b",
    "#0b4f7a",
    "#6289ad",
    "#5f8d7b",
    "#9b7d3e"
  ]);

  let lastFingerprint = "";
  let renderScheduled = false;
  let localObserver = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{
        margin:20px 0 18px;
        padding:18px;
        border:1px solid rgba(199,154,59,.42);
        border-radius:21px;
        background:linear-gradient(180deg,#f9fcff 0%,#eef5fa 100%);
        box-shadow:0 12px 28px rgba(3,32,58,.15),inset 0 3px 0 rgba(199,154,59,.78);
        color:#17324d;
        box-sizing:border-box;
      }
      #${PANEL_ID} .qhcv215-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}
      #${PANEL_ID} .qhcv215-title{margin:0;color:#082b49;font-size:clamp(1.08rem,1.8vw,1.36rem);font-weight:900;line-height:1.2;text-shadow:none}
      #${PANEL_ID} .qhcv215-subtitle{margin:5px 0 0;color:#506b84;font-size:.84rem;font-weight:700;line-height:1.4}
      #${PANEL_ID} .qhcv215-badge{flex:0 0 auto;padding:6px 10px;border:1px solid rgba(199,154,59,.5);border-radius:999px;background:#fff7e7;color:#6f5310;font-size:.7rem;font-weight:900;letter-spacing:.025em;text-transform:uppercase}
      #${PANEL_ID} .qhcv215-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:stretch}
      #${PANEL_ID} .qhcv215-card{min-width:0;padding:15px;border:1px solid #d5e1eb;border-radius:17px;background:#fff;box-shadow:0 7px 18px rgba(3,32,58,.1)}
      #${PANEL_ID} .qhcv215-card h4{margin:0 0 12px;padding-bottom:10px;border-bottom:1px solid #e0e8ef;color:#0b3154;font-size:1rem;font-weight:900;line-height:1.25;text-shadow:none;opacity:1}
      #${PANEL_ID} .qhcv215-chart-row{display:grid;grid-template-columns:132px minmax(0,1fr);gap:13px;align-items:center}
      #${PANEL_ID} .qhcv215-donut{display:block;width:132px;height:132px;overflow:visible}
      #${PANEL_ID} .qhcv215-donut-bg{fill:none;stroke:#e6edf3;stroke-width:15}
      #${PANEL_ID} .qhcv215-segment{fill:none;stroke-width:15;transform-origin:60px 60px;transition:stroke-dasharray .35s ease,stroke-dashoffset .35s ease}
      #${PANEL_ID} .qhcv215-total{fill:#082b49;font-size:18px;font-weight:900;text-anchor:middle}
      #${PANEL_ID} .qhcv215-total-label{fill:#5d748a;font-size:7px;font-weight:800;text-anchor:middle;text-transform:uppercase;letter-spacing:.04em}
      #${PANEL_ID} .qhcv215-legend{display:grid;gap:7px;min-width:0;max-height:178px;overflow:auto;padding-right:2px;scrollbar-width:thin}
      #${PANEL_ID} .qhcv215-legend-item{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:7px;align-items:center;min-width:0}
      #${PANEL_ID} .qhcv215-dot{width:9px;height:9px;border-radius:50%;box-shadow:0 0 0 1px rgba(3,32,58,.12)}
      #${PANEL_ID} .qhcv215-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#334f6b;font-size:.72rem;font-weight:750;line-height:1.25}
      #${PANEL_ID} .qhcv215-value{color:#082b49;font-size:.72rem;font-weight:900;text-align:right;white-space:nowrap}
      #${PANEL_ID} .qhcv215-value small{color:#6b8195;font-size:.62rem;font-weight:800}
      #${PANEL_ID} .qhcv215-empty{margin:0;color:#60768b;font-size:.82rem;font-weight:700}
      @media(max-width:1080px){#${PANEL_ID} .qhcv215-grid{grid-template-columns:1fr}#${PANEL_ID} .qhcv215-chart-row{grid-template-columns:145px minmax(0,1fr)}}
      @media(max-width:560px){#${PANEL_ID}{padding:14px}#${PANEL_ID} .qhcv215-header{display:block}#${PANEL_ID} .qhcv215-badge{display:inline-block;margin-top:10px}#${PANEL_ID} .qhcv215-chart-row{grid-template-columns:1fr}#${PANEL_ID} .qhcv215-donut{margin:0 auto;width:150px;height:150px}#${PANEL_ID} .qhcv215-legend{max-height:none}}
      @media(prefers-reduced-motion:reduce){#${PANEL_ID} .qhcv215-segment{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function readBreakdowns() {
    const container = document.querySelector(`#${RESULT_ID} .qhfe-breakdowns-v198`);
    if (!container) return null;
    const groups = [...container.querySelectorAll(":scope > .qhfe-breakdown-v198")]
      .slice(0, 3)
      .map((card) => {
        const title = card.querySelector("h4")?.textContent?.trim() || "Distribuição";
        const entries = [...card.querySelectorAll(".qhfe-bar-v198")]
          .map((row) => ({
            label: row.querySelector(".qhfe-bar-copy-v198 span")?.textContent?.trim() || "Sem identificação",
            value: Number.parseFloat(row.querySelector(":scope > strong")?.textContent?.replace(",", ".") || "0") || 0
          }))
          .filter((entry) => entry.value > 0);
        return { title, entries };
      });
    return { container, groups };
  }

  function donutSvg(entries, title) {
    const total = entries.reduce((sum, entry) => sum + entry.value, 0);
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const circles = entries.map((entry, index) => {
      const length = total ? (entry.value / total) * circumference : 0;
      const color = COLORS[index % COLORS.length];
      const circle = `<circle class="qhcv215-segment" cx="60" cy="60" r="${radius}" stroke="${color}" stroke-dasharray="${length.toFixed(3)} ${(circumference - length).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}" transform="rotate(-90 60 60)"><title>${escapeHtml(entry.label)}: ${entry.value}</title></circle>`;
      offset += length;
      return circle;
    }).join("");
    return `<svg class="qhcv215-donut" viewBox="0 0 120 120" role="img" aria-label="${escapeHtml(title)}: ${total} questões distribuídas em ${entries.length} categorias"><circle class="qhcv215-donut-bg" cx="60" cy="60" r="${radius}"></circle>${circles}<text class="qhcv215-total" x="60" y="58">${total}</text><text class="qhcv215-total-label" x="60" y="70">questões</text></svg>`;
  }

  function legendHtml(entries) {
    const total = entries.reduce((sum, entry) => sum + entry.value, 0);
    return `<div class="qhcv215-legend">${entries.map((entry, index) => {
      const percentage = total ? (entry.value / total) * 100 : 0;
      return `<div class="qhcv215-legend-item" title="${escapeHtml(entry.label)}"><span class="qhcv215-dot" style="background:${COLORS[index % COLORS.length]}"></span><span class="qhcv215-label">${escapeHtml(entry.label)}</span><span class="qhcv215-value">${entry.value} <small>${percentage.toFixed(1)}%</small></span></div>`;
    }).join("")}</div>`;
  }

  function cardHtml(group) {
    if (!group.entries.length) {
      return `<article class="qhcv215-card"><h4>${escapeHtml(group.title)}</h4><p class="qhcv215-empty">Nenhum dado disponível para este filtro.</p></article>`;
    }
    return `<article class="qhcv215-card"><h4>${escapeHtml(group.title)}</h4><div class="qhcv215-chart-row">${donutSvg(group.entries, group.title)}${legendHtml(group.entries)}</div></article>`;
  }

  function render() {
    renderScheduled = false;
    const data = readBreakdowns();
    if (!data || data.groups.length < 1) return;
    const fingerprint = JSON.stringify(data.groups);
    const existing = document.getElementById(PANEL_ID);
    if (fingerprint === lastFingerprint && existing?.isConnected) return;
    lastFingerprint = fingerprint;
    injectStyles();

    const panel = existing || document.createElement("section");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-labelledby", `${PANEL_ID}Title`);
    panel.innerHTML = `<div class="qhcv215-header"><div><h3 id="${PANEL_ID}Title" class="qhcv215-title">Distribuição visual das questões</h3><p class="qhcv215-subtitle">Comparação didática conforme os filtros atuais do histórico.</p></div><span class="qhcv215-badge">Gráfico restaurado</span></div><div class="qhcv215-grid">${data.groups.map(cardHtml).join("")}</div>`;

    if (!existing?.isConnected) data.container.parentElement?.insertBefore(panel, data.container);
  }

  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(render);
  }

  function attachLocalObserver() {
    const result = document.getElementById(RESULT_ID);
    if (!result || localObserver) return false;
    localObserver = new MutationObserver(scheduleRender);
    localObserver.observe(result, { childList: true, subtree: true, characterData: true });
    scheduleRender();
    return true;
  }

  function bootstrap() {
    if (attachLocalObserver()) return;
    const bootstrapObserver = new MutationObserver(() => {
      if (attachLocalObserver()) bootstrapObserver.disconnect();
    });
    bootstrapObserver.observe(document.documentElement, { childList: true, subtree: true });
    scheduleRender();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  else bootstrap();

  globalThis.__ALDUS_QUESTION_HISTORY_CHARTS_V215__ = Object.freeze({
    marker: MODULE_MARKER,
    render: scheduleRender,
    panelId: PANEL_ID
  });
})();
