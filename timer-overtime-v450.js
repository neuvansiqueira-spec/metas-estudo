/* O cronometro nao para quando o tempo previsto acaba — v450.
   28/09/2026 (escolha dele, opcao "a"): segue contando sem teto ate ele pausar,
   so avisando que passou do previsto. E o tempo entre o congelamento da
   conclusao e a retomada deixa de ser perdido. */
(() => {
  "use strict";

  const VERSION = "20260928-timer-overtime-sem-teto-v450";
  const FLAG = "__ALDUS_TIMER_OVERTIME_V450__";
  const BANNER_ID = "aldusTimerOvertimeBannerV450";
  const VIGIA_MS = 500;

  // Sem teto: ate 28/09/2026 havia um limite de 30 min (escolha minha, nao
  // dele). Ele escolheu que o cronometro siga contando ate ele pausar.

  if (globalThis[FLAG]) {
    try { globalThis[FLAG].install?.(); } catch {}
    return;
  }

  let vigiaId = null;
  // Ultimo instante em que a sessao estava correndo. O site congela a conclusao
  // em "elapsedSeconds = previsto" e apaga startedAt; sem esta ancora, os
  // segundos entre o fim do previsto e a retomada (ou a aba dormindo em segundo
  // plano) se perdiam.
  let ancora = null;

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

  function tempoReal(timer) {
    if (!ancora || ancora.goalId !== timer.goalId || ancora.sessionId !== timer.sessionId) return 0;
    return Math.max(0, ancora.elapsedSeconds + Math.floor((Date.now() - ancora.startedAt) / 1000));
  }

  function registrarAncora(timer) {
    if (timer?.goalId && timer.startedAt && !timer.paused) {
      ancora = { goalId: timer.goalId, sessionId: timer.sessionId, startedAt: Number(timer.startedAt) || 0, elapsedSeconds: Math.max(0, Number(timer.elapsedSeconds) || 0) };
    } else if (!timer?.completed) {
      ancora = null;
    }
  }

  function iniciarTempoExtra(timer) {
    const previstoSegundos = previstos();
    if (!previstoSegundos) return false;
    // Devolve à sessão o tempo que o congelamento cortou.
    const real = tempoReal(timer);
    if (real > (Number(timer.elapsedSeconds) || 0)) timer.elapsedSeconds = real;
    ancora = null;

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
      previstoSegundos
    };
    persistir();
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
    elemento.textContent = `Tempo previsto concluído às ${hora(marca.desde)} — continuo contando até você pausar: +${minutos(extra)} min (total ${minutos(total)} min).`;
  }

  function passada() {
    const timer = cronometro();
    if (!timer?.goalId) { ancora = null; desenharBanner(); return; }

    const marca = timer.overtimeV450;
    if (!marca) {
      registrarAncora(timer);
      // A conclusao congela o cronometro em tres atribuicoes: elapsedSeconds
      // vira o previsto, startedAt vira null, paused vira true. E esse congelamento
      // — e so ele — que este modulo desfaz, uma unica vez por sessao.
      if (timer.completed && timer.paused && !timer.completionDismissed) iniciarTempoExtra(timer);
      desenharBanner();
      return;
    }

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
    install,
    passada,
    iniciarTempoExtra,
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
