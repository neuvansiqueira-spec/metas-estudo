(() => {
  "use strict";

  const PATCH_VERSION = "20260722-cronometro-seguranca-v132";
  if (globalThis.__aldusTimerSafetyV132) return;
  globalThis.__aldusTimerSafetyV132 = true;

  if (typeof timerPlannedSeconds !== "function" || typeof timerAlertMessage !== "function") {
    console.warn("[Cronômetro] Correção de segurança v132 não aplicada: motor do cronômetro indisponível.");
    globalThis.__aldusTimerSafetyV132Status = { version: PATCH_VERSION, applied: false };
    return;
  }

  const originalTimerPlannedSeconds = timerPlannedSeconds;
  timerPlannedSeconds = function timerPlannedSecondsV132(goal = typeof floatingTimerGoal === "function" ? floatingTimerGoal() : null) {
    if (typeof floatingTimer !== "undefined" && floatingTimer?.mode === "free") {
      const targetMinutes = Math.max(
        0,
        Number(floatingTimer.sessionGoalMinutes) || Number(goal?.minutes) || 0
      );
      return Math.round(targetMinutes * 60);
    }
    return originalTimerPlannedSeconds(goal);
  };

  const originalTimerAlertMessage = timerAlertMessage;
  timerAlertMessage = function timerAlertMessageV132(goal = typeof floatingTimerGoal === "function" ? floatingTimerGoal() : null) {
    const message = originalTimerAlertMessage(goal);
    return message === "🚨 Faltam 1 minuto" ? "🚨 Falta 1 minuto" : message;
  };

  globalThis.__aldusTimerSafetyV132Status = { version: PATCH_VERSION, applied: true };
})();
