/* V644 — Trava das metas.
   Regra dele (28/09/2026): nenhuma meta entra, sai ou muda de dia sozinha.
   Só quando ele mexe no site (clique, envio de formulário, escolha em campo)
   ou quando o agente age por ele, pela API autorizar().

   Como funciona
   - Uma ação dele abre uma janela curta. No início da janela tira-se a foto
     (id → data + retirada) de todas as metas; o que mudar durante a janela
     recebe o carimbo goalLockV644 {sig, at, by}. Metas apagadas pela ação vão
     para state.goalLockV644Removals[id].
   - Antes de cada saveData (caminho principal, que a V275 manda direto ao
     IndexedDB) o estado é comparado com a última versão aceita; e na cópia
     secundária (resolveIndexedDBWriteCandidate, usada também na mesclagem
     entre abas) o que vai ser gravado é comparado com o que está gravado. Meta nova, sumida,
     com outra data ou com outra marca de "retirada" só passa se tiver carimbo
     que confira. O resto é desfeito, no que seria gravado e na tela.
   - O carimbo viaja com a meta; por isso uma mudança autorizada numa aba é
     aceita pelas outras, e uma aba antiga (sem a ação dele) não grava por cima.
   Não mexe em tempo, status nem em qualquer outro campo: só presença e data. */
