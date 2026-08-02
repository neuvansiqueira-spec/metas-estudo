(() => {
  "use strict";

  const MODULE_MARKER = "/* Aldus runtime source: question-history-charts-v215.js */";
  const PANEL_ID = "questionHistoryChartsV215";
  const STYLE_ID = "questionHistoryChartsStylesV215";
  const RESULT_ID = "questionHistoryFilterExportResultV198";
  const PALETTE = Object.freeze([
    { solid: "#1769aa", light: "#4ba3e3", dark: "#0c4678" },
    { solid: "#16705c", light: "#38aa8b", dark: "#0b4a3d" },
    { solid: "#a06d12", light: "#dfb54e", dark: "#684406" },
    { solid: "#6b4b99", light: "#a786d4", dark: "#49306e" },
    { solid: "#1e7582", light: "#4eafbd", dark: "#114d57" },
    { solid: "#a9444e", light: "#df7b83", dark: "#722831" },
    { solid: "#46638e", light: "#7796c6", dark: "#2d4264" }
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
      #${PANEL_ID} .qhcv215-chart-row{display:grid;grid-template-columns:202px minmax(0,1fr);gap:22px;align-items:center}
      #${PANEL_ID} .qhcv215-card:first-child .qhcv215-chart-row{grid-template-columns:226px minmax(0,1fr);gap:30px}
      #${PANEL_ID} .qhcv215-chart-visual{position:relative;display:grid;place-items:center;min-height:202px;padding:9px;border:1px solid rgba(141,174,198,.48);border-radius:50%;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.98) 0 37%,rgba(220,235,245,.94) 38% 57%,rgba(180,207,226,.42) 58% 66%,transparent 67%);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 13px 25px rgba(3,32,58,.13);isolation:isolate}
      #${PANEL_ID} .qhcv215-card:first-child .qhcv215-chart-visual{min-height:226px}
      #${PANEL_ID} .qhcv215-chart-visual::before{content:"";position:absolute;inset:13%;z-index:-1;border-radius:50%;background:radial-gradient(circle,rgba(33,113,170,.14),transparent 68%);filter:blur(7px)}
      #${PANEL_ID} .qhcv215-chart-visual::after{content:"";position:absolute;left:20%;right:20%;bottom:4%;height:12%;z-index:-2;border-radius:50%;background:rgba(3,32,58,.2);filter:blur(10px);transform:scaleY(.45)}
      #${PANEL_ID} .qhcv215-donut{display:block;width:184px;height:184px;overflow:visible;filter:drop-shadow(0 10px 12px rgba(3,32,58,.17))}
      #${PANEL_ID} .qhcv215-card:first-child .qhcv215-donut{width:208px;height:208px}
      #${PANEL_ID} .qhcv215-donut-bg{fill:none;stroke:#dce8f0;stroke-width:16}
      #${PANEL_ID} .qhcv215-donut-bg-inner{fill:none;stroke:rgba(255,255,255,.86);stroke-width:2}
      #${PANEL_ID} .qhcv215-segment-depth{fill:none;stroke-width:14;stroke-linecap:round;opacity:.96}
      #${PANEL_ID} .qhcv215-segment{fill:none;stroke-width:14;stroke-linecap:round;transform-origin:60px 60px;filter:url(#qhcv215SegmentShadow);transition:stroke-dasharray .35s ease,stroke-dashoffset .35s ease,filter .2s ease}
      #${PANEL_ID} .qhcv215-segment-highlight{fill:none;stroke:rgba(255,255,255,.34);stroke-width:2.2;stroke-linecap:round;pointer-events:none}
      #${PANEL_ID} .qhcv215-center-shadow{fill:rgba(3,32,58,.18);filter:url(#qhcv215CenterShadow)}
      #${PANEL_ID} .qhcv215-center-disc{fill:url(#qhcv215CenterDisc);stroke:rgba(199,154,59,.62);stroke-width:1.3}
      #${PANEL_ID} .qhcv215-total{fill:#082b49;font-size:18px;font-weight:900;text-anchor:middle;letter-spacing:-.03em}
      #${PANEL_ID} .qhcv215-total-label{fill:#5d748a;font-size:6.7px;font-weight:850;text-anchor:middle;text-transform:uppercase;letter-spacing:.055em}
      #${PANEL_ID} .qhcv215-dominant{fill:#6b8093;font-size:5.6px;font-weight:800;text-anchor:middle;letter-spacing:.02em}
      #${PANEL_ID} .qhcv215-legend{display:grid;gap:8px;min-width:0;max-height:228px;overflow:auto;padding:2px 5px 2px 0;scrollbar-width:thin;scrollbar-color:#9db2c3 transparent}
      #${PANEL_ID} .qhcv215-card:first-child .qhcv215-legend{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:12px;max-height:250px}
      #${PANEL_ID} .qhcv215-legend-item{display:grid;grid-template-columns:25px minmax(0,1fr) auto;grid-template-areas:"rank label value" "rank track value";gap:4px 8px;align-items:center;min-width:0;padding:9px 10px;border:1px solid #dce6ee;border-left:3px solid var(--qhcv-color);border-radius:13px;background:rgba(255,255,255,.66);box-shadow:0 3px 9px rgba(3,32,58,.055);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
      #${PANEL_ID} .qhcv215-legend-item:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--qhcv-color) 42%,#dce6ee);box-shadow:0 7px 15px rgba(3,32,58,.1)}
      #${PANEL_ID} .qhcv215-rank{grid-area:rank;display:grid;place-items:center;width:25px;height:25px;border-radius:8px;background:var(--qhcv-color);color:#fff;font-size:.68rem;font-weight:900;box-shadow:0 3px 8px rgba(3,32,58,.18)}
      #${PANEL_ID} .qhcv215-label{grid-area:label;min-width:0;color:#284762;font-size:.76rem;font-weight:820;line-height:1.28;overflow-wrap:anywhere}
      #${PANEL_ID} .qhcv215-value{grid-area:value;align-self:center;color:#082b49;font-size:.78rem;font-weight:900;text-align:right;white-space:nowrap}
      #${PANEL_ID} .qhcv215-value small{display:block;margin-top:2px;color:#60788e;font-size:.66rem;font-weight:850}
      #${PANEL_ID} .qhcv215-share-track{grid-area:track;display:block;height:5px;border-radius:999px;background:#dce6ee;overflow:hidden}
      #${PANEL_ID} .qhcv215-share-track i{display:block;position:relative;width:var(--qhcv-share);height:100%;min-width:3px;border-radius:inherit;background:linear-gradient(90deg,var(--qhcv-color),var(--qhcv-light));box-shadow:0 0 8px color-mix(in srgb,var(--qhcv-color) 32%,transparent)}
      #${PANEL_ID} .qhcv215-share-track i::after{content:"";position:absolute;inset:0 0 50%;border-radius:inherit;background:rgba(255,255,255,.32)}
      #${PANEL_ID} .qhcv215-empty{margin:0;padding:18px;border:1px dashed #bdcedc;border-radius:14px;background:rgba(255,255,255,.5);color:#60768b;font-size:.86rem;font-weight:700;text-align:center}
      @media(max-width:1120px){#${PANEL_ID} .qhcv215-card:first-child .qhcv215-legend{grid-template-columns:1fr}}
      @media(max-width:900px){#${PANEL_ID} .qhcv215-grid{grid-template-columns:1fr}#${PANEL_ID} .qhcv215-card:first-child{grid-column:auto}#${PANEL_ID} .qhcv215-card:first-child .qhcv215-chart-row,#${PANEL_ID} .qhcv215-chart-row{grid-template-columns:202px minmax(0,1fr);gap:22px}#${PANEL_ID} .qhcv215-card:first-child .qhcv215-chart-visual,#${PANEL_ID} .qhcv215-chart-visual{min-height:202px}#${PANEL_ID} .qhcv215-card:first-child .qhcv215-donut,#${PANEL_ID} .qhcv215-donut{width:184px;height:184px}}
      @media(max-width:620px){#${PANEL_ID}{padding:14px;border-radius:19px}#${PANEL_ID} .qhcv215-header{display:block;margin-bottom:14px;padding-bottom:14px}#${PANEL_ID} .qhcv215-badge{margin-top:11px}#${PANEL_ID} .qhcv215-card{padding:14px;border-radius:16px}#${PANEL_ID} .qhcv215-card:first-child .qhcv215-chart-row,#${PANEL_ID} .qhcv215-chart-row{grid-template-columns:1fr;gap:15px}#${PANEL_ID} .qhcv215-card:first-child .qhcv215-chart-visual,#${PANEL_ID} .qhcv215-chart-visual{width:min(100%,208px);min-height:208px;margin:0 auto}#${PANEL_ID} .qhcv215-card:first-child .qhcv215-donut,#${PANEL_ID} .qhcv215-donut{margin:0 auto;width:188px;height:188px}#${PANEL_ID} .qhcv215-legend,#${PANEL_ID} .qhcv215-card:first-child .qhcv215-legend{grid-template-columns:1fr;max-height:none;overflow:visible;padding-right:0}#${PANEL_ID} .qhcv215-card-header{align-items:center}}
      @media(prefers-reduced-motion:reduce){#${PANEL_ID} .qhcv215-segment,#${PANEL_ID} .qhcv215-legend-item{transition:none}}
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
    const segmentData = entries.map((entry, index) => {
      const length = total ? (entry.value / total) * circumference : 0;
      const gap = entries.length > 1 ? Math.min(2.2, length * .16) : 0;
      const visibleLength = Math.max(.001, length - gap);
      const palette = PALETTE[index % PALETTE.length];
      const data = { entry, index, length, visibleLength, offset, palette };
      offset += length;
      return data;
    });
    const gradients = segmentData.map(({ index, palette }) => `<linearGradient id="qhcv215Gradient${index}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.light}"></stop><stop offset=".52" stop-color="${palette.solid}"></stop><stop offset="1" stop-color="${palette.dark}"></stop></linearGradient>`).join("");
    const circle = ({ entry, index, visibleLength, offset, palette }, className, stroke, cy = 60) => `<circle class="${className}" cx="60" cy="${cy}" r="${radius}" stroke="${stroke}" stroke-dasharray="${visibleLength.toFixed(3)} ${(circumference - visibleLength).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}" transform="rotate(-90 60 60)">${className === "qhcv215-segment" ? `<title>${escapeHtml(entry.label)}: ${entry.value}</title>` : ""}</circle>`;
    const depth = segmentData.map((data) => circle(data, "qhcv215-segment-depth", data.palette.dark, 62.2)).join("");
    const circles = segmentData.map((data) => circle(data, "qhcv215-segment", `url(#qhcv215Gradient${data.index})`)).join("");
    const highlights = segmentData.map((data) => circle(data, "qhcv215-segment-highlight", "rgba(255,255,255,.38)", 58.7)).join("");
    const leader = entries[0];
    const leaderShare = total && leader ? `${Math.round(leader.value / total * 100)}% principal` : "sem dados";
    return `<div class="qhcv215-chart-visual"><svg class="qhcv215-donut" viewBox="0 0 120 120" role="img" aria-label="${escapeHtml(title)}: ${total} questões distribuídas em ${entries.length} categorias"><defs>${gradients}<radialGradient id="qhcv215CenterDisc" cx="42%" cy="34%" r="72%"><stop offset="0" stop-color="#ffffff"></stop><stop offset=".68" stop-color="#edf5fa"></stop><stop offset="1" stop-color="#d6e5ef"></stop></radialGradient><filter id="qhcv215SegmentShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.25" flood-color="#03203a" flood-opacity=".25"></feDropShadow></filter><filter id="qhcv215CenterShadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"></feGaussianBlur></filter></defs><circle class="qhcv215-donut-bg" cx="60" cy="60" r="${radius}"></circle><g aria-hidden="true">${depth}</g>${circles}<g aria-hidden="true">${highlights}</g><circle class="qhcv215-donut-bg-inner" cx="60" cy="60" r="35.8"></circle><circle class="qhcv215-center-shadow" cx="60" cy="62" r="29"></circle><circle class="qhcv215-center-disc" cx="60" cy="59.5" r="27.5"></circle><text class="qhcv215-total" x="60" y="57">${total}</text><text class="qhcv215-total-label" x="60" y="67">questões</text><text class="qhcv215-dominant" x="60" y="75">${leaderShare}</text></svg></div>`;
  }

  function legendHtml(entries) {
    const total = entries.reduce((sum, entry) => sum + entry.value, 0);
    return `<div class="qhcv215-legend">${entries.map((entry, index) => {
      const percentage = total ? (entry.value / total) * 100 : 0;
      const palette = PALETTE[index % PALETTE.length];
      return `<div class="qhcv215-legend-item" title="${escapeHtml(entry.label)}" style="--qhcv-color:${palette.solid};--qhcv-light:${palette.light};--qhcv-share:${percentage.toFixed(1)}%"><span class="qhcv215-rank">${index + 1}</span><span class="qhcv215-label">${escapeHtml(entry.label)}</span><span class="qhcv215-value">${entry.value} <small>${percentage.toFixed(1)}%</small></span><span class="qhcv215-share-track" aria-hidden="true"><i></i></span></div>`;
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
