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

  // 4. Tema específico: mesmo prompt, mas para um tema digitado na hora (fora das metas, ou para aprofundar).
  const LIVRES = [
    ["resumoAulaJurisprudencia", "RESUMO/AULA + JURISPRUDÊNCIA"],
    ["leiJurisprudencia", "LEI + JURISPRUDÊNCIA"],
    ["jurisprudencia", "JURISPRUDÊNCIA"],
    ["triagem", "TRIAGEM"],
    ["resumoAula", "RESUMO/AULA"],
    ["lei", "LEI"],
    ["peca", "PEÇA"]
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
    // O cartão da Fábrica é escuro, mas as variáveis --bg-soft/--muted do :root guardam valores claros
    // (verificado na tela em 23/09): pintar fundo ou texto com elas deixaria o bloco ilegível.
    // Por isso aqui só há borda colorida; fundo e cor do texto são herdados do cartão, em qualquer tema.
    style.textContent = `
      .${MARCADOR} { display: grid; gap: 10px; margin: 6px 0 4px; }
      .${MARCADOR} .etapa { background: transparent; color: inherit; padding: 8px 0 8px 12px;
        border-left: 4px solid #64748b; border-radius: 0 14px 14px 0; }
      .${MARCADOR} .etapa-2 { border-left-color: #2563eb; }
      .${MARCADOR} .etapa-3 { border-left-color: #16a34a; }
      .${MARCADOR} .etapa-4 { border-left-color: #f59e0b; }
      .${MARCADOR} .etapa-titulo { margin: 0 0 8px; font-size: .78rem; font-weight: 800; letter-spacing: .06em;
        text-transform: uppercase; opacity: .85; }
      .${MARCADOR} .etapa-botoes { display: flex; flex-wrap: wrap; gap: 8px; }
      .${MARCADOR} .etapa-botoes button { font-size: .86rem; }
      .${MARCADOR} .numero { font-weight: 800; margin-right: 6px; opacity: .75; }
      .${MARCADOR} .tema-livre-campos { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
      .${MARCADOR} .tema-livre-campos input { flex: 1 1 260px; padding: 8px 10px; border-radius: 12px; font: inherit; }
      .${MARCADOR} .tema-livre-aviso { margin: 8px 0 0; font-size: .8rem; opacity: .8; }
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

    const id = achados[0][1];
    const campos = `<div class="tema-livre-campos">`
      + `<input type="text" data-aldus-tema-livre-campo="${id}" placeholder="tema específico (ex.: busca pessoal em abordagem policial)">`
      + `<input type="text" data-aldus-tema-livre-recorte="${id}" placeholder="recorte (opcional)">`
      + `</div>`;
    const botoesLivres = LIVRES
      .filter(([chave]) => porChave.has(chave))
      .map(([chave, nome], indice) => `<button type="button" class="secondary-button" data-aldus-tema-livre="${id}|${chave}">`
        + `<span class="numero">4.${indice + 1}</span>${nome}</button>`)
      .join("");
    const bloco4 = botoesLivres
      ? `<div class="etapa etapa-4"><p class="etapa-titulo">4. Tema específico</p>${campos}`
        + `<div class="etapa-botoes">${botoesLivres}</div>`
        + `<p class="tema-livre-aviso">Usa a disciplina e as pastas deste tema, trocando só o assunto. Não cria meta nem altera a Fábrica.</p>`
        + `<p class="tema-livre-aviso" data-aldus-tema-livre-msg="${id}"></p></div>`
      : "";

    if (!blocos) return texto;
    return texto.slice(0, inicio) + `<div class="${MARCADOR}">${blocos}${bloco4}</div>` + texto.slice(fim);
  }

  function aviso(id, texto) {
    const alvo = document.querySelector(`[data-aldus-tema-livre-msg="${CSS.escape(id)}"]`);
    if (alvo) alvo.textContent = texto;
  }

  // Linhas de pasta e de link guardam o nome do tema no caminho: trocar ali quebraria o destino do arquivo.
  const LINHA_DE_CAMINHO = /(https?:|drive\.google|pasta|caminho|link)/i;

  function trocarTemaNoTexto(id, original, tema, recorte) {
    const escapado = CSS.escape(String(id || ""));
    let trocou = false;
    for (const seletor of [`[data-factory-prompt-text="${escapado}"]`, `[data-factory-router-text="${escapado}"]`]) {
      const campo = document.querySelector(seletor);
      if (!campo || typeof campo.value !== "string") continue;
      const antes = campo.value;
      let texto = antes.split("\n")
        .map((linha) => (LINHA_DE_CAMINHO.test(linha) ? linha : linha.split(original).join(tema)))
        .join("\n");
      if (recorte) texto = texto.replace(/^(Tema:.*)$/mi, `$1\nRecorte pedido: ${recorte}`);
      if (texto !== antes) { campo.value = texto; trocou = true; }
    }
    return trocou;
  }

  function gerarTemaLivre(id, tipo) {
    const campo = document.querySelector(`[data-aldus-tema-livre-campo="${CSS.escape(id)}"]`);
    const recorte = document.querySelector(`[data-aldus-tema-livre-recorte="${CSS.escape(id)}"]`);
    const tema = String(campo?.value || "").trim();
    if (!tema) { aviso(id, "Escreva o tema específico antes de gerar o prompt."); campo?.focus?.(); return; }

    const item = (typeof ensureFactoryAgenda === "function" ? ensureFactoryAgenda() : []).find((x) => x.id === id);
    if (!item) { aviso(id, "Tema da Fábrica não encontrado."); return; }
    const original = String(item.tema || "");

    // O site só atende cliques dentro do #factoryList, então o gatilho nasce dentro do próprio cartão.
    const ancora = campo?.closest?.(".etapa") || document.querySelector(`[data-factory-prompt-panel="${CSS.escape(id)}"]`);
    if (!ancora || typeof ancora.appendChild !== "function") {
      aviso(id, "Não foi possível gerar aqui: recarregue a página e tente de novo.");
      return;
    }
    const gatilho = document.createElement("button");
    gatilho.type = "button";
    gatilho.hidden = true;
    gatilho.setAttribute("data-factory-prompt", `${id}|${tipo}`);
    ancora.appendChild(gatilho);
    try {
      // O site monta o prompt do tema como sempre. Nada do item é alterado: ensureFactoryAgenda regrava
      // state.factoryAgenda a cada chamada, então mexer no objeto acabaria gravado no lugar do tema real.
      gatilho.click();
    } finally {
      gatilho.remove();
    }

    // Troca do assunto no texto já montado, antes de o bridge ler a linha "Tema:" (ele lê em microtask).
    const extra = String(recorte?.value || "").trim();
    if (!trocarTemaNoTexto(id, original, tema, extra)) {
      aviso(id, "O prompt não foi gerado (o painel não abriu). Tente de novo.");
      return;
    }
    const cabecalho = document.querySelector(`[data-factory-prompt-panel="${CSS.escape(id)}"] .factory-prompt-header .item-meta`);
    if (cabecalho) cabecalho.textContent = `${item.disciplina} — ${tema}`;
    aviso(id, `Prompt gerado para: ${tema}. A meta e o tema da Fábrica continuam como estavam; as pastas são as deste tema.`);
  }

  function aoClicar(evento) {
    const botao = evento.target?.closest?.("[data-aldus-tema-livre]");
    if (!botao) return;
    evento.preventDefault();
    const [id, tipo] = String(botao.dataset.aldusTemaLivre || "").split("|");
    if (id && tipo) gerarTemaLivre(id, tipo);
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
      document.addEventListener("click", aoClicar, false);
      window.__ALDUS_FACTORY_PROMPT_ORGANIZACAO_V639__ = Object.freeze({ version: VERSION, grupos: GRUPOS, nomes: NOMES, livres: LIVRES, organizar, gerarTemaLivre });
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
