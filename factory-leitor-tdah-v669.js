/* V669 — Leitor TDAH na Fábrica.
   Acrescenta o botão "📖 Leitor TDAH" no painel DETALHES DO TEMA de cada assunto.
   O botão abre leitor-tdah.html em outra aba, levando o id do assunto, o tema, a
   disciplina e o link da pasta de destino. O leitor guarda os dados no IndexedDB
   próprio ("aldus-leitor-tdah"), fora do estado do site: nada aqui grava no state. */
(() => {
  "use strict";

  const VERSION = "20261021-leitor-tdah-v669";
  const IDB_NOME = "aldus-leitor-tdah";
  const ATRIBUTO = "data-leitor-tdah";

  function itensDaFabrica() {
    try {
      // state do site é const global do script principal (não fica em globalThis).
      const st = typeof state !== "undefined" && state && typeof state === "object" ? state : globalThis.state;
      if (Array.isArray(st?.factoryAgenda) && st.factoryAgenda.length) return st.factoryAgenda;
      return Array.isArray(st?.factoryItems) ? st.factoryItems : [];
    } catch {
      return [];
    }
  }

  function pastaDoItem(item = {}) {
    return String(item.factoryDestinationFolder || item.pastaDestinoWordPdf || item.destinationFolder || item.finalFilesFolder || "").trim();
  }

  function linkDoLeitor(item = {}) {
    const params = new URLSearchParams({
      item: item.id || "",
      tema: item.tema || item.theme || item.subject || "",
      disciplina: item.disciplina || item.discipline || "",
      pasta: pastaDoItem(item)
    });
    return "leitor-tdah.html?" + params.toString();
  }

  // Situação lida do banco do leitor; sem banco ou sem resumo aberto, fica em branco.
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

  function contarArtigos(estado) {
    if (!estado?.inv?.blocos) return null;
    const trechos = estado.content?.trechos || {};
    const artigos = estado.inv.blocos.filter((b) => b.trechos.some((t) => t.elegivel) && !(!b.artigo && /JURISPRUD/i.test(b.titulo || "")));
    const prontos = artigos.filter((b) => b.trechos.filter((t) => t.elegivel).every((t) => {
      const c = trechos[t.id] || {};
      return c.flashcards && c.por_que && c.texto_facil;
    })).length;
    return { prontos, total: artigos.length };
  }

  async function situacao(id) {
    const db = await abrirBanco();
    if (!db) return "";
    const assunto = await ler(db, "itens", id);
    if (!assunto) return "";
    const conta = contarArtigos(await ler(db, "estados", assunto));
    return conta ? `${conta.prontos}/${conta.total} artigos` : "";
  }

  function inserirBotao(details) {
    const id = details?.dataset?.factoryDetail;
    const corpo = details?.querySelector(".factory-detail-body");
    if (!id || !corpo || corpo.hasAttribute("data-detail-placeholder") || corpo.querySelector(`[${ATRIBUTO}]`)) return;
    const item = itensDaFabrica().find((entrada) => entrada && entrada.id === id);
    if (!item) return;
    const caixa = document.createElement("div");
    caixa.className = "card-actions";
    const botao = document.createElement("a");
    botao.className = "secondary-button";
    botao.setAttribute(ATRIBUTO, id);
    botao.href = linkDoLeitor(item);
    botao.target = "_blank";
    botao.rel = "noopener";
    botao.textContent = "📖 Leitor TDAH";
    caixa.appendChild(botao);
    corpo.prepend(caixa);
    situacao(id).then((texto) => { if (texto) botao.textContent = "📖 Leitor TDAH · " + texto; });
  }

  let agendado = false;
  function varrer() {
    agendado = false;
    document.querySelectorAll("[data-factory-detail]").forEach(inserirBotao);
  }
  function agendar() {
    if (agendado) return;
    agendado = true;
    setTimeout(varrer, 40);
  }

  function iniciar() {
    const lista = document.getElementById("factoryList");
    if (!lista) return;
    new MutationObserver(agendar).observe(lista, { childList: true, subtree: true });
    document.addEventListener("toggle", (evento) => {
      if (evento.target?.matches?.("[data-factory-detail]") && evento.target.open) agendar();
    }, true);
    agendar();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { VERSION, linkDoLeitor, pastaDoItem, contarArtigos };
    return;
  }
  globalThis.__aldusLeitorTdahV669 = { VERSION, linkDoLeitor };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
