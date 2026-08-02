(() => {
  "use strict";

  const STYLE_ID = "questionHistoryToneStylesV216";
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #questionHistoryFilterExportV198 .qhfe-summary-v198 article,
    #view-historico-questoes #questionHistorySummary .stat-card {
      background: linear-gradient(180deg, #edf5fa 0%, #e2edf5 100%) !important;
      border-color: rgba(199, 154, 59, .36) !important;
      box-shadow: 0 8px 20px rgba(3, 32, 58, .12), inset 0 1px 0 rgba(255, 255, 255, .58) !important;
    }

    #questionHistoryFilterExportV198 .qhfe-breakdown-v198 {
      background: linear-gradient(180deg, #edf5fa 0%, #e1ecf4 100%) !important;
      border-color: rgba(199, 154, 59, .34) !important;
      box-shadow: 0 10px 24px rgba(3, 32, 58, .13), inset 0 3px 0 rgba(199, 154, 59, .66) !important;
    }

    #questionHistoryFilterExportV198 .qhfe-breakdown-v198 h4 {
      border-bottom-color: #cfdde8 !important;
    }

    #questionHistoryFilterExportV198 .qhfe-bar-v198 {
      border-bottom-color: #d7e3ec !important;
      transition: transform .18s ease, background .18s ease !important;
    }

    #questionHistoryFilterExportV198 .qhfe-bar-v198:hover {
      transform: translateX(2px) !important;
      background: rgba(255, 255, 255, .34) !important;
    }

    #questionHistoryFilterExportV198 .qhfe-bar-track-v198 {
      position: relative !important;
      height: 12px !important;
      border-color: #c8d8e4 !important;
      background: #d8e5ee !important;
      box-shadow: inset 0 1px 3px rgba(3, 32, 58, .15) !important;
    }

    #questionHistoryFilterExportV198 .qhfe-bar-track-v198 i {
      position: relative !important;
      box-shadow: 0 2px 7px rgba(3, 32, 58, .18) !important;
    }

    #questionHistoryFilterExportV198 .qhfe-bar-track-v198 i::after {
      content: "" !important;
      position: absolute !important;
      inset: 0 0 48% !important;
      border-radius: inherit !important;
      background: rgba(255, 255, 255, .34) !important;
    }

    #questionHistoryFilterExportV198 .qhfe-breakdown-v198:nth-child(1) .qhfe-bar-track-v198 i {
      background: linear-gradient(90deg, #1769aa, #55a9df) !important;
    }

    #questionHistoryFilterExportV198 .qhfe-breakdown-v198:nth-child(2) .qhfe-bar-track-v198 i {
      background: linear-gradient(90deg, #16705c, #48b092) !important;
    }

    #questionHistoryFilterExportV198 .qhfe-breakdown-v198:nth-child(3) .qhfe-bar-track-v198 i {
      background: linear-gradient(90deg, #9b6810, #ddb34b) !important;
    }

    #questionHistoryFilterExportV198 .qhfe-bar-v198 > strong {
      border-color: #c8d7e3 !important;
      background: linear-gradient(180deg, #edf5fa, #d7e5ef) !important;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .72), 0 3px 8px rgba(3, 32, 58, .08) !important;
    }

    #questionHistoryChartsV215 {
      background: linear-gradient(180deg, #e8f2f8 0%, #d9e7f1 100%) !important;
      border-color: rgba(199, 154, 59, .38) !important;
      box-shadow: 0 12px 28px rgba(3, 32, 58, .14), inset 0 3px 0 rgba(199, 154, 59, .70) !important;
    }

    #questionHistoryChartsV215 .qhcv215-card {
      background: linear-gradient(180deg, #edf5fa 0%, #e2edf5 100%) !important;
      border-color: #c7d7e3 !important;
      box-shadow: 0 7px 18px rgba(3, 32, 58, .10), inset 0 1px 0 rgba(255, 255, 255, .48) !important;
    }

    #questionHistoryChartsV215 .qhcv215-card-header {
      border-bottom-color: #ccdbe6 !important;
    }

    #questionHistoryChartsV215 .qhcv215-chart-visual {
      border-color: #b8cedd !important;
      background: radial-gradient(circle at 50% 44%, #fbfdff 0 35%, #e3eef6 36% 57%, rgba(167, 198, 219, .34) 58% 66%, transparent 67%) !important;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .92), 0 13px 25px rgba(3, 32, 58, .13) !important;
    }

    #questionHistoryChartsV215 .qhcv215-donut-bg {
      stroke: #cfdee9 !important;
    }

    #questionHistoryChartsV215 .qhcv215-center-disc {
      stroke: rgba(199, 154, 59, .7) !important;
    }

    #questionHistoryChartsV215 .qhcv215-total {
      fill: #082b49 !important;
    }

    #questionHistoryChartsV215 .qhcv215-total-label,
    #questionHistoryChartsV215 .qhcv215-dominant {
      fill: #587086 !important;
    }

    #questionHistoryChartsV215 .qhcv215-badge {
      background: #dcefe9 !important;
      border-color: rgba(35, 134, 111, .32) !important;
      color: #165c49 !important;
    }

    #questionHistoryChartsV215 .qhcv215-legend-item {
      background: rgba(244, 249, 252, .78) !important;
      border-top-color: #cbdbe6 !important;
      border-right-color: #cbdbe6 !important;
      border-bottom-color: #cbdbe6 !important;
    }

    #questionHistoryChartsV215 .qhcv215-share-track {
      background: #ccdae4 !important;
    }
  `;
  document.head.appendChild(style);

  globalThis.__ALDUS_QUESTION_HISTORY_TONE_V216__ = Object.freeze({
    styleId: STYLE_ID,
    version: "20260802-tons-azulados-historico-v216"
  });
})();
