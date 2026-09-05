/* O cronometro nao para quando o tempo previsto acaba — v450. */
(() => {
  "use strict";

  const VERSION = "20260905-timer-overtime-v450";
  const FLAG = "__ALDUS_TIMER_OVERTIME_V450__";
  const BANNER_ID = "aldusTimerOvertimeBannerV450";
  const VIGIA_MS = 500;

  // Teto do tempo extra. Passado dele, o cronometro para de verdade e diz onde
  // parou. Sem teto, um alarme que ele nao ouviu de manha viraria seis horas de
  // estudo que nao existiram. Com teto, o pior caso e meia hora a mais — e ela
  // aparece escrita na tela antes de qualquer coisa ser salva.
  const EXTRA_MAXIMO_SEGUNDOS = 30 * 60;

  if (globalThis[FLAG]) {
    try { globalThis[FLAG].install?.(); } catch {}
    return;
  }

  let vigiaId = null;

  function cronometro() {
    try { return typeof floatingTimer === "object" && floatingTimer ? floatingTimer : null; } catch { return null; }
  }
  function chamar(nome, ...args) {
    try { const fn = globalThis[nome]; if (typeof fn === "function") return fn(...args); } catch {}
    return undefined;
  }
  function decorridos() {
    const timer = cronometro();
    if (!timer?.goalId) return 0;
    try { if (typeof currentTimerSeconds === "function") return Math.max(0, Number(currentTimerSeconds()) || 0); } catch {}
    const correndo = timer.startedAt && !timer.paused ? Math.floor((Date.now() - timer.startedAt) / 1000) : 0;
    return Math.max(0, Number(timer.elapsedSeconds) || 0) + Math.max(0, correndo);
  }
  function previstos() {
    const timer = cronometro();
    if (!timer?.goalId) return 0;
    const marca = Number(timer.overtimeV450?.previstoSegundos) || 0;
    if (marca > 0) return marca;
    try { if (typeof timerPlannedSeconds === "function") return Math.max(0, Number(timerPlannedSeconds()) || 0); } catch {}
    return Math.max(0, Math.round((Number(timer.plannedMinutes) || 0) * 60));
  }
  function minutos(segundos) { return Math.max(0, Math.round(Math.max(0, Number(segundos) || 0) / 60)); }
  function hora(instante) {
    try { return new Date(instante).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
  }
  function persistir() {
    try { if (typeof persistFloatingTimerSession === "function") return persistFloatingTimerSession({ storageOnly: true }); } catch {}
    try { if (typeof scheduleFloatingTimerSessionPersistenceAfterPaint === "function") scheduleFloatingTimerSessionPersistenceAfterPaint(); } catch {}
    return undefined;
  }

  // Retomada propria, para quando a V268 nao estiver disponivel ou recusar.
  // Espelha o que ela faz: o modo vira livre para o mostrador voltar a andar —
  // em contagem regressiva ele fica parado em 00:00:00 e o tempo extra correria
  // invisivel.
  function retomarPorConta(timer, previstoSegundos) {
    const elapsed = decorridos();
    timer.elapsedSeconds = Math.max(previstoSegundos, elapsed);
    timer.startedAt = Date.now();
    timer.paused = false;
    timer.completed = false;
    timer.completionDismissed = true;
    timer.completionAlarmPlayed = true;
    timer.previousRemainingSeconds = 0;
    if (timer.mode === "countdown") {
      timer.mode = "free";
      timer.sessionGoalMinutes = Math.max(1, Number(timer.plannedMinutes) || 0, Math.ceil(elapsed / 60));
    }
    try { if (timer.intervalId) clearInterval(timer.intervalId); } catch {}
    try {
      timer.intervalId = window.setInterval(() => {
        try { if (typeof renderFloatingTimer === "function") renderFloatingTimer(); } catch {}
      }, 1000);
    } catch {}
    chamar("renderFloatingTimer");
    persistir();
    return true;
  }

  function iniciarTempoExtra(timer) {
    const previstoSegundos = previstos();
    if (!previstoSegundos) return false;

    // A V268 ja sabe retomar depois da conclusao — inclusive trocando o modo e
    // avisando na tela. Aqui ela e chamada sozinha, sem esperar o clique que o
    // usuario nao deu porque nao ouviu o alarme.
    let retomou = false;
    try { retomou = globalThis.__ALDUS_TIMER_CONTROLS_HARDENING_V268__?.continuePastCompletion?.() === true; } catch {}
    if (!retomou) retomou = retomarPorConta(timer, previstoSegundos);
    if (!retomou) return false;

    timer.overtimeV450 = {
      versao: VERSION,
      desde: Date.now(),
      previstoSegundos,
      limiteSegundos: previstoSegundos + EXTRA_MAXIMO_SEGUNDOS,
      capadoEm: null
    };
    persistir();
    return true;
  }

  function encerrarNoTeto(timer) {
    const marca = timer.overtimeV450;
    if (!marca || marca.capadoEm) return false;
    timer.elapsedSeconds = marca.limiteSegundos;
    timer.startedAt = null;
    timer.paused = true;
    try { if (timer.intervalId) clearInterval(timer.intervalId); } catch {}
    timer.intervalId = null;
    marca.capadoEm = Date.now();
    chamar("renderFloatingTimer");
    persistir();
    try {
      if (typeof showDailyGoalMessage === "function") {
        showDailyGoalMessage(`O cronometro parou em ${minutos(EXTRA_MAXIMO_SEGUNDOS)} min alem do previsto. Se voce estudou mais, lance o restante a mao.`, "warning");
      }
    } catch {}
    return true;
  }

  function banner() {
    if (typeof document === "undefined") return null;
    let elemento = document.getElementById(BANNER_ID);
    if (elemento) return elemento;
    const alvo = document.getElementById("timerAlert") || document.getElementById("timerCompletion");
    if (!alvo?.parentNode) return null;
    elemento = document.createElement("p");
    elemento.id = BANNER_ID;
    elemento.className = "item-meta";
    elemento.hidden = true;
    alvo.parentNode.insertBefore(elemento, alvo.nextSibling);
    return elemento;
  }

  function desenharBanner() {
    const elemento = banner();
    if (!elemento) return;
    const timer = cronometro();
    const marca = timer?.goalId ? timer.overtimeV450 : null;
    if (!marca) { elemento.hidden = true; elemento.textContent = ""; return; }

    const total = decorridos();
    const extra = Math.max(0, total - marca.previstoSegundos);
    elemento.hidden = false;
    elemento.textContent = marca.capadoEm
      ? `Tempo previsto concluido as ${hora(marca.desde)}. Parei de contar as ${hora(marca.capadoEm)}, em +${minutos(EXTRA_MAXIMO_SEGUNDOS)} min. Estudou mais? Lance a mao.`
      : `Tempo previsto concluido as ${hora(marca.desde)} — continuo contando: +${minutos(extra)} min (total ${minutos(total)} min).`;
  }

  function passada() {
    const timer = cronometro();
    if (!timer?.goalId) { desenharBanner(); return; }

    const marca = timer.overtimeV450;
    if (!marca) {
      // A conclusao congela o cronometro em tres atribuicoes: elapsedSeconds
      // vira o previsto, startedAt vira null, paused vira true. E esse congelamento
      // — e so ele — que este modulo desfaz, uma unica vez por sessao.
      if (timer.completed && timer.paused && !timer.completionDismissed) iniciarTempoExtra(timer);
      desenharBanner();
      return;
    }

    if (!marca.capadoEm && decorridos() >= marca.limiteSegundos) encerrarNoTeto(timer);
    desenharBanner();
  }

  function install() {
    if (typeof document === "undefined") return false;
    if (vigiaId) return true;
    try {
      vigiaId = window.setInterval(() => { try { passada(); } catch {} }, VIGIA_MS);
    } catch { return false; }
    try { passada(); } catch {}
    return true;
  }

  const api = Object.freeze({
    version: VERSION,
    extraMaximoSegundos: EXTRA_MAXIMO_SEGUNDOS,
    install,
    passada,
    iniciarTempoExtra,
    encerrarNoTeto,
    estado: () => {
      const timer = cronometro();
      return {
        ativo: Boolean(timer?.overtimeV450),
        marca: timer?.overtimeV450 || null,
        decorridos: decorridos(),
        previstos: previstos()
      };
    }
  });
  globalThis[FLAG] = api;

  install();
})();
