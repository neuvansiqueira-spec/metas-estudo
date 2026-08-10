(() => {
  "use strict";

  const VERSION = "20260810-timer-runtime-fix-v295";
  const FIELD_ID = "planningShiftDisciplinesPerDay";
  const FORM_ID = "planningConfigForm";
  const SNAPSHOT_KEY = "aldusPlanningShiftDisciplinesV283";
  const UPDATED_AT_KEY = "shiftDisciplinesUpdatedAtV283";
  const MIN_DISCIPLINES = 1;
  const MAX_DISCIPLINES = 12;
  const TIMER_SOUND_MASTER_SCRIPT = "timer-sound-master-v265.js?v=20260810-timer-runtime-fix-v295&hotfix=master-mute-hotfix1";
  const TIMER_CONTROLS_SCRIPT = "timer-controls-hardening-v268.js?v=20260810-timer-runtime-fix-v295&hotfix=timer-controls-hardening-hotfix2";
  let installed = false;

  function ensureRuntimeScript(id, source) {
    if (document.getElementById(id)) return true;
    const script = document.createElement("script");
    script.id = id;
    script.src = new URL(source, document.baseURI).toString();
    script.async = false;
    script.addEventListener("error", () => console.error(`[${VERSION}] Falha ao carregar ${source}.`), { once: true });
    (document.head || document.body || document.documentElement).appendChild(script);
    return true;
  }

  function ensureTimerRuntime() {
    if (typeof document === "undefined") return false;
    ensureRuntimeScript("aldusTimerSoundMasterV265BridgeV295", TIMER_SOUND_MASTER_SCRIPT);
    ensureRuntimeScript("aldusTimerControlsHardeningV268BridgeV295", TIMER_CONTROLS_SCRIPT);
    document.documentElement.dataset.aldusTimerRuntimeBridgeV295 = "true";
    return true;
  }

  function validCount(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < MIN_DISCIPLINES || parsed > MAX_DISCIPLINES) return null;
    return parsed;
  }

  function timestamp(value) {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function planningConfigState() {
    if (typeof state === "undefined" || !state || typeof state !== "object") return null;
    state.planning ||= {};
    state.planning.config ||= {};
    return state.planning.config;
  }

  function readSnapshot() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
      const count = validCount(parsed?.count);
      if (!count) return null;
      return { count, savedAt: parsed.savedAt || "" };
    } catch {
      return null;
    }
  }

  function writeSnapshot(count, savedAt) {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ version: VERSION, count, savedAt }));
    } catch {}
  }

  function refreshVisibleValue(count) {
    const field = document.getElementById(FIELD_ID);
    if (field && document.activeElement !== field) field.value = String(count);

    const summary = document.querySelector('[data-planning-shift-summary-v200] .planning-summary-value');
    if (summary) summary.textContent = String(count);

    const resume = document.getElementById("planningSummaryResume");
    if (resume) {
      const base = String(resume.textContent || "")
        .replace(/\s*•\s*Plantão:\s*\d+\s*disciplina\(s\)\.?/i, "")
        .trim();
      resume.textContent = `${base} • Plantão: ${count} disciplina(s).`;
    }
  }

  function persistState(reason) {
    if (typeof saveData !== "function") return false;
    try {
      const result = saveData({ markLocalChange: true });
      const sync = () => {
        try {
          if (typeof autoSyncAfterSave === "function") autoSyncAfterSave(reason);
        } catch (error) {
          console.warn(`[${VERSION}] A sincronização automática do limite de plantão falhou.`, error);
        }
      };
      if (result && typeof result.then === "function") result.then(sync).catch((error) => {
        console.error(`[${VERSION}] O salvamento do limite de plantão falhou.`, error);
      });
      else if (result !== false) sync();
      return result !== false;
    } catch (error) {
      console.error(`[${VERSION}] O salvamento do limite de plantão falhou.`, error);
      return false;
    }
  }

  function commit(value, reason = "planejamento-plantao-v283", options = {}) {
    const count = validCount(value);
    const config = planningConfigState();
    if (!count || !config) return false;

    const savedAt = options.savedAt || new Date().toISOString();
    config.shiftDisciplinesPerDay = count;
    config[UPDATED_AT_KEY] = savedAt;
    writeSnapshot(count, savedAt);
    refreshVisibleValue(count);

    if (options.persist !== false) persistState(reason);
    return true;
  }

  function restoreLatest() {
    const config = planningConfigState();
    if (!config) return false;

    const stateCount = validCount(config.shiftDisciplinesPerDay);
    const stateSavedAt = String(config[UPDATED_AT_KEY] || "");
    const snapshot = readSnapshot();

    if (snapshot && (!stateCount || timestamp(snapshot.savedAt) > timestamp(stateSavedAt))) {
      return commit(snapshot.count, "planejamento-plantao-restaurado-v283", {
        savedAt: snapshot.savedAt || new Date().toISOString(),
        persist: true
      });
    }

    if (stateCount) {
      if (!snapshot || snapshot.count !== stateCount || timestamp(stateSavedAt) > timestamp(snapshot.savedAt)) {
        writeSnapshot(stateCount, stateSavedAt || new Date().toISOString());
      }
      refreshVisibleValue(stateCount);
      return true;
    }
    return false;
  }

  function bindField(field, form) {
    if (field.dataset.shiftPersistenceV283 === "true") return;
    field.dataset.shiftPersistenceV283 = "true";

    const validate = () => {
      const count = validCount(field.value);
      field.setCustomValidity(count ? "" : `Informe um número inteiro entre ${MIN_DISCIPLINES} e ${MAX_DISCIPLINES}.`);
      return count;
    };

    field.addEventListener("input", () => {
      const count = validate();
      const config = planningConfigState();
      if (count && config) config.shiftDisciplinesPerDay = count;
    });

    field.addEventListener("change", () => {
      const count = validate();
      if (count) commit(count, "planejamento-plantao-alterado-v283");
    });

    if (form.dataset.shiftPersistenceV283 !== "true") {
      form.dataset.shiftPersistenceV283 = "true";
      form.addEventListener("submit", () => {
        const count = validate();
        if (!count) return;

        commit(count, "planejamento-plantao-submit-pre-v283", { persist: false });
        window.setTimeout(() => {
          commit(count, "planejamento-plantao-submit-post-v283");
          try {
            globalThis.AldusPlanningShiftDisciplinesV200?.initialize?.();
          } catch {}
        }, 0);
      }, true);
    }
  }

  function install() {
    ensureTimerRuntime();
    if (installed) return true;
    if (typeof document === "undefined" || typeof state === "undefined") return false;

    const form = document.getElementById(FORM_ID);
    const field = document.getElementById(FIELD_ID);
    if (!form || !field) return false;

    restoreLatest();
    bindField(field, form);
    document.documentElement.dataset.aldusPlanningShiftPersistence = VERSION;
    globalThis.__ALDUS_PLANNING_SHIFT_PERSISTENCE_V283__ = Object.freeze({
      version: VERSION,
      fieldId: FIELD_ID,
      snapshotKey: SNAPSHOT_KEY,
      timerRuntimeBridge: true,
      commit,
      restoreLatest,
      ensureTimerRuntime
    });
    installed = true;
    return true;
  }

  ensureTimerRuntime();

  const timer = window.setInterval(() => {
    if (install()) window.clearInterval(timer);
  }, 100);

  window.setTimeout(() => {
    window.clearInterval(timer);
    install();
  }, 20000);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
