(() => {
  "use strict";

  const VERSION = "20260809-factory-schedule-planning-dates-v281";
  const FLAG = "__ALDUS_FACTORY_SCHEDULE_DATES_V281__";
  if (globalThis[FLAG]) return;

  function today() {
    try { return todayISO(); } catch {}
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function add(date, days) {
    try { return addDays(date, days); } catch {}
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() + days);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  function format(date) {
    try { return formatDateBR(date); } catch {}
    const [year, month, day] = String(date || "").split("-");
    return year && month && day ? `${day}/${month}/${year}` : String(date || "");
  }

  function goalDate(goal = {}) {
    try { return String(goalDateValue(goal) || "").slice(0, 10); } catch {}
    return String(goal.date || goal.data || "").slice(0, 10);
  }

  function planningEnd() {
    const start = today();
    const candidates = [];
    try {
      const profile = typeof contestPlanningProfile === "function" ? contestPlanningProfile(state, start) : null;
      if (profile?.examDate) candidates.push(String(profile.examDate).slice(0, 10));
    } catch {}
    try {
      const config = typeof planningConfig === "function" ? planningConfig(state) : state?.planning?.config;
      if (config?.examDate) candidates.push(String(config.examDate).slice(0, 10));
    } catch {}
    try {
      if (state?.edital?.examDate) candidates.push(String(state.edital.examDate).slice(0, 10));
      (state?.dailyGoals || []).forEach((goal) => {
        const date = goalDate(goal);
        if (date >= start) candidates.push(date);
      });
    } catch {}
    return candidates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= start).sort().at(-1) || add(start, 90);
  }

  function planningDates() {
    const start = today();
    const end = planningEnd();
    const dates = [];
    for (let date = start, guard = 0; date <= end && guard < 367; date = add(date, 1), guard += 1) {
      let hasSavedStudyGoal = false;
      try {
        hasSavedStudyGoal = (state?.dailyGoals || []).some((goal) => {
          if (goalDate(goal) !== date) return false;
          try { return typeof isPlanningStudyGoal !== "function" || isPlanningStudyGoal(goal); } catch { return true; }
        });
      } catch {}

      let targetTopics = 0;
      try { targetTopics = Number(planningTargetsForDate(date, state)?.topics) || 0; } catch {}
      if (hasSavedStudyGoal || targetTopics > 0) dates.push(date);
    }
    return dates;
  }

  function isScheduleActive() {
    try { return factoryProductionScope === "schedule"; } catch { return false; }
  }

  function refillDateSelect() {
    if (!isScheduleActive()) return false;
    const select = document.querySelector("[data-v280-date]");
    if (!select) return false;

    const previous = select.value || "";
    const dates = planningDates();
    const fragment = document.createDocumentFragment();

    const all = document.createElement("option");
    all.value = "";
    all.textContent = "Todas as datas";
    fragment.appendChild(all);

    dates.forEach((date) => {
      const option = document.createElement("option");
      option.value = date;
      option.textContent = format(date);
      fragment.appendChild(option);
    });

    select.replaceChildren(fragment);
    if (previous && dates.includes(previous)) select.value = previous;

    select.dataset.factoryPlanningDatesV281 = "true";
    return true;
  }

  function install() {
    const refresh = () => {
      if (!isScheduleActive()) return;
      refillDateSelect();
    };

    document.addEventListener("click", (event) => {
      if (event.target.closest?.('[data-production-scope="schedule"]')) {
        setTimeout(refresh, 0);
        setTimeout(refresh, 80);
        setTimeout(refresh, 250);
      }
    }, false);

    const observer = new MutationObserver(() => {
      if (!isScheduleActive()) return;
      const select = document.querySelector("[data-v280-date]");
      if (select && select.dataset.factoryPlanningDatesV281 !== "true") refillDateSelect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(refresh, 0);
    setTimeout(refresh, 300);

    globalThis[FLAG] = Object.freeze({ version: VERSION, planningDates, installedAt: new Date().toISOString() });
  }

  install();
})();