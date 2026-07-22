(() => {
  if (window.__aldusCalendarMonthVisibilityV130) return;
  window.__aldusCalendarMonthVisibilityV130 = true;

  document.getElementById("aldusCalendarMonthVisibilityV129")?.remove();

  const styleId = "aldusCalendarMonthVisibilityV130";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid {
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)) !important;
      align-items: stretch !important;
      gap: 12px !important;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day {
      position: relative !important;
      isolation: isolate !important;
      display: grid !important;
      grid-template-columns: 64px minmax(0, 1fr) !important;
      grid-template-areas:
        "day type"
        "goals goals"
        "done done" !important;
      align-content: start !important;
      align-items: center !important;
      gap: 10px 12px !important;
      min-width: 0 !important;
      min-height: 146px !important;
      padding: 16px !important;
      overflow: hidden !important;
      border: 1px solid rgba(112, 174, 220, .36) !important;
      border-radius: 18px !important;
      background:
        radial-gradient(circle at 90% 10%, rgba(66, 153, 225, .14), transparent 42%),
        linear-gradient(145deg, rgba(12, 49, 80, .99), rgba(5, 27, 46, .99)) !important;
      box-shadow: 0 10px 24px rgba(0, 8, 20, .18) !important;
      cursor: pointer !important;
      transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease !important;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day::after {
      content: "";
      position: absolute;
      inset: 0 0 auto;
      height: 3px;
      z-index: -1;
      background: linear-gradient(90deg, #4d9df5, #57d4c3);
      opacity: .8;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day:hover {
      transform: translateY(-2px) !important;
      border-color: rgba(118, 190, 246, .68) !important;
      box-shadow: 0 14px 30px rgba(0, 8, 20, .26) !important;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day:focus-visible {
      outline: 3px solid rgba(95, 178, 255, .5) !important;
      outline-offset: 2px !important;
      border-color: #7fc5ff !important;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day > strong {
      grid-area: day !important;
      align-self: center !important;
      margin: 0 !important;
      color: #ffffff !important;
      font-size: clamp(2.25rem, 3.4vw, 2.85rem) !important;
      font-weight: 900 !important;
      line-height: .95 !important;
      letter-spacing: -.045em !important;
      text-shadow: 0 2px 8px rgba(0, 0, 0, .24) !important;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day > small {
      grid-area: type !important;
      justify-self: start !important;
      align-self: center !important;
      display: inline-flex !important;
      align-items: center !important;
      min-width: 0 !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 7px 11px !important;
      overflow: visible !important;
      border: 1px solid rgba(116, 177, 238, .3) !important;
      border-radius: 999px !important;
      background: rgba(44, 105, 177, .24) !important;
      color: #e6f3ff !important;
      font-size: .82rem !important;
      font-weight: 850 !important;
      line-height: 1.15 !important;
      text-overflow: clip !important;
      white-space: nowrap !important;
      word-break: normal !important;
      overflow-wrap: normal !important;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day > span {
      position: relative !important;
      grid-column: 1 / -1 !important;
      display: flex !important;
      align-items: center !important;
      min-width: 0 !important;
      min-height: 40px !important;
      margin: 0 !important;
      padding: 10px 12px 10px 40px !important;
      overflow: visible !important;
      border: 1px solid rgba(103, 165, 229, .25) !important;
      border-radius: 12px !important;
      background: rgba(7, 31, 53, .58) !important;
      color: #edf6ff !important;
      font-size: .92rem !important;
      font-weight: 800 !important;
      line-height: 1.2 !important;
      white-space: nowrap !important;
      word-break: normal !important;
      overflow-wrap: normal !important;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day > span:nth-of-type(1) {
      grid-area: goals !important;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day > span:nth-of-type(1)::before {
      content: "";
      position: absolute;
      left: 15px;
      width: 9px;
      height: 9px;
      border: 2px solid #69aaff;
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(105, 170, 255, .13);
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day > span:nth-of-type(2) {
      grid-area: done !important;
      border-color: rgba(70, 210, 167, .26) !important;
      background: rgba(13, 82, 67, .25) !important;
      color: #dcfff4 !important;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day > span:nth-of-type(2)::before {
      content: "";
      position: absolute;
      left: 15px;
      width: 12px;
      height: 7px;
      border-left: 2px solid #54dfb0;
      border-bottom: 2px solid #54dfb0;
      transform: rotate(-45deg) translateY(-1px);
      transform-origin: center;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day.unavailable {
      border-color: rgba(154, 169, 184, .25) !important;
      background: linear-gradient(145deg, rgba(38, 51, 64, .94), rgba(20, 33, 46, .98)) !important;
      box-shadow: 0 8px 20px rgba(0, 8, 20, .14) !important;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day.unavailable::after {
      background: linear-gradient(90deg, #778899, #526273);
      opacity: .48;
    }

    html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day.unavailable > small {
      border-color: rgba(181, 194, 207, .2) !important;
      background: rgba(97, 112, 126, .2) !important;
      color: #d2dce5 !important;
    }

    @media (max-width: 540px) {
      html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid {
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 10px !important;
      }

      html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day {
        min-height: 0 !important;
        grid-template-columns: 66px minmax(0, 1fr) !important;
        padding: 14px !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day {
        transition: none !important;
      }

      html[data-aldus-theme="premium-stable"] #view-calendario-metas .month-grid > article.clickable-day:hover {
        transform: none !important;
      }
    }
  `;
  document.head.appendChild(style);
})();
