(() => {
  "use strict";

  // V639: os prompts do tema apareciam numa fileira única, o que levava a escolher o módulo errado.
  // Aqui eles são agrupados por etapa e numerados (1., 1.1, 2., 2.1...), sem mudar o que cada botão faz.
  const VERSION = "20260923-factory-prompt-organizacao-v639";
  const STYLE_ID = "aldusPromptOrganizacaoEstiloV639";
  const MARCADOR = "aldus-prompts-v639";

  const GRUPOS = [
    { titulo: "1. Antes de produzir", numero: 1, classe: "etapa-1", chaves: ["triagem"] },
    {
      titulo: "2. Produção", numero: 2, classe: "etapa-2",
      chaves: ["resumoAula", "resumoAulaJurisprudencia", "lei", "leiJurisprudencia", "jurisprudencia", "peca"]
    },
    {
      titulo: "3. Fechamento", numero: 3, classe: "etapa-3",
      chaves: ["consolidacao", "fusaoFinal", "padronizacaoFinalSumario"]
    }
  ];

  const NOMES = {
    triagem: "TRIAGEM",
    resumoAula: "RESUMO/AULA",
    resumoAulaJurisprudencia: "RESUMO/AULA + JURISPRUDÊNCIA",
    lei: "LEI",
    leiJurisprudencia: "LEI + JURISPRUDÊNCIA",
    jurisprudencia: "JURISPRUDÊNCIA",
    peca: "PEÇA",
    consolidacao: "CONSOLIDAÇÃO FINAL",
    fusaoFinal: "FUSÃO FINAL",
    padronizacaoFinalSumario: "PADRONIZAÇÃO FINAL + SUMÁRIO"
  };

  function ensureStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    // Só variáveis e classes que o site já usa.
    style.textContent = `
      .${MARCADOR} { display: grid; gap: 10px; margin: 6px 0 4px; }
      .${MARCADOR} .etapa { border-left: 4px solid var(--border-strong, var(--border)); border-radius: 0 14px 14px 0;
        background: var(--bg-soft, #f8fafc); padding: 10px 12px; }
      .${MARCADOR} .etapa-1 { border-left-color: var(--muted, #64748b); }
      .${MARCADOR} .etapa-2 { border-left-color: var(--primary, #2563eb); }
      .${MARCADOR} .etapa-3 { border-left-color: var(--success, #16a34a); }
      .${MARCADOR} .etapa-titulo { margin: 0 0 8px; font-size: .78rem; font-weight: 800; letter-spacing: .06em;
        text-transform: uppercase; color: var(--muted, #64748b); }
      .${MARCADOR} .etapa-botoes { display: flex; flex-wrap: wrap; gap: 8px; }
      .${MARCADOR} .etapa-botoes button { font-size: .86rem; }
      .${MARCADOR} .numero { font-weight: 800; margin-right: 6px; opacity: .75; }
    `;
    document.head.appendChild(style);
  }

  // O bloco alvo é o "Botões de todos os prompts" (div.factory-prompt-actions > div.card-actions).
  const BLOCO = /(<div class="factory-prompt-actions">[\s\S]*?<div class="card-actions">)([\s\S]*?)(<\/div>)/;

  function organizar(html) {
    const texto = String(html || "");
    if (texto.includes(MARCADOR)) return texto;
    const bloco = texto.match(BLOCO);
    if (!bloco) return texto;
    const regex = /<button type="button" class="secondary-button" data-factory-prompt="([^"|]+)\|([^"]+)">([^<]*)<\/button>/g;
    const achados = [...bloco[2].matchAll(regex)];
    if (achados.length < 3) return texto;
    const inicio = bloco.index + bloco[1].length;
    const fim = inicio + bloco[2].length;

    const porChave = new Map(achados.map((m) => [m[2], { id: m[1], chave: m[2], rotulo: m[3] }]));
    const usadas = new Set(GRUPOS.flatMap((g) => g.chaves));
    const extras = achados.map((m) => m[2]).filter((chave) => !usadas.has(chave));

    const blocos = GRUPOS.map((grupo) => {
      const chaves = grupo.numero === 3 ? [...grupo.chaves, ...extras] : grupo.chaves;
      const botoes = chaves
        .filter((chave) => porChave.has(chave))
        .map((chave, indice) => {
          const item = porChave.get(chave);
          const nome = NOMES[chave] || item.rotulo.replace("Gerar prompt ", "").toUpperCase();
          return `<button type="button" class="secondary-button" data-factory-prompt="${item.id}|${chave}" title="${item.rotulo}">`
            + `<span class="numero">${grupo.numero}.${indice + 1}</span>${nome}</button>`;
        })
        .join("");
      if (!botoes) return "";
      return `<div class="etapa ${grupo.classe}"><p class="etapa-titulo">${grupo.titulo}</p><div class="etapa-botoes">${botoes}</div></div>`;
    }).join("");

    if (!blocos) return texto;
    return texto.slice(0, inicio) + `<div class="${MARCADOR}">${blocos}</div>` + texto.slice(fim);
  }

  function install() {
    try {
      if (typeof factoryDetailBodyHTML !== "function") return false;
      if (factoryDetailBodyHTML.__aldusPromptOrganizacaoV639 === VERSION) return true;
      const previous = factoryDetailBodyHTML;
      const wrapped = function (item) {
        const html = previous(item);
        try {
          ensureStyle();
          return organizar(html);
        } catch (_erro) {
          return html;   // qualquer falha aqui devolve a tela original
        }
      };
      Object.defineProperty(wrapped, "__aldusPromptOrganizacaoV639", { value: VERSION });
      Object.defineProperty(wrapped, "__aldusPromptOrganizacaoOriginal", { value: previous });
      factoryDetailBodyHTML = wrapped;
      ensureStyle();
      window.__ALDUS_FACTORY_PROMPT_ORGANIZACAO_V639__ = Object.freeze({ version: VERSION, grupos: GRUPOS, nomes: NOMES, organizar });
      return true;
    } catch (_erro) {
      return false;
    }
  }

  function installWhenApplicationIsReady() {
    if (install()) return;
    let tentativas = 0;
    const tentar = () => {
      if (install() || ++tentativas > 20) return;
      setTimeout(tentar, 250);
    };
    setTimeout(tentar, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installWhenApplicationIsReady, { once: true });
  } else {
    installWhenApplicationIsReady();
  }
  window.addEventListener("load", installWhenApplicationIsReady, { once: true });
})();
