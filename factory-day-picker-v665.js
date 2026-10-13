(() => {
  "use strict";

  // V665 — escolher o dia do "Plano do Dia" da Fábrica.
  // Pedido dele (13/10/2026): para adiantar os resumos de amanhã ele tinha de
  // abrir "Produção da Semana". Agora o "Plano do Dia" tem um campo de data:
  // começa em hoje e mostra os temas das metas do dia escolhido.
  // Só muda o que a Fábrica mostra; não grava nada e não mexe em meta.

  const VERSION = "20261013-fabrica-escolher-dia-v665";
  const FLAG = "__ALDUS_FACTORY_DAY_PICKER_V665__";
  const MARK = "__aldusFactoryDayPickerV665";
  const STORE = "aldus:fabrica:dia-escolhido:v665";
  const INPUT_ID = "factoryDayPickerV665";
  if (globalThis[FLAG]) return;

  let chosen = "";
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) || "null");
    if (saved?.date && /^\d{4}-\d{2}-\d{2}$/.test(saved.date)) chosen = saved.date;
  } catch {}

  const today = () => (typeof todayISO === "function" ? todayISO() : new Date().toISOString().slice(0, 10));
  function dayScope() {
    try { return factoryProductionScope === "day"; } catch { return true; }
  }
  // Data passada não fica presa: ao virar o dia, volta para hoje.
  function selectedDate() {
    const now = today();
    return chosen && chosen >= now ? chosen : now;
  }
  function choosing() { return dayScope() && selectedDate() !== today(); }

  function wrap(name, build) {
    const current = globalThis[name];
    if (typeof current !== "function" || current[MARK]) return Boolean(current);
    const wrapped = build(current);
    Object.defineProperty(wrapped, MARK, { value: VERSION });
    globalThis[name] = wrapped;
    return true;
  }

  function installWrappers() {
    wrap("factoryUnlockedDayDate", (inner) => function (...args) {
      return choosing() ? selectedDate() : inner.apply(this, args);
    });
    wrap("factoryScopeDates", (inner) => function (scope, ...rest) {
      const effective = scope === undefined ? (() => { try { return factoryProductionScope; } catch { return "day"; } })() : scope;
      if (effective === "day" && selectedDate() !== today()) return [selectedDate()];
      return inner.call(this, scope, ...rest);
    });
    wrap("factoryDoNowQueue", (inner) => function (agenda = ensureFactoryAgenda(), ...rest) {
      if (!choosing()) return inner.call(this, agenda, ...rest);
      const date = selectedDate();
      const active = (agenda || []).filter((item) => item?.editalActive !== false);
      return factoryQueueForDate(date, active)
        .filter(factoryResumoAulaPending)
        .map((entry) => ({ ...entry, sourceDate: date }));
    });
    wrap("renderFactory", (inner) => function (...args) {
      const result = inner.apply(this, args);
      try { syncControl(); } catch {}
      return result;
    });
  }

  function syncControl() {
    const nav = document.querySelector(".factory-production-tabs");
    if (!nav) return;
    let box = document.getElementById(`${INPUT_ID}Box`);
    if (!box) {
      box = document.createElement("label");
      box.id = `${INPUT_ID}Box`;
      box.className = "factory-day-picker-v665";
      box.htmlFor = INPUT_ID;
      box.style.cssText = "display:inline-flex;align-items:center;gap:8px;font-weight:600";
      box.append(document.createTextNode("Dia:"));
      const input = document.createElement("input");
      input.type = "date";
      input.id = INPUT_ID;
      input.addEventListener("change", () => {
        chosen = /^\d{4}-\d{2}-\d{2}$/.test(input.value) ? input.value : "";
        try { sessionStorage.setItem(STORE, JSON.stringify({ date: chosen })); } catch {}
        try { renderFactory(); } catch (error) { console.warn(`[Aldus ${VERSION}] Fábrica não redesenhou.`, error); }
      });
      box.append(input);
      nav.append(box);
    }
    box.hidden = !dayScope();
    const input = document.getElementById(INPUT_ID);
    if (input) {
      input.min = today();
      if (document.activeElement !== input) input.value = selectedDate();
    }
    // A V159 escreve a data de hoje no aviso depois do desenho; aqui ele passa
    // a dizer o dia escolhido.
    if (choosing()) {
      const notice = document.querySelector(".factory-scope-notice");
      const label = typeof formatDateBR === "function" ? formatDateBR(selectedDate()) : selectedDate();
      if (notice) notice.textContent = `Exibindo somente os temas do Plano do Dia de ${label} (dia escolhido). Pendências de outros dias não substituem esta lista.`;
    }
    const dayButton = nav.querySelector('[data-production-scope="day"]');
    if (dayButton) dayButton.textContent = selectedDate() === today() ? "Plano do Dia" : `Plano do Dia ${typeof formatDateBR === "function" ? formatDateBR(selectedDate()).slice(0, 5) : selectedDate()}`;
  }

  const api = { version: VERSION, selectedDate, setDate(date) { chosen = date || ""; try { renderFactory(); } catch {} return selectedDate(); } };
  globalThis[FLAG] = api;

  // A V159 troca estas funções quando o núcleo fica pronto; o filtro entra
  // por cima dela. Confere por 60 s caso outra camada troque de novo.
  const startedAt = Date.now();
  const tick = () => {
    const v159Ready = Boolean(globalThis.__ALDUS_FACTORY_PLAN_DAY_V159__);
    if (v159Ready || Date.now() - startedAt > 15000) installWrappers();
    if (Date.now() - startedAt < 60000) setTimeout(tick, 500);
  };
  if (typeof window !== "undefined") tick();
})();
