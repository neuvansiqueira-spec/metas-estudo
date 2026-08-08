(() => {
  "use strict";

  const VERSION = "20260808-timer-controls-sound-v268";
  const HOTFIX = "timer-controls-hardening-hotfix1";
  const GLOBAL_KEY = "__ALDUS_TIMER_CONTROLS_HARDENING_V268__";
  const DIALOG_ID = "aldusTimerCloseSafetyV268";
  const STYLE_ID = "aldusTimerCloseSafetyStylesV268";

  if (globalThis[GLOBAL_KEY]) {
    try { globalThis[GLOBAL_KEY].install?.(); } catch {}
    return;
  }

  let captureInstalled = false;
  let installAttempts = 0;

  function timerState() {
    try {
      return typeof floatingTimer === "object" && floatingTimer ? floatingTimer : null;
    } catch {
      return null;
    }
  }

  function elapsedSeconds() {
    try {
      if (typeof currentTimerSeconds === "function") return Math.max(0, Number(currentTimerSeconds()) || 0);
    } catch {}
    const timer = timerState();
    if (!timer?.goalId) return 0;
    const running = timer.startedAt && !timer.paused ? Math.floor((Date.now() - timer.startedAt) / 1000) : 0;
    return Math.max(0, Number(timer.elapsedSeconds) || 0) + Math.max(0, running);
  }

  function displayTime(seconds = elapsedSeconds()) {
    try {
      if (typeof formatTimerSeconds === "function") return formatTimerSeconds(seconds);
    } catch {}
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return [hours, minutes, secs].map((value) => String(value).padStart(2, "0")).join(":");
  }

  function persistTimer() {
    try {
      if (typeof scheduleFloatingTimerSessionPersistenceAfterPaint === "function") {
        scheduleFloatingTimerSessionPersistenceAfterPaint();
        return true;
      }
    } catch {}
    try {
      if (typeof persistFloatingTimerSession === "function") {
        persistFloatingTimerSession();
        return true;
      }
    } catch {}
    return false;
  }

  function stopAlarm() {
    try { globalThis.__ALDUS_TIMER_SOUND_MASTER_V265__?.stopAllSounds?.(); } catch {}
    try { globalThis.__ALDUS_TIMER_AUDIO_RECOVERY_V236__?.stopActiveSound?.(); } catch {}
    try { if (typeof silenceTimerAlert === "function") silenceTimerAlert(); } catch {}
  }

  function reinforceSoundMaster() {
    try {
      const master = globalThis.__ALDUS_TIMER_SOUND_MASTER_V265__;
      if (!master?.install) return false;
      master.install();
      if (!master.masterSoundEnabled?.()) master.stopAllSounds?.();
      return true;
    } catch (error) {
      console.warn("[Aldus V268] Não foi possível reforçar o controle geral de som.", error);
      return false;
    }
  }

  function restartInterval() {
    const timer = timerState();
    if (!timer) return false;
    try { if (typeof stopFloatingTimerInterval === "function") stopFloatingTimerInterval(); } catch {}
    try {
      timer.intervalId = window.setInterval(() => {
        try { if (typeof renderFloatingTimer === "function") renderFloatingTimer(); } catch {}
      }, 1000);
      return true;
    } catch {
      return false;
    }
  }

  function continuePastCompletion() {
    const timer = timerState();
    if (!timer?.goalId || !timer.completed) return false;

    const elapsed = elapsedSeconds();
    stopAlarm();

    timer.elapsedSeconds = elapsed;
    timer.startedAt = Date.now();
    timer.paused = false;
    timer.completed = false;
    timer.completionDismissed = true;
    timer.completionAlarmPlayed = true;
    timer.previousRemainingSeconds = 0;

    if (timer.mode === "countdown") {
      timer.mode = "free";
      timer.sessionGoalMinutes = Math.max(
        1,
        Number(timer.plannedMinutes) || 0,
        Math.ceil(elapsed / 60)
      );
    }

    restartInterval();
    try { if (typeof renderFloatingTimer === "function") renderFloatingTimer(); } catch {}
    try { if (typeof playTimerControlBeep === "function") void playTimerControlBeep("resume"); } catch {}
    persistTimer();
    try {
      if (typeof showDailyGoalMessage === "function") {
        showDailyGoalMessage("Tempo planejado concluído. O cronômetro continuará contando o tempo adicional até você salvar.", "success");
      }
    } catch {}
    return true;
  }

  function dismissCompletionNotice() {
    const timer = timerState();
    if (!timer?.goalId || !timer.completed) return false;
    timer.completionDismissed = true;
    stopAlarm();
    try { if (typeof renderFloatingTimer === "function") renderFloatingTimer(); } catch {}
    persistTimer();
    try {
      if (typeof showDailyGoalMessage === "function") {
        showDailyGoalMessage("Aviso fechado. A sessão continua preservada e pausada até você salvar ou continuar.", "success");
      }
    } catch {}
    return true;
  }

  function resetWithConfirmation() {
    const timer = timerState();
    if (!timer?.goalId) return false;
    const elapsed = elapsedSeconds();
    if (elapsed > 0) {
      const confirmed = window.confirm(
        `Zerar o cronômetro?\n\nHá ${displayTime(elapsed)} de tempo nesta sessão que ainda não foi salvo. Ao confirmar, esse tempo será descartado.`
      );
      if (!confirmed) return false;
    }
    stopAlarm();
    try {
      if (typeof resetFloatingTimer === "function") {
        resetFloatingTimer();
        return true;
      }
    } catch {}
    return false;
  }

  function ensureDialogStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${DIALOG_ID} {
        position: fixed;
        inset: 0;
        z-index: 120000;
        display: grid;
        place-items: center;
        padding: 20px;
      }
      #${DIALOG_ID}[hidden] { display: none !important; }
      #${DIALOG_ID} .aldus-timer-close-backdrop-v268 {
        position: absolute;
        inset: 0;
        background: rgba(1, 12, 24, .74);
        backdrop-filter: blur(5px);
      }
      #${DIALOG_ID} .aldus-timer-close-card-v268 {
        position: relative;
        width: min(520px, 100%);
        display: grid;
        gap: 14px;
        padding: 22px;
        border: 1px solid rgba(148, 196, 230, .38);
        border-radius: 18px;
        background: #07243a;
        color: #f7fbff;
        box-shadow: 0 22px 70px rgba(0, 0, 0, .48);
      }
      #${DIALOG_ID} .aldus-timer-close-card-v268 h2 {
        margin: 0;
        font-size: 1.18rem;
      }
      #${DIALOG_ID} .aldus-timer-close-card-v268 p {
        margin: 0;
        color: #d4e8f7;
        line-height: 1.5;
      }
      #${DIALOG_ID} .aldus-timer-close-actions-v268 {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      #${DIALOG_ID} button { min-height: 42px; }
      #${DIALOG_ID} [data-timer-close-discard-v268] {
        border-color: rgba(248, 113, 113, .58);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureCloseDialog() {
    let dialog = document.getElementById(DIALOG_ID);
    if (dialog) return dialog;
    ensureDialogStyles();
    dialog = document.createElement("section");
    dialog.id = DIALOG_ID;
    dialog.hidden = true;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", `${DIALOG_ID}Title`);
    dialog.innerHTML = `
      <div class="aldus-timer-close-backdrop-v268" data-timer-close-cancel-v268></div>
      <div class="aldus-timer-close-card-v268">
        <h2 id="${DIALOG_ID}Title">Há tempo não salvo</h2>
        <p data-timer-close-message-v268></p>
        <div class="aldus-timer-close-actions-v268">
          <button type="button" data-timer-close-save-v268>Salvar tempo</button>
          <button type="button" class="secondary-button" data-timer-close-cancel-v268>Cancelar</button>
          <button type="button" class="secondary-button danger" data-timer-close-discard-v268>Descartar sessão</button>
        </div>
      </div>
    `;
    dialog.addEventListener("click", (event) => {
      if (event.target.closest("[data-timer-close-save-v268]")) {
        dialog.hidden = true;
        try { if (typeof saveFloatingTimerTime === "function") saveFloatingTimerTime(); } catch {}
        return;
      }
      if (event.target.closest("[data-timer-close-discard-v268]")) {
        dialog.hidden = true;
        stopAlarm();
        try { if (typeof closeFloatingTimer === "function") closeFloatingTimer(); } catch {}
        return;
      }
      if (event.target.closest("[data-timer-close-cancel-v268]")) {
        dialog.hidden = true;
      }
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function requestCloseWithSafety() {
    const timer = timerState();
    if (!timer?.goalId) return false;
    const elapsed = elapsedSeconds();
    if (elapsed <= 0) {
      stopAlarm();
      try {
        if (typeof closeFloatingTimer === "function") {
          closeFloatingTimer();
          return true;
        }
      } catch {}
      return false;
    }

    const dialog = ensureCloseDialog();
    const message = dialog.querySelector("[data-timer-close-message-v268]");
    if (message) {
      message.textContent = `Esta sessão possui ${displayTime(elapsed)} ainda não salvo. Salve o tempo antes de fechar ou descarte a sessão conscientemente.`;
    }
    dialog.hidden = false;
    dialog.querySelector("[data-timer-close-save-v268]")?.focus?.();
    return true;
  }

  function interceptTimerAction(event) {
    const button = event.target?.closest?.("button[data-timer-action]");
    if (!button) return;
    const timer = timerState();
    if (!timer?.goalId) return;
    const action = button.dataset.timerAction;

    if (action === "continue" && timer.completed) {
      event.preventDefault();
      event.stopImmediatePropagation();
      continuePastCompletion();
      return;
    }

    if (action === "pause" && timer.completed && timer.paused) {
      event.preventDefault();
      event.stopImmediatePropagation();
      continuePastCompletion();
      return;
    }

    if (action === "reset") {
      event.preventDefault();
      event.stopImmediatePropagation();
      resetWithConfirmation();
      return;
    }

    if (action === "close") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (button.closest("#timerCompletion") && timer.completed) {
        dismissCompletionNotice();
      } else {
        requestCloseWithSafety();
      }
    }
  }

  function installCapture() {
    if (captureInstalled || typeof document === "undefined") return captureInstalled;
    document.addEventListener("click", interceptTimerAction, true);
    captureInstalled = true;
    return true;
  }

  function install() {
    installAttempts += 1;
    const capture = installCapture();
    const master = reinforceSoundMaster();
    if (document?.documentElement) {
      document.documentElement.dataset.aldusTimerControlsHardeningV268 = HOTFIX;
    }
    return capture && master;
  }

  const api = Object.freeze({
    version: VERSION,
    hotfix: HOTFIX,
    install,
    continuePastCompletion,
    dismissCompletionNotice,
    resetWithConfirmation,
    requestCloseWithSafety,
    elapsedSeconds
  });
  globalThis[GLOBAL_KEY] = api;

  if (typeof document === "undefined") return;
  install();
  const retryTimer = window.setInterval(() => {
    if (install() || installAttempts >= 200) window.clearInterval(retryTimer);
  }, 100);
  window.setTimeout(() => {
    window.clearInterval(retryTimer);
    install();
  }, 20000);
})();
