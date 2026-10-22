/* V670 — Leitor TDAH, Etapa 4.
   Decisões dele (21/10/2026): "Questões leva para o Treino do site" e
   "provável e errados só na revisão do site (não no Plano do Dia)".
   - QUESTÕES no leitor: o leitor avisa pelo BroadcastChannel e esta aba do site
     abre o Treino de questões do mesmo assunto (o mesmo da Fábrica). Só uma aba
     abre: a que abriu o leitor; se ela não existir mais, a primeira que pegar a vez.
   - Revisão Inteligente e Revisões: quadro com os assuntos do leitor que têm
     trechos ★ prováveis ou flashcards errados, com link para revisar no leitor.
   Só lê o IndexedDB do leitor ("aldus-leitor-tdah"); nada aqui grava no state. */
(() => {
  "use strict";

  const VERSION = "20261022-leitor-tdah-etapa4-v670";
  const IDB_NOME = "aldus-leitor-tdah";
  const CANAL_SITE = "aldus-leitor-tdah-site";
  const CANAL_LEITOR = "aldus-leitor-tdah";
  const CHAVE_ABA = "aldus:leitor-tdah:aba";
  const TELAS = { "revisao-inteligente": "smartReviewStandalone", "revisoes": "reviewsDashboard" };

  // Contagem lida do estado salvo pelo leitor (S.user.prov e S.user.cards).
  function contarRevisao(estado) {
    const u = estado?.user || {};
    const prov = Object.keys(u.prov || {}).length;
    let errados = 0;
    let trechosErrados = 0;
    for (const marcas of Object.values(u.cards || {})) {
      const n = Object.values(marcas || {}).filter((v) => v === "err").length;
      errados += n;
      if (n) trechosErrados += 1;
    }
    return { prov, errados, trechosErrados };
  }

  function textoRevisao(c) {
    const partes = [];
    if (c.prov) partes.push(`★ ${c.prov} ${c.prov === 1 ? "trecho provável" : "trechos prováveis"}`);
    if (c.errados) partes.push(`✖ ${c.errados} ${c.errados === 1 ? "flashcard errado" : "flashcards errados"}`);
    return partes.join(" · ");
  }

  function comAba(link, aba) {
    if (!aba || /[?&]aba=/.test(link)) return link;
    return link + (link.includes("?") ? "&" : "?") + "aba=" + encodeURIComponent(aba);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { VERSION, contarRevisao, textoRevisao, comAba };
    return;
  }

  function itensDaFabrica() {
    try {
      const st = typeof state !== "undefined" && state && typeof state === "object" ? state : globalThis.state;
      if (Array.isArray(st?.factoryAgenda) && st.factoryAgenda.length) return st.factoryAgenda;
      return Array.isArray(st?.factoryItems) ? st.factoryItems : [];
    } catch {
      return [];
    }
  }

  // Identidade desta aba (sobrevive a recarregar a mesma aba).
  const minhaAba = (() => {
    let id = "";
    try { id = sessionStorage.getItem(CHAVE_ABA) || ""; } catch {}
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      try { sessionStorage.setItem(CHAVE_ABA, id); } catch {}
    }
    return id;
  })();

  function linkDoLeitor(item) {
    const v669 = globalThis.__aldusLeitorTdahV669;
    if (v669?.linkDoLeitor) return v669.linkDoLeitor(item);
    return "leitor-tdah.html?item=" + encodeURIComponent(item.id || "");
  }

  // O botão da V669 passa a levar a identidade desta aba.
  document.addEventListener("click", (evento) => {
    const a = evento.target.closest?.("a[data-leitor-tdah]");
    if (a) a.href = comAba(a.getAttribute("href") || "", minhaAba);
  }, true);

  /* ---------- QUESTÕES → Treino de questões ---------- */
  const canal = "BroadcastChannel" in globalThis ? new BroadcastChannel(CANAL_SITE) : null;
  const atendidos = new Set();
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  function abrirTreino(pedido) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.hidden = true;
    botao.dataset.qtFactory = pedido.item || "";
    document.body.append(botao);
    botao.click();
    botao.remove();
    const caixa = document.getElementById("questionTrainingDialog");
    const form = caixa?.querySelector("#questionTrainingForm");
    if (!caixa?.open || !form) return false;
    // Assunto que não está mais na agenda da Fábrica: o formulário vem vazio.
    const campos = [["discipline", pedido.disciplina], ["theme", pedido.tema]];
    let mudou = false;
    for (const [nome, valor] of campos) {
      const campo = form.elements?.[nome];
      if (campo && !campo.value && valor) { campo.value = valor; mudou = true; }
    }
    if (mudou) form.elements.discipline?.dispatchEvent(new Event("change", { bubbles: true }));
    const titulo = document.title;
    if (!titulo.startsWith("📝 ")) {
      document.title = "📝 " + titulo;
      caixa.addEventListener("close", () => { document.title = titulo; }, { once: true });
    }
    return true;
  }

  function atender(pedido) {
    if (atendidos.has(pedido.id)) return;
    atendidos.add(pedido.id);
    const ok = abrirTreino(pedido);
    canal.postMessage({ tipo: ok ? "treino-aberto" : "treino-falhou", id: pedido.id });
  }

  async function aoPedido(pedido) {
    if (pedido.aba && pedido.aba === minhaAba) return atender(pedido);
    // Outra aba: espera a que abriu o leitor responder; se ninguém responder,
    // a primeira aba que pegar a trava abre o Treino.
    await espera(pedido.aba ? 700 : 0);
    if (atendidos.has(pedido.id)) return;
    if (navigator.locks?.request) {
      await navigator.locks.request("aldus-leitor-treino-" + pedido.id, { ifAvailable: true }, async (trava) => {
        if (!trava || atendidos.has(pedido.id)) return;
        atender(pedido);
        await espera(3000);
      });
    } else {
      await espera(Math.random() * 300);
      if (!atendidos.has(pedido.id)) atender(pedido);
    }
  }

  canal?.addEventListener("message", (evento) => {
    const msg = evento.data || {};
    if (msg.tipo === "treino-aberto" || msg.tipo === "treino-falhou") atendidos.add(msg.id);
    else if (msg.tipo === "abrir-treino" && msg.id) void aoPedido(msg);
  });

  /* ---------- Revisão: ★ prováveis e flashcards errados ---------- */
  function abrirBanco() {
    return new Promise((resolve) => {
      try {
        const pedido = indexedDB.open(IDB_NOME, 1);
        pedido.onupgradeneeded = () => {
          const db = pedido.result;
          for (const nome of ["estados", "itens"]) if (!db.objectStoreNames.contains(nome)) db.createObjectStore(nome);
        };
        pedido.onsuccess = () => resolve(pedido.result);
        pedido.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  function lerTudo(db, loja) {
    return new Promise((resolve) => {
      try {
        const pares = [];
        const pedido = db.transaction(loja).objectStore(loja).openCursor();
        pedido.onsuccess = () => {
          const c = pedido.result;
          if (!c) return resolve(pares);
          pares.push([c.key, c.value]);
          c.continue();
        };
        pedido.onerror = () => resolve(pares);
      } catch {
        resolve([]);
      }
    });
  }

  function ler(db, loja, chave) {
    return new Promise((resolve) => {
      try {
        const pedido = db.transaction(loja).objectStore(loja).get(chave);
        pedido.onsuccess = () => resolve(pedido.result);
        pedido.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function assuntosParaRevisar() {
    const db = await abrirBanco();
    if (!db) return [];
    const fabrica = itensDaFabrica();
    const porAssunto = new Map();
    for (const [itemId, aid] of await lerTudo(db, "itens")) {
      if (!aid) continue;
      const item = fabrica.find((x) => x && x.id === itemId);
      const atual = porAssunto.get(aid);
      if (!atual || (!atual.item && item)) porAssunto.set(aid, { itemId, item });
    }
    const lista = [];
    for (const [aid, ref] of porAssunto) {
      const estado = await ler(db, "estados", aid);
      const conta = contarRevisao(estado);
      if (!conta.prov && !conta.errados) continue;
      const link = ref.item ? linkDoLeitor(ref.item) : "leitor-tdah.html?item=" + encodeURIComponent(ref.itemId);
      lista.push({ titulo: estado?.inv?.titulo || ref.item?.tema || ref.item?.theme || aid, conta, link: comAba(link, minhaAba) + "&revisar=1" });
    }
    db.close();
    return lista.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  }

  function quadro(view) {
    const ancora = document.getElementById(TELAS[view]);
    if (!ancora) return null;
    let caixa = ancora.parentElement.querySelector(":scope > [data-leitor-tdah-revisao]");
    if (!caixa) {
      caixa = document.createElement("div");
      caixa.setAttribute("data-leitor-tdah-revisao", view);
      caixa.className = "notice";
      caixa.hidden = true;
      ancora.before(caixa);
    }
    return caixa;
  }

  let pintando = false;
  async function pintar(view) {
    if (!TELAS[view] || pintando) return;
    const caixa = quadro(view);
    if (!caixa) return;
    pintando = true;
    try {
      const lista = await assuntosParaRevisar();
      caixa.replaceChildren();
      caixa.hidden = !lista.length;
      if (!lista.length) return;
      const titulo = document.createElement("strong");
      titulo.textContent = "📖 Leitor TDAH — para revisar";
      const nota = document.createElement("p");
      nota.className = "item-meta";
      nota.textContent = "Trechos que você marcou ★ provável e flashcards que você errou no leitor. Clique para revisar.";
      const botoes = document.createElement("div");
      botoes.className = "card-actions";
      for (const x of lista) {
        const a = document.createElement("a");
        a.className = "secondary-button";
        a.href = x.link;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = `${x.titulo} · ${textoRevisao(x.conta)}`;
        botoes.append(a);
      }
      caixa.append(titulo, nota, botoes);
    } finally {
      pintando = false;
    }
  }

  const telaAtiva = () => document.documentElement.dataset.activeView || String(location.hash || "").replace(/^#/, "");
  const repintar = () => setTimeout(() => pintar(telaAtiva()), 60);
  window.addEventListener("aldus:view-active", (e) => setTimeout(() => pintar(e?.detail?.view || telaAtiva()), 60));
  window.addEventListener("hashchange", repintar);
  // O leitor avisa a cada gravação; o quadro aberto se atualiza sozinho.
  if ("BroadcastChannel" in globalThis) new BroadcastChannel(CANAL_LEITOR).addEventListener("message", repintar);

  globalThis.__aldusLeitorTdahV670 = { VERSION, aba: minhaAba, pintar };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", repintar, { once: true });
  else repintar();
})();