(() => {
  "use strict";
  const VERSION = "20260928-trava-das-metas-v644";
  const KEY = "__ALDUS_GOAL_LOCK_V644__";
  const MARK = "__aldusGoalLockV644";
  const REMOVALS = "goalLockV644Removals";
  const STAMP = "goalLockV644";
  const JANELA_MS = 8000;
  const LOG_KEY = "aldusGoalLockV644Log";
  const MAX_LOG = 50;
  if (globalThis[KEY]) return;

  let foto = null;          // Map chave → assinatura, do início da janela
  let janelaAte = 0;
  let janelaTimer = null;
  let janelaPor = "usuario";
  let ultimoAviso = 0;
  let base = null;          // { dailyGoals, goalLockV644Removals }: última versão aceita
  const registro = [];

  const dateOf = (goal) => String(goal?.date || goal?.data || "").slice(0, 10);
  const sig = (goal) => `${dateOf(goal)}|${goal?.removedFromDailyPlanV641 === true ? 1 : 0}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function appState() {
    try { if (typeof state !== "undefined" && state && typeof state === "object") return state; } catch {}
    return globalThis.state && typeof globalThis.state === "object" ? globalThis.state : null;
  }

  // Chave estável mesmo com ids repetidos (defeito conhecido): id#ocorrência.
  function keyed(list) {
    const seen = new Map();
    return (Array.isArray(list) ? list : []).map((goal) => {
      const id = String(goal?.id || "");
      const index = seen.get(id) || 0;
      seen.set(id, index + 1);
      return [`${id}#${index}`, goal];
    });
  }
  const idOf = (key) => key.slice(0, key.lastIndexOf("#"));

  // --- Janela de ação do usuário ---------------------------------------------

  function tirarFoto(alvo = appState()) {
    if (!alvo || !Array.isArray(alvo.dailyGoals)) return null;
    return new Map(keyed(alvo.dailyGoals).map(([key, goal]) => [key, sig(goal)]));
  }

  // Carimba o que mudou desde a foto: essas mudanças são dele.
  function carimbar(alvo = appState(), por = janelaPor) {
    if (!foto || !alvo || !Array.isArray(alvo.dailyGoals)) return 0;
    const at = new Date().toISOString();
    const atuais = keyed(alvo.dailyGoals);
    const chaves = new Set();
    let total = 0;
    for (const [key, goal] of atuais) {
      chaves.add(key);
      const antes = foto.get(key);
      const agora = sig(goal);
      if (antes === agora || !goal || typeof goal !== "object") continue;
      if (goal[STAMP]?.sig === agora) continue;
      goal[STAMP] = { sig: agora, at, by: por };
      total += 1;
    }
    for (const key of foto.keys()) {
      if (chaves.has(key)) continue;
      const id = idOf(key);
      if (!id) continue;
      alvo[REMOVALS] = alvo[REMOVALS] && typeof alvo[REMOVALS] === "object" ? alvo[REMOVALS] : {};
      if (!alvo[REMOVALS][id]) { alvo[REMOVALS][id] = { at, by: por }; total += 1; }
    }
    return total;
  }

  function abrirJanela(por = "usuario", ms = JANELA_MS) {
    if (!foto) foto = tirarFoto();
    janelaPor = por;
    janelaAte = Date.now() + ms;
    if (janelaTimer) clearTimeout(janelaTimer);
    janelaTimer = setTimeout(fecharJanela, ms);
  }

  function fecharJanela() {
    if (janelaTimer) { clearTimeout(janelaTimer); janelaTimer = null; }
    try { carimbar(); } catch {}
    foto = null;
    janelaAte = 0;
  }

  const janelaAberta = () => Boolean(foto) && Date.now() <= janelaAte;

  function ehAcaoDoUsuario(event) {
    if (!event?.isTrusted) return false;
    const alvo = event.target;
    if (!alvo?.closest) return event.type === "submit";
    // Navegar entre telas e abrir/fechar painéis não é mexer em meta.
    if (alvo.closest("a[data-view-link], nav, summary, .aldus-v643-tab")) return false;
    if (event.type === "keydown") return ["Enter", " "].includes(event.key) && Boolean(alvo.closest("button, [role=button], input, select, textarea"));
    if (event.type === "click") return Boolean(alvo.closest("button, [role=button], input[type=checkbox], input[type=radio], [data-goal-action], [data-delete-goal], label"));
    return true; // submit, change
  }

  function instalarEventos() {
    if (typeof document === "undefined" || document[MARK]) return;
    document[MARK] = true;
    for (const tipo of ["click", "submit", "change", "keydown"]) {
      document.addEventListener(tipo, (event) => { if (ehAcaoDoUsuario(event)) abrirJanela("usuario"); }, true);
    }
  }

  // --- Verificação na gravação ------------------------------------------------

  function verificar(dados, gravado, vivo = null) {
    if (!dados || !Array.isArray(dados.dailyGoals) || !gravado || !Array.isArray(gravado.dailyGoals)) return [];
    // Estado ainda vazio (gravação da abertura, antes de carregar os dados): não
    // é exclusão de metas. As proteções V256/V275 já impedem que vazio substitua
    // dados válidos; aqui só não se mexe nem se avisa.
    if (!dados.dailyGoals.length && gravado.dailyGoals.length) return [];
    const antes = new Map(keyed(gravado.dailyGoals));
    const vivos = new Map(vivo && vivo !== dados && Array.isArray(vivo.dailyGoals) ? keyed(vivo.dailyGoals) : []);
    const remocoes = Object.assign({}, gravado[REMOVALS] || {}, vivo?.[REMOVALS] || {}, dados[REMOVALS] || {});

    const carimboConfere = (goal, key) => {
      const alvo = sig(goal);
      if (goal?.[STAMP]?.sig === alvo) return true;
      const irma = vivos.get(key);
      if (irma?.[STAMP]?.sig === alvo) { goal[STAMP] = { ...irma[STAMP] }; return true; }
      return false;
    };

    const desfeitas = [];
    const resultado = [];
    const presentes = new Set();
    for (const [key, goal] of keyed(dados.dailyGoals)) {
      presentes.add(key);
      const anterior = antes.get(key);
      if (!anterior) {
        if (carimboConfere(goal, key)) resultado.push(goal);
        else desfeitas.push(descrever(goal, "incluída sem ação sua"));
        continue;
      }
      if (sig(goal) === sig(anterior) || carimboConfere(goal, key)) { resultado.push(goal); continue; }
      for (const campo of ["date", "data", "removedFromDailyPlanV641", "removedFromDailyPlanAtV641"]) {
        if (Object.prototype.hasOwnProperty.call(anterior, campo)) goal[campo] = anterior[campo];
        else delete goal[campo];
      }
      if (anterior[STAMP]) goal[STAMP] = { ...anterior[STAMP] }; else delete goal[STAMP];
      resultado.push(goal);
      desfeitas.push(descrever(anterior, "mudada de dia/retirada sem ação sua"));
    }
    for (const [key, anterior] of antes) {
      if (presentes.has(key) || remocoes[idOf(key)]) continue;
      resultado.push(clone(anterior));
      desfeitas.push(descrever(anterior, "excluída sem ação sua"));
    }
    if (desfeitas.length) dados.dailyGoals = resultado;
    if (Object.keys(remocoes).length) dados[REMOVALS] = remocoes;
    return desfeitas;
  }

  function descrever(goal, motivo) {
    return { motivo, id: goal?.id || "", data: dateOf(goal), disciplina: goal?.discipline || goal?.disciplina || "", assunto: String(goal?.subject || goal?.assunto || "").slice(0, 80), origem: goal?.origin || goal?.origem || "" };
  }

  function anotar(desfeitas) {
    if (!desfeitas.length) return;
    const entrada = { at: new Date().toISOString(), desfeitas };
    registro.push(entrada);
    if (registro.length > MAX_LOG) registro.shift();
    console.warn(`[Aldus V644] Trava das metas: ${desfeitas.length} alteração(ões) sem ação sua foram desfeitas.`, entrada);
    try {
      const antigo = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      antigo.push(entrada);
      localStorage.setItem(LOG_KEY, JSON.stringify(antigo.slice(-MAX_LOG)));
    } catch {}
    if (Date.now() - ultimoAviso > 10000) {
      ultimoAviso = Date.now();
      try {
        if (typeof globalThis.showDailyGoalMessage === "function") {
          globalThis.showDailyGoalMessage(`Trava das metas: ${desfeitas.length} meta(s) iam entrar, sair ou mudar de dia sem ação sua; a mudança foi desfeita.`, "warning");
        }
      } catch {}
    }
  }

  const copiaRasa = (alvo) => ({
    dailyGoals: (Array.isArray(alvo?.dailyGoals) ? alvo.dailyGoals : []).map((goal) => (goal && typeof goal === "object" ? { ...goal } : goal)),
    [REMOVALS]: { ...(alvo?.[REMOVALS] || {}) }
  });

  function carregarBase() {
    if (base || typeof indexedDB === "undefined") return;
    try {
      const pedido = indexedDB.open("metas-estudo-db");
      pedido.onsuccess = () => {
        const db = pedido.result;
        try {
          if (!db.objectStoreNames.contains("appState")) { db.close(); return; }
          const leitura = db.transaction("appState", "readonly").objectStore("appState").get("current");
          leitura.onsuccess = () => {
            if (!base && Array.isArray(leitura.result?.data?.dailyGoals)) base = copiaRasa(leitura.result.data);
            db.close();
          };
          leitura.onerror = () => db.close();
        } catch { try { db.close(); } catch {} }
      };
    } catch {}
  }

  // Caminho principal: antes de gravar, o estado em memória não pode ter
  // meta que entrou, saiu ou mudou de dia sem carimbo desde a última versão aceita.
  function antesDeSalvar() {
    const vivo = appState();
    if (!vivo || !Array.isArray(vivo.dailyGoals)) return;
    if (janelaAberta()) carimbar(vivo);
    // Sem a versão gravada ainda lida, não há com o que comparar: a cópia
    // secundária (resolveIndexedDBWriteCandidate) continua conferindo.
    if (!base) return;
    const desfeitas = verificar(vivo, base, null);
    if (desfeitas.length) {
      anotar(desfeitas);
      try { if (typeof globalThis.render === "function") setTimeout(() => globalThis.render(), 0); } catch {}
    }
    base = copiaRasa(vivo);
  }

  const ELOS = ["__aldusIndividualGuardV641Original", "__aldusPreviousGoalResumeOriginal", "__aldusManualGoalAdditiveOriginal", "__aldusOriginal", "__aldusV427Original", "__aldusGoalLockV644Original"];
  function cadeiaTem(fn) {
    let atual = fn;
    for (let i = 0; atual && i < 25; i += 1) {
      if (atual[MARK]) return true;
      atual = ELOS.map((elo) => atual[elo]).find((proximo) => typeof proximo === "function");
    }
    return false;
  }

  function envolverSaveData() {
    const original = globalThis.saveData;
    if (typeof original !== "function" || cadeiaTem(original)) return typeof original === "function";
    const envolvida = function (...args) {
      try { antesDeSalvar(); } catch (error) { console.error("[Aldus V644] Falha na trava das metas antes de salvar.", error); }
      return original.apply(this, args);
    };
    Object.defineProperty(envolvida, MARK, { value: VERSION });
    Object.defineProperty(envolvida, "__aldusGoalLockV644Original", { value: original });
    globalThis.saveData = envolvida;
    return true;
  }

  function envolverGravacao() {
    const original = globalThis.resolveIndexedDBWriteCandidate;
    if (typeof original !== "function" || original[MARK]) return typeof original === "function";
    const envolvida = function (source, existing, options) {
      const resolvido = original.apply(this, arguments);
      try {
        const gravado = existing && typeof existing === "object" ? existing.data : null;
        if (!gravado || !resolvido?.data) return resolvido;
        const vivo = appState();
        if (janelaAberta()) carimbar(vivo);
        const desfeitas = verificar(resolvido.data, gravado, vivo);
        if (vivo && vivo !== resolvido.data) verificar(vivo, gravado, null);
        if (desfeitas.length) {
          anotar(desfeitas);
          try { if (typeof globalThis.render === "function") setTimeout(() => globalThis.render(), 0); } catch {}
        }
      } catch (error) {
        console.error("[Aldus V644] Falha na trava das metas; gravação seguiu sem verificação.", error);
      }
      return resolvido;
    };
    Object.defineProperty(envolvida, MARK, { value: VERSION });
    globalThis.resolveIndexedDBWriteCandidate = envolvida;
    return true;
  }

  // O agente (Claude) age por ele: mesma janela, carimbo "agente".
  function autorizar(nome, operacao) {
    fecharJanela();
    foto = tirarFoto();
    janelaPor = `agente:${nome || "operacao"}`;
    janelaAte = Date.now() + JANELA_MS;
    try {
      return operacao();
    } finally {
      carimbar(appState(), janelaPor);
      janelaPor = "usuario";
      foto = null;
      janelaAte = 0;
    }
  }

  function install() {
    instalarEventos();
    carregarBase();
    const gravacao = envolverGravacao();
    const salvar = envolverSaveData();
    return gravacao && salvar;
  }

  const api = Object.freeze({
    version: VERSION,
    install,
    autorizar,
    verificar,
    carimbar,
    abrirJanela,
    fecharJanela,
    antesDeSalvar,
    sig,
    get janelaAberta() { return janelaAberta(); },
    get registro() { return registro.map((entrada) => ({ ...entrada, desfeitas: entrada.desfeitas.map((item) => ({ ...item })) })); }
  });
  globalThis[KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  install();
  if (typeof document !== "undefined") {
    // O bundle do app declara resolveIndexedDBWriteCandidate ao carregar; a
    // primeira gravação só vem depois da leitura assíncrona do IndexedDB.
    document.addEventListener("load", (event) => { if (event.target?.tagName === "SCRIPT") install(); }, true);
  }
  if (typeof window !== "undefined") {
    for (const nome of ["load", "aldus:bootstrap-ready", "aldus:post-bootstrap-maintenance-complete", "aldus:bootstrap-integrity-v258-ready"]) {
      window.addEventListener(nome, install);
    }
  }
})();
