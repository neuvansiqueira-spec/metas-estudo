(() => {
  "use strict";

  const VERSION = "20260727-cronometro-motivacao-tempo-v161";
  const HISTORY_KEY = "metasEstudoTimerMotivationalHistoryV161";
  const ENABLE_KEY = "metasEstudoTimerMotivationEnabledV161";
  const FIRST_SECONDS = 30;
  const REPEAT_SECONDS = 300;
  const TOAST_MS = 30000;

  if (globalThis.__aldusTimerMotivationV161) return;
  globalThis.__aldusTimerMotivationV161 = true;
  globalThis.__aldusTimerMotivationV159 = true;

  const MESSAGES = [
    "Começar já foi uma vitória; agora mantenha o passo.",
    "Os primeiros minutos definem o tom da sessão.",
    "Seu foco já está em movimento.",
    "Uma sessão consistente começa com presença.",
    "Você abriu espaço para o que realmente importa.",
    "Deixe o ritmo crescer sem pressa e sem pausa.",
    "Este começo já conta a favor da sua aprovação.",
    "O esforço de agora será lembrado na hora da prova.",
    "Cada bloco bem estudado reduz a incerteza da prova.",
    "Continue presente: o resultado nasce dessa sequência.",
    "Seu planejamento está saindo do papel.",
    "A constância está fazendo o trabalho silencioso.",
    "Você entrou no ritmo certo; preserve-o.",
    "O foco sustentado está produzindo resultado.",
    "Mais conhecimento consolidado, menos insegurança.",
    "Continue no assunto atual; profundidade também pontua.",
    "Seu cérebro aprende melhor quando você permanece.",
    "Respire fundo e proteja o ritmo conquistado.",
    "Você está transformando esforço em domínio.",
    "A disciplina está vencendo a vontade de interromper.",
    "Continue com qualidade; não acelere o que precisa compreender.",
    "É nesta etapa que a constância se diferencia.",
    "Você construiu um ótimo bloco de estudo.",
    "Não abandone agora o ritmo que levou tempo para formar.",
    "Cada minuto ajuda a fixar o conteúdo.",
    "O encerramento bem feito fortalece a próxima revisão.",
    "Mantenha a atenção; a precisão também se treina.",
    "Seu compromisso de hoje está virando resultado concreto.",
    "A aprovação é construída em sessões como esta.",
    "Você não precisa vencer o edital inteiro agora; avance neste ponto.",
    "O próximo acerto começa no estudo que você faz hoje.",
    "A constância de hoje protege sua confiança na prova.",
    "Um assunto difícil fica menor quando você permanece nele.",
    "Seu ritmo está estável; continue.",
    "Mais um intervalo de foco concluído com qualidade.",
    "O tempo bem usado agora vira decisão segura na prova.",
    "Você está acumulando conhecimento, não apenas minutos.",
    "A disciplina transforma uma sessão comum em vantagem.",
    "Continue firme: o resultado cresce sem fazer barulho.",
    "Seu avanço é real, mesmo quando parece pequeno.",
    "Mantenha o foco no próximo trecho, não no cansaço.",
    "Você está cumprindo o que planejou para si.",
    "Cada minuto concentrado diminui uma dúvida futura.",
    "A repetição consciente fortalece a memória.",
    "O estudo de hoje amplia suas escolhas de amanhã.",
    "Seu progresso já é maior do que no início da sessão.",
    "Concentre-se no que está diante de você e siga.",
    "A rotina que ninguém vê sustenta o resultado que todos verão.",
    "Você está fazendo a parte que depende de você.",
    "Continue: consistência também é uma forma de talento."
  ];

  if (MESSAGES.length !== 50) {
    console.error(`[Cronômetro] Esperadas 50 mensagens; encontradas ${MESSAGES.length}.`);
    return;
  }

  const runtime = {
    sessionKey: "",
    firstShown: false,
    lastInterval: 0,
    lastPaused: false,
    lastShownAt: 0,
    fallbackStartedAt: 0,
    countdownInitial: 0
  };

  function shuffle(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const random = Math.floor(Math.random() * (index + 1));
      [result[index], result[random]] = [result[random], result[index]];
    }
    return result;
  }

  function nextMessage() {
    let history = {};
    try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}"); } catch (error) { history = {}; }
    let bag = Array.isArray(history.bag) ? history.bag.filter((item) => MESSAGES.includes(item)) : [];
    if (!bag.length) bag = shuffle(MESSAGES);
    const recent = Array.isArray(history.recent) ? history.recent : [];
    let index = bag.findIndex((item) => !recent.includes(item));
    if (index < 0) index = 0;
    const [message] = bag.splice(index, 1);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify({
        bag,
        recent: [message, ...recent.filter((item) => item !== message)].slice(0, 12)
      }));
    } catch (error) {
      console.warn("[Cronômetro] Não foi possível salvar o histórico motivacional.", error);
    }
    return message || MESSAGES[0];
  }

  function enableOnce() {
    try {
      if (localStorage.getItem(ENABLE_KEY)) return;
      const checkbox = document.querySelector('[data-timer-pref="motivationalMessages"]');
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
      localStorage.setItem(ENABLE_KEY, VERSION);
    } catch (error) {
      console.warn("[Cronômetro] Não foi possível ativar as mensagens automaticamente.", error);
    }
  }

  function enabled() {
    const checkbox = document.querySelector('[data-timer-pref="motivationalMessages"]');
    return !checkbox || checkbox.checked;
  }

  function ensureVisuals() {
    if (!document.getElementById("timerMotivationStyleV161")) {
      const style = document.createElement("style");
      style.id = "timerMotivationStyleV161";
      style.textContent = `
        #timerMotivationalToast.timer-motivational-toast{z-index:6000!important}
        .timer-motivation-inline-v161{display:grid;gap:4px;margin:2px 0 8px;padding:11px 13px;border:1px solid rgba(96,165,250,.62);border-radius:14px;background:linear-gradient(145deg,rgba(10,45,73,.98),rgba(6,30,51,.98));box-shadow:0 8px 22px rgba(0,8,22,.28);color:#fff}
        .timer-motivation-inline-v161[hidden]{display:none!important}
        .timer-motivation-inline-v161 strong{color:#9fd5ff;font-size:.74rem;letter-spacing:.08em;text-transform:uppercase}
        .timer-motivation-inline-v161 span{color:#fff;font-size:.94rem;font-weight:800;line-height:1.35}
      `;
      document.head.appendChild(style);
    }
    let toast = document.getElementById("timerMotivationalToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "timerMotivationalToast";
      toast.className = "timer-motivational-toast";
      toast.setAttribute("aria-live", "polite");
      toast.hidden = true;
      document.body.appendChild(toast);
    }
    let inline = document.getElementById("timerMotivationInlineV161");
    if (!inline) {
      const progress = document.getElementById("timerProgressText");
      if (progress) {
        inline = document.createElement("div");
        inline.id = "timerMotivationInlineV161";
        inline.className = "timer-motivation-inline-v161";
        inline.setAttribute("aria-live", "polite");
        inline.hidden = true;
        progress.insertAdjacentElement("afterend", inline);
      }
    }
    return { toast, inline };
  }

  function fill(element, label, message) {
    if (!element) return;
    element.replaceChildren();
    const strong = document.createElement("strong");
    const span = document.createElement("span");
    strong.textContent = label;
    span.textContent = message;
    element.append(strong, span);
    element.hidden = false;
    element.classList.add("visible");
  }

  function show(label) {
    if (!enabled()) return;
    const message = nextMessage();
    const { toast, inline } = ensureVisuals();
    fill(toast, label, message);
    fill(inline, label, message);
    clearTimeout(globalThis.__aldusTimerMotivationToastV161);
    globalThis.__aldusTimerMotivationToastV161 = setTimeout(() => {
      if (toast) {
        toast.classList.remove("visible");
        toast.hidden = true;
      }
    }, TOAST_MS);
  }

  function parseClock(value) {
    const parts = String(value || "").trim().split(":").map(Number);
    return parts.length === 3 && parts.every(Number.isFinite)
      ? Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2])
      : 0;
  }

  function coreTimer() {
    try { return typeof floatingTimer === "object" ? floatingTimer : null; } catch (error) { return null; }
  }

  function coreElapsed() {
    try {
      if (typeof currentTimerSeconds === "function") {
        const value = Number(currentTimerSeconds());
        if (Number.isFinite(value)) return Math.max(0, Math.floor(value));
      }
    } catch (error) {
      console.warn("[Cronômetro] Leitura principal do tempo indisponível.", error);
    }
    return null;
  }

  function reset(key = "") {
    runtime.sessionKey = key;
    runtime.firstShown = false;
    runtime.lastInterval = 0;
    runtime.lastPaused = false;
    runtime.lastShownAt = 0;
    runtime.fallbackStartedAt = Date.now();
    runtime.countdownInitial = parseClock(document.getElementById("timerTime")?.textContent);
  }

  function monitor() {
    const panel = document.getElementById("floatingTimer");
    if (!panel || panel.hidden) {
      if (runtime.sessionKey) reset();
      return;
    }

    const timer = coreTimer();
    const mode = timer?.mode || document.getElementById("timerMode")?.value || "countdown";
    const key = String(timer?.sessionId || `${timer?.goalId || document.getElementById("timerSubject")?.textContent}|${timer?.startedAt || mode}`);
    if (runtime.sessionKey !== key) reset(key);

    const pauseButton = document.getElementById("timerPauseResume");
    const paused = timer ? Boolean(timer.paused) : /continuar/i.test(pauseButton?.textContent || "");
    const completed = timer ? Boolean(timer.completed) : !document.getElementById("timerCompletion")?.hidden;
    const resumed = runtime.lastPaused && !paused;
    runtime.lastPaused = paused;
    if (paused || completed || !enabled()) return;

    let elapsed = coreElapsed();
    if (elapsed === null) {
      const shown = parseClock(document.getElementById("timerTime")?.textContent);
      elapsed = mode === "free"
        ? shown
        : Math.max(0, runtime.countdownInitial - shown, Math.floor((Date.now() - runtime.fallbackStartedAt) / 1000));
    }

    const now = Date.now();
    if (resumed && now - runtime.lastShownAt > 5000) {
      show("FOCO RETOMADO");
      runtime.lastShownAt = now;
      return;
    }
    if (!runtime.firstShown && elapsed >= FIRST_SECONDS) {
      show("BOM COMEÇO");
      runtime.firstShown = true;
      runtime.lastShownAt = now;
    }
    const interval = Math.floor(elapsed / REPEAT_SECONDS);
    if (interval > runtime.lastInterval) {
      runtime.lastInterval = interval;
      if (interval > 0 && now - runtime.lastShownAt >= 15000) {
        show(`${interval * 5} MINUTOS DE FOCO`);
        runtime.lastShownAt = now;
      }
    }
  }

  enableOnce();
  ensureVisuals();
  const intervalId = setInterval(monitor, 1000);
  window.addEventListener("pageshow", monitor);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) monitor(); });

  globalThis.__aldusTimerMotivationV161Status = Object.freeze({
    version: VERSION,
    applied: true,
    messages: MESSAGES.length,
    firstSeconds: FIRST_SECONDS,
    repeatSeconds: REPEAT_SECONDS,
    modes: ["countdown", "free"],
    intervalId
  });
})();
