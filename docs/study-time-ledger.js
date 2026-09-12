/* Read-only time accounting. Legacy minute fields remain unchanged. */
(() => {
  "use strict";
  const number = value => Math.max(0, Number(value) || 0);
  const date = record => String(record?.date || record?.data || "").slice(0, 10);
  const key = record => String(record.timerSessionId || record.sessionId || record.id || JSON.stringify(record));
  function unique(records = []) {
    const seen = new Set();
    return records.filter(record => {
      const id = key(record);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  function recordSeconds(record = {}) {
    for (const field of ["seconds", "elapsedSeconds", "actualDurationSeconds"]) {
      const value = record[field];
      if (value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0) return Math.round(Number(value));
    }
    return Math.round(number(record.minutes ?? record.actualDuration) * 60);
  }
  function legacyGoalMinutes(goal = {}, kind) {
    const has = field => goal[field] !== undefined && goal[field] !== null && goal[field] !== "";
    const questions = number(goal.questionActualMinutes);
    const total = has("studyActualMinutes") || has("questionActualMinutes")
      ? number(goal.studyActualMinutes) + questions : number(goal.actualMinutes ?? goal.tempo_real_minutos);
    return kind === "questions" ? questions : kind === "study" ? Math.max(0, total - questions) : total;
  }
  function credited(goal, studies, kind) {
    return studies.filter(s => String(s.goalId || s.dailyGoalId || "") === String(goal.id)
      && s.origin === "timer" && s.updatesGoal !== false
      && (!kind || (s.timerKind === "questions" ? "questions" : "study") === kind));
  }
  function residualMinutes(goal, studies, kind) {
    return Math.max(0, legacyGoalMinutes(goal, kind) - credited(goal, studies, kind).reduce((total, s) => total + number(s.minutes), 0));
  }
  function goalSeconds(goal, state = {}, kind) {
    const studies = unique(state.studies || []);
    return Math.round(residualMinutes(goal, studies, kind) * 60)
      + credited(goal, studies, kind).reduce((total, s) => total + recordSeconds(s), 0);
  }
  function logs(state = {}) {
    const studies = unique(state.studies || []);
    return [
      ...studies.map(s => ({...s, seconds: recordSeconds(s)})),
      ...unique(state.dailyGoals || []).map(g => ({id: `goal-${g.id}`, date: date(g), discipline: g.discipline || g.disciplina,
        topic: g.subject || g.assunto, syllabusItemId: g.syllabusItemId, type: g.type || g.tipo || "Meta", seconds: Math.round(residualMinutes(g, studies) * 60)})),
      ...unique(state.questionLogs || []).map(q => ({...q, id: `questions-${q.id || key(q)}`, date: date(q), type: q.trainingType || "Questões", seconds: recordSeconds(q)}))
    ].filter(log => log.seconds > 0);
  }
  function secondsBetween(state, start, end = start) {
    return logs(state).reduce((total, log) => date(log) >= start && date(log) <= end ? total + log.seconds : total, 0);
  }
  function formatSeconds(value) {
    const seconds = Math.round(number(value));
    return `${Math.floor(seconds / 3600)}h ${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}min ${String(seconds % 60).padStart(2, "0")}s`;
  }
  const api = Object.freeze({recordSeconds, legacyGoalMinutes, goalSeconds, logs, secondsBetween, formatSeconds,
    formatMinutes: minutes => formatSeconds(number(minutes) * 60),
    sessionCount: (state, day) => unique(state.studies || []).filter(s => date(s) === day).length});
  globalThis.__ALDUS_STUDY_TIME__ = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
