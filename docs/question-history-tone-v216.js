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
    }

    #questionHistoryFilterExportV198 .qhfe-bar-track-v198 {
      border-color: #c8d8e4 !important;
      background: #d8e5ee !important;
    }

    #questionHistoryFilterExportV198 .qhfe-bar-v198 > strong {
      border-color: #c8d7e3 !important;
      background: #dce8f1 !important;
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

    #questionHistoryChartsV215 .qhcv215-card h4 {
      border-bottom-color: #ccdbe6 !important;
    }

    #questionHistoryChartsV215 .qhcv215-donut-bg {
      stroke: #cfdee9 !important;
    }

    #questionHistoryChartsV215 .qhcv215-badge {
      background: #f2e8c8 !important;
      border-color: rgba(159, 119, 34, .38) !important;
      color: #664b0d !important;
    }
  `;
  document.head.appendChild(style);

  globalThis.__ALDUS_QUESTION_HISTORY_TONE_V216__ = Object.freeze({
    styleId: STYLE_ID,
    version: "20260802-tons-azulados-historico-v216"
  });
})();
