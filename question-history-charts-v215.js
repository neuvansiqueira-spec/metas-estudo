(() => {
  "use strict";

  const MODULE_MARKER = "/* Aldus runtime source: question-history-charts-v215.js */";
  const PANEL_ID = "questionHistoryChartsV215";
  const STYLE_ID = "questionHistoryChartsStylesV215";
  const RESULT_ID = "questionHistoryFilterExportResultV198";
  const COLORS = Object.freeze([
    "#1769aa",
    "#16705c",
    "#94620b",
    "#6b4b99",
    "#1e7582",
    "#a9444e",
    "#46638e"
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
        margin:22px 0 20px;
        padding:clamp(16px,2.2vw,24px);
        border:1px solid rgba(199,154,59,.42);
        border-radius:24px;
        background:linear-gradient(180deg,#f9fcff 0%,#eef5fa 100%);
        box-shadow:0 16px 36px rgba(3,32,58,.14),inset 0 3px 0 rgba(199,154,59,.78);
        color:#17324d;
        box-sizing:border-box;
      }
      #${PANEL_ID} .qhcv215-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:20px;padding-bottom:17px;border-bottom:1px solid rgba(11,49,84,.12)}
      #${PANEL_ID} .qhcv215-title{margin:0;color:#082b49;font-size:clamp(1.18rem,2vw,1.52rem);font-weight:900;line-height:1.2;letter-spacing:-.018em;text-shadow:none}
      #${PANEL_ID} .qhcv215-subtitle{max-width:680px;margin:6px 0 0;color:#506b84;font-size:clamp(.84rem,1.2vw,.94rem);font-weight:700;line-height:1.5}
      #${PANEL_ID} .qhcv215-badge{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;padding:7px 11px;border:1px solid rgba(35,134,111,.3);border-radius:999px;background:#e7f5f0;color:#17644f;font-size:.7rem;font-weight:900;letter-spacing:.025em;text-transform:uppercase;white-space:nowrap}
      #${PANEL_ID} .qhcv215-badge::before{content:"";width:7px;height:7px;border-radius:50%;background:#23866f;box-shadow:0 0 0 3px rgba(35,134,111,.13)}
      #${PANEL_ID} .qhcv215-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:stretch}
      #${PANEL_ID} .qhcv215-card{min-width:0;padding:18px;border:1px solid #d5e1eb;border-radius:20px;background:#fff;box-shadow:0 8px 22px rgba(3,32,58,.1);overflow:hidden}
      #${PANEL_ID} .qhcv215-card:first-child{grid-column:1/-1}
      #${PANEL_ID} .qhcv215-card-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 16px;padding-bottom:12px;border-bottom:1px solid #e0e8ef}
      #${PANEL_ID} .qhcv215-card h4{margin:0;color:#0b3154;font-size:clamp(1rem,1.45vw,1.15rem);font-weight:900;line-height:1.25;text-shadow:none;opacity:1}
      #${PANEL_ID} .qhcv215-category-count{flex:0 0 auto;padding:5px 9px;border-radius:999px;background:#e6eef5;color:#46627c;font-size:.68rem;font-weight:850;white-space:nowrap}
      #${PANEL_ID} .qhcv215-chart-row{display:grid;grid-template-columns:168px minmax(0,1fr);gap:20px;align-items:center}
      #${PANEL_ID} .qhcv215-card:first-child .qhcv215-chart-row{grid-template-columns:190px minmax(0,1fr);gap:28px}
      #${PANEL_ID} .qhcv215-donut{display:block;width:168px;height:168px;overflow:visible;filter:drop-shadow(0 8px 10px rgba(3,32,58,.11))}
      #${PANEL_ID} .qhcv215-card:first-child .qhcv215-donut{width:190px;height:190px}
      #${PANEL_ID} .qhcv215-donut-bg{fill:none;stroke:#e6edf3;stroke-width:13}
      #${PANEL_ID} .qhcv215-segment{fill:none;stroke-width:13;stroke-linecap:butt;transform-origin:60px 60px;transition:stroke-dasharray .35s ease,stroke-dashoffset .35s ease}
      #${PANEL_ID} .qhcv215-total{fill:#082b49;font-size:18px;font-weight:900;text-anchor:middle;letter-spacing:-.03em}
      #${PANEL_ID} .qhcv215-total-label{fill:#5d748a;font-size:7px;font-weight:800;text-anchor:middle;text-transform:uppercase;letter-spacing:.04em}
      #${PANEL_ID} .qhcv215-legend{display:grid;gap:8px;min-width:0;max-height:228px;overflow:auto;padding:2px 5px 2px 0;scrollbar-width:thin;scrollbar-color:#9db2c3 transparent}
      #${PANEL_ID} .qhcv215-card:first-child .qhcv215-legend{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:12px;max-height:250px}
      #${PANEL_ID} .qhcv215-legend-item{display:grid;grid-template-columns:25px minmax(0,1fr) auto;grid-template-areas:"rank label value" "rank track value";gap:4px 8px;align-items:center;min-width:0;padding:9px 10px;border:1px solid #dce6ee;border-radius:13px;background:rgba(255,255,255,.66)}
      #${PANEL_ID} .qhcv215-rank{grid-area:rank;display:grid;place-items:center;width:25px;height:25px;border-radius:8px;background:var(--qhcv-color);color:#fff;font-size:.68rem;font-weight:900;box-shadow:0 3px 8px rgba(3,32,58,.18)}
      #${PANEL_ID} .qhcv215-label{grid-area:label;min-width:0;color:#284762;font-size:.76rem;font-weight:820;line-height:1.28;overflow-wrap:anywhere}
      #${PANEL_ID} .qhcv215-value{grid-area:value;align-self:center;color:#082b49;font-size:.78rem;font-weight:900;text-align:right;white-space:nowrap}
      #${PANEL_ID} .qhcv215-value small{display:block;margin-top:2px;color:#60788e;font-size:.66rem;font-weight:850}
      #${PANEL_ID} .qhcv215-share-track{grid-area:track;display:block;height:5px;border-radius:999px;background:#dce6ee;overflow:hidden}
      #${PANEL_ID} .qhcv215-share-track i{display:block;width:var(--qhcv-share);height:100%;min-width:3px;border-radius:inherit;background:var(--qhcv-color)}
      #${PANEL_ID} .qhcv215-empty{margin:0;padding:18px;border:1px dashed #bdcedc;border-radius:14px;background:rgba(255,255,255,.5);color:#60768b;font-size:.86rem;font-weight:700;text-align:center}
      @media(max-width:1120px){#${PANEL_ID} .qhcv215-card:first-child .qhcv215-legend{grid-template-columns:1fr}}
      @media(max-width:900px){#${PANEL_ID} .qhcv215-grid{grid-template-columns:1fr}#${PANEL_ID} .qhcv215-card:first-child{grid-column:auto}#${PANEL_ID} .qhcv215-card:first-child .qhcv215-chart-row,#${PANEL_ID} .qhcv215-chart-row{grid-template-columns:168px minmax(0,1fr);gap:20px}#${PANEL_ID} .qhcv215-card:first-child .qhcv215-donut,#${PANEL_ID} .qhcv215-donut{width:168px;height:168px}}
      @media(max-width:620px){#${PANEL_ID}{padding:14px;border-radius:19px}#${PANEL_ID} .qhcv215-header{display:block;margin-bottom:14px;padding-bottom:14px}#${PANEL_ID} .qhcv215-badge{margin-top:11px}#${PANEL_ID} .qhcv215-card{padding:14px;border-radius:16px}#${PANEL_ID} .qhcv215-card:first-child .qhcv215-chart-row,#${PANEL_ID} .qhcv215-chart-row{grid-template-columns:1fr;gap:12px}#${PANEL_ID} .qhcv215-card:first-child .qhcv215-donut,#${PANEL_ID} .qhcv215-donut{margin:0 auto;width:172px;height:172px}#${PANEL_ID} .qhcv215-legend,#${PANEL_ID} .qhcv215-card:first-child .qhcv215-legend{grid-template-columns:1fr;max-height:none;overflow:visible;padding-right:0}#${PANEL_ID} .qhcv215-card-header{align-items:center}}
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
          .filter((entry) => entry.value > 0)
          .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"));
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
      const color = COLORS[index % COLORS.length];
      return `<div class="qhcv215-legend-item" title="${escapeHtml(entry.label)}" style="--qhcv-color:${color};--qhcv-share:${percentage.toFixed(1)}%"><span class="qhcv215-rank">${index + 1}</span><span class="qhcv215-label">${escapeHtml(entry.label)}</span><span class="qhcv215-value">${entry.value} <small>${percentage.toFixed(1)}%</small></span><span class="qhcv215-share-track" aria-hidden="true"><i></i></span></div>`;
    }).join("")}</div>`;
  }

  function cardHtml(group, index) {
    const categoryLabel = `${group.entries.length} ${group.entries.length === 1 ? "categoria" : "categorias"}`;
    if (!group.entries.length) {
      return `<article class="qhcv215-card"><div class="qhcv215-card-header"><h4>${escapeHtml(group.title)}</h4><span class="qhcv215-category-count">Sem dados</span></div><p class="qhcv215-empty">Nenhum dado disponível para este filtro.</p></article>`;
    }
    return `<article class="qhcv215-card${index === 0 ? " qhcv215-card-featured" : ""}"><div class="qhcv215-card-header"><h4>${escapeHtml(group.title)}</h4><span class="qhcv215-category-count">${categoryLabel}</span></div><div class="qhcv215-chart-row">${donutSvg(group.entries, group.title)}${legendHtml(group.entries)}</div></article>`;
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
    panel.innerHTML = `<div class="qhcv215-header"><div><h3 id="${PANEL_ID}Title" class="qhcv215-title">Distribuição visual das questões</h3><p class="qhcv215-subtitle">Veja onde suas questões estão concentradas. Os valores acompanham automaticamente os filtros aplicados ao histórico.</p></div><span class="qhcv215-badge">Filtros sincronizados</span></div><div class="qhcv215-grid">${data.groups.map(cardHtml).join("")}</div>`;

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
