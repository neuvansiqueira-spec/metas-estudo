/* O tempo do cronômetro é do dia em que foi estudado — v454. */
(() => {
  "use strict";

  const VERSION = "20260906-timer-study-real-date-v454";
  const FLAG = "__ALDUS_TIMER_STUDY_REAL_DATE_V454__";

  if (globalThis[FLAG]) {
    try { globalThis[FLAG].install?.(); } catch {}
    return;
  }

  let instalado = false;

  const chamar = (nome, ...args) => {
    try { const fn = globalThis[nome]; if (typeof fn === "function") return fn(...args); } catch {}
    return undefined;
  };

  function diaLocal(instante) {
    const d = instante ? new Date(instante) : new Date();
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const hoje = () => {
    const h = chamar("todayISO");
    return typeof h === "string" && h ? h : diaLocal();
  };

  function rascunho() {
    try { return typeof pendingTimerStudyDraft === "object" ? pendingTimerStudyDraft : null; } catch {}
    return null;
  }

  // submitTimerStudyModal grava a sessão assim (script.js:1822):
  //
  //   date: draft.goalDate || goal.date || goal.data || todayISO()
  //
  // A data da SESSÃO vira a data da META. Enquanto a meta é a de hoje, dá no
  // mesmo. Mas quando ele volta para o dia de uma meta em aberto e estuda uma
  // hora, essa hora nasce datada do dia da meta: some do "tempo realizado hoje"
  // e aparece como estudo num dia em que ele não estudou. A curva de evolução
  // dele passa a medir o plano, não a vida.
  //
  // `goalDate` existe justamente como precedência e nunca é preenchido pelo
  // rascunho. Preenchê-lo com o dia real, antes do handler original rodar,
  // corrige a data sem tocar em mais nada: a meta continua acumulando igual.
  function carimbarDiaReal(draft = rascunho()) {
    if (!draft || typeof draft !== "object") return null;
    // Sem hora de termino, a referencia e o hoje do app (todayISO), nao o
    // relogio do sistema: quem manda no calendario do site e o app. Usar o
    // relogio aqui tambem tornava o teste dependente do dia em que foi escrito.
    const dia = draft.endedAt ? (diaLocal(draft.endedAt) || hoje()) : hoje();
    if (!dia) return null;
    draft.goalDate = dia;
    return dia;
  }

  function aoEnviar(evento) {
    try {
      const alvo = evento?.target;
      if (!alvo || alvo.id !== "timerStudyForm") return;
      carimbarDiaReal();
    } catch {}
  }

  function install() {
    if (instalado) return true;
    if (typeof document === "undefined") return false;
    // Captura: precisa rodar antes do listener do formulário, que é de bolha.
    document.addEventListener("submit", aoEnviar, true);
    instalado = true;
    return true;
  }

  const api = Object.freeze({ version: VERSION, install, carimbarDiaReal, diaLocal });
  globalThis[FLAG] = api;

  install();
})();
