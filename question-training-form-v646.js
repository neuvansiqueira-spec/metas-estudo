/* V646 — "Configurar rodada de questões" arrumada e com as últimas escolhas.
   Pedido dele (28/09/2026): a tela parecia poluída; e lembrar as últimas escolhas.
   - Em cima: Disciplina, Tema e Número de questões.
   - Preferências da busca (banca, complementos, criadas, dificuldade, ordem)
     num cartão recolhido, com uma linha de resumo.
   - "Formato das criadas" só aparece quando elas podem entrar.
   - Títulos mais curtos; um "Fechar" só; a nota do QConcursos em letra menor.
   - Últimas escolhas: gravadas ao gerar o prompt (neste navegador) e
     aplicadas ao abrir. Disciplina e tema continuam vindo do assunto clicado.
   Só apresentação: move os campos originais (mesmos names), então os valores
   e o prompt gerado não mudam. Não grava nos dados do estudo. */
(() => {
  "use strict";
  const VERSION = "20260928-bancas-em-ordem-v646-2";
  const KEY = "__ALDUS_QUESTION_TRAINING_FORM_V646__";
  const PREFS_KEY = "aldus:qt:preferencias:v646";
  const STYLE_ID = "questionTrainingFormStyleV646";
  if (globalThis[KEY]) return;

  // Campos lembrados (disciplina e tema não: vêm do assunto clicado).
  const LEMBRAR = ["boards", "count", "primary", "otherPrimary", "cebraspe", "supplement", "first", "second", "allowGenerated", "generatedFormat", "difficulty", "order"];
  // V646.2 (28/09/2026, pedido dele): bancas marcadas em ordem de prioridade,
  // com CEBRASPE em três formatos. A 1ª é a principal; as outras entram só se
  // faltar questão, nesta ordem. Os campos antigos ficam ocultos e em sincronia.
  const CATALOGO = [
    { id: "fgv", banca: "FGV", nome: "FGV" },
    { id: "ceb-mc", banca: "CEBRASPE", formato: "Múltipla escolha", nome: "CEBRASPE — só alternativas" },
    { id: "ceb-ce", banca: "CEBRASPE", formato: "Certo/Errado", nome: "CEBRASPE — só Certo/Errado" },
    { id: "ceb-ambos", banca: "CEBRASPE", formato: "Ambos", nome: "CEBRASPE — alternativas e Certo/Errado" },
    { id: "fcc", banca: "FCC", nome: "FCC" },
    { id: "vunesp", banca: "VUNESP", nome: "VUNESP" },
    { id: "aocp", banca: "AOCP", nome: "AOCP" },
    { id: "funcab", banca: "FUNCAB", nome: "FUNCAB" },
    { id: "ibfc", banca: "IBFC", nome: "IBFC" },
    { id: "consulplan", banca: "CONSULPLAN", nome: "CONSULPLAN" },
    { id: "outra", banca: "", nome: "Outra:" },
    { id: "demais", banca: "DEMAIS BANCAS (QUALQUER OUTRA)", nome: "Demais bancas (qualquer outra)" }
  ];
  const LEGADOS = ["primary", "otherPrimary", "cebraspe", "supplement", "first", "second"];
  const PRIMARIAS_DO_SELECT = ["FGV", "CEBRASPE", "AOCP", "VUNESP"];
  const PREFERENCIAS = ["primary", "otherPrimary", "cebraspe", "supplement", "first", "second", "allowGenerated", "generatedFormat", "difficulty", "order"];
  const TITULOS = {
    supplement: "Faltou questão da banca principal?",
    allowGenerated: "Ainda faltou questão real?",
    generatedFormat: "Formato das criadas pelo agente",
    difficulty: "Quais dificuldades priorizar",
    order: "Ordem de apresentação no treino",
    first: "1ª banca complementar",
    second: "2ª banca complementar"
  };

  function lerPrefs() {
    try { const v = JSON.parse(localStorage.getItem(PREFS_KEY) || "null"); return v && typeof v === "object" ? v : null; } catch { return null; }
  }
  function gravarPrefs(form) {
    const prefs = {};
    for (const nome of LEMBRAR) {
      const campo = form.elements?.[nome];
      if (campo && typeof campo.value === "string") prefs[nome] = campo.value;
    }
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
    return prefs;
  }
  function aplicarPrefs(form, prefs) {
    if (!prefs) return false;
    let mudou = false;
    for (const nome of LEMBRAR) {
      const campo = form.elements?.[nome];
      if (!campo || prefs[nome] === undefined) continue;
      if (campo.tagName === "SELECT" && ![...campo.options].some((o) => (o.value || o.textContent) === prefs[nome])) continue;
      if (campo.value !== prefs[nome]) { campo.value = prefs[nome]; mudou = true; }
    }
    return mudou;
  }

  const labelDe = (form, nome) => form.elements?.[nome]?.closest?.("label") || null;
  const visivel = (el) => Boolean(el) && !el.hidden && el.style.display !== "none";
  function textoOpcao(campo) {
    if (!campo) return "";
    if (campo.tagName === "SELECT") return campo.options[campo.selectedIndex]?.textContent?.trim() || campo.value;
    return String(campo.value || "").trim();
  }

  function resumo(form) {
    const e = form.elements;
    const partes = [];
    const lista = lerBoards(e.boards?.value);
    if (lista.length) {
      partes.push(lista.map(nomeCurto).join(" → "));
    } else {
      const banca = e.primary?.value === "Outra" ? (e.otherPrimary?.value || "outra banca") : textoOpcao(e.primary);
      partes.push(banca);
      if (visivel(labelDe(form, "cebraspe"))) partes.push(`CEBRASPE: ${textoOpcao(e.cebraspe)}`);
      const sup = e.supplement?.value;
      if (sup && sup !== "none") partes.push(`completa: ${textoOpcao(e.supplement).replace(/^Sim:\s*/i, "")}`);
      else partes.push("sem outras bancas");
    }
    if (e.allowGenerated?.value === "yes") partes.push(`criadas: ${textoOpcao(e.generatedFormat).toLowerCase()}`);
    else partes.push("só reais");
    partes.push(textoOpcao(e.difficulty).toLowerCase());
    partes.push(textoOpcao(e.order).toLowerCase());
    return partes.filter(Boolean).join(" · ");
  }

  function lerBoards(valor) {
    try { const v = JSON.parse(valor || "[]"); return Array.isArray(v) ? v.filter((b) => b && b.banca) : []; } catch { return []; }
  }
  function nomeCurto(b) {
    if (b.banca !== "CEBRASPE") return b.banca === "DEMAIS BANCAS (QUALQUER OUTRA)" ? "demais bancas" : b.banca;
    return { "Múltipla escolha": "CEBRASPE (alternativas)", "Certo/Errado": "CEBRASPE (C/E)", "Ambos": "CEBRASPE (alternativas e C/E)" }[b.formato] || "CEBRASPE";
  }
  const chaveDe = (b) => (b.banca === "CEBRASPE" ? `CEBRASPE|${b.formato || "Ambos"}` : b.banca);

  // Estado inicial da lista: a lista lembrada; senão, convertida dos campos antigos.
  function listaInicial(form, prefs) {
    const lembrada = lerBoards(prefs?.boards);
    if (lembrada.length) return lembrada;
    const e = form.elements;
    const principal = e.primary?.value === "Outra" ? String(e.otherPrimary?.value || "").trim().toUpperCase() : String(e.primary?.value || "FGV").toUpperCase();
    const lista = [];
    if (principal) lista.push(principal === "CEBRASPE" ? { banca: "CEBRASPE", formato: e.cebraspe?.value || "Ambos" } : { banca: principal });
    const modo = e.supplement?.value || "none";
    if (modo === "cebraspe-mc") lista.push({ banca: "CEBRASPE", formato: "Múltipla escolha" });
    if (modo === "cebraspe-ce") lista.push({ banca: "CEBRASPE", formato: "Certo/Errado" });
    if (modo === "cebraspe-both") lista.push({ banca: "CEBRASPE", formato: "Ambos" });
    if (modo === "ordered") for (const n of [e.first?.value, e.second?.value]) if (String(n || "").trim()) lista.push({ banca: String(n).trim().toUpperCase() });
    const vistos = new Set();
    return lista.filter((b) => !vistos.has(chaveDe(b)) && vistos.add(chaveDe(b)));
  }

  // Campos antigos (ocultos) acompanham a lista, para quem ainda os lê (V621).
  function sincronizarLegado(form, lista) {
    const e = form.elements;
    const primeira = lista[0];
    if (!primeira || !e.primary) return;
    if (PRIMARIAS_DO_SELECT.includes(primeira.banca)) { e.primary.value = primeira.banca; if (e.otherPrimary) e.otherPrimary.value = ""; }
    else { e.primary.value = "Outra"; if (e.otherPrimary) e.otherPrimary.value = primeira.banca; }
    const ceb = lista.find((b) => b.banca === "CEBRASPE");
    if (ceb && e.cebraspe) e.cebraspe.value = ceb.formato || "Ambos";
    if (e.supplement) e.supplement.value = "none";
  }

  function montarBancas(form, grade, prefs) {
    const oculto = document.createElement("input");
    oculto.type = "hidden";
    oculto.name = "boards";
    const bloco = document.createElement("div");
    bloco.className = "qt-bancas-v646";
    bloco.setAttribute("role", "group");
    bloco.setAttribute("aria-label", "Bancas em ordem de prioridade");
    const titulo = document.createElement("strong");
    titulo.textContent = "Bancas, em ordem de prioridade";
    const ajuda = document.createElement("small");
    ajuda.textContent = "Marque as bancas. A 1ª é a principal; as outras só entram se faltar questão, nesta ordem. Use ↑ ↓ para mudar a ordem.";
    const listaEl = document.createElement("ol");
    bloco.append(titulo, ajuda, listaEl, oculto);
    grade.insertBefore(bloco, grade.firstChild);

    let marcadas = listaInicial(form, prefs);
    let outraNome = (marcadas.find((b) => !CATALOGO.some((c) => c.banca === b.banca))?.banca) || "";
    const aviso = (texto) => { const el = form.querySelector("#qtNotice"); if (el) el.textContent = texto; };
    const itemDoCatalogo = (b) => CATALOGO.find((c) => c.banca && chaveDe(c) === chaveDe(b)) || CATALOGO.find((c) => c.id === "outra");
    const gravar = (disparar = true) => {
      oculto.value = JSON.stringify(marcadas.map((b) => (b.banca === "CEBRASPE" ? { banca: b.banca, formato: b.formato || "Ambos" } : { banca: b.banca })));
      sincronizarLegado(form, marcadas);
      if (disparar) form.dispatchEvent(new Event("change", { bubbles: true }));
    };

    function desenhar() {
      listaEl.replaceChildren();
      const ordem = [
        ...marcadas.map((b) => ({ item: itemDoCatalogo(b), b })),
        ...CATALOGO.filter((c) => !marcadas.some((b) => itemDoCatalogo(b) === c)).map((c) => ({ item: c, b: null }))
      ];
      ordem.forEach(({ item, b }, indice) => {
        const li = document.createElement("li");
        if (b) li.className = "marcada";
        const caixa = document.createElement("input");
        caixa.type = "checkbox";
        caixa.checked = Boolean(b);
        caixa.setAttribute("aria-label", item.nome);
        const pos = document.createElement("span");
        pos.className = "pos";
        pos.textContent = b ? `${indice + 1}º` : "";
        const nome = document.createElement("span");
        nome.className = "nome";
        nome.textContent = item.nome;
        li.append(caixa, pos, nome);
        if (item.id === "outra") {
          const campo = document.createElement("input");
          campo.type = "text";
          campo.placeholder = "nome da banca";
          campo.value = outraNome;
          campo.addEventListener("input", () => {
            outraNome = campo.value.trim().toUpperCase();
            const atual = marcadas.findIndex((x) => itemDoCatalogo(x).id === "outra");
            if (atual >= 0 && outraNome) { marcadas[atual] = { banca: outraNome }; gravar(); }
          });
          li.append(campo);
        }
        if (b) {
          const i = marcadas.indexOf(b);
          for (const [rotulo, passo, dica] of [["↑", -1, "Subir"], ["↓", 1, "Descer"]]) {
            const botao = document.createElement("button");
            botao.type = "button";
            botao.textContent = rotulo;
            botao.title = dica;
            botao.setAttribute("aria-label", `${dica} ${item.nome}`);
            botao.disabled = (passo < 0 && i === 0) || (passo > 0 && i === marcadas.length - 1);
            botao.addEventListener("click", () => {
              const j = i + passo;
              [marcadas[i], marcadas[j]] = [marcadas[j], marcadas[i]];
              gravar(); desenhar();
            });
            li.append(botao);
          }
        }
        caixa.addEventListener("change", (event) => {
          event.stopPropagation();
          if (caixa.checked) {
            const nova = item.id === "outra" ? { banca: outraNome } : (item.banca === "CEBRASPE" ? { banca: "CEBRASPE", formato: item.formato } : { banca: item.banca });
            if (!nova.banca) { caixa.checked = false; aviso("Escreva o nome da outra banca antes de marcar."); return; }
            marcadas.push(nova);
          } else {
            if (marcadas.length === 1) { caixa.checked = true; aviso("Deixe ao menos uma banca marcada."); return; }
            marcadas = marcadas.filter((x) => x !== b);
          }
          gravar(); desenhar();
        });
        listaEl.append(li);
      });
    }
    gravar(false);
    desenhar();
    for (const nome of LEGADOS) labelDe(form, nome)?.classList.add("qt-legado-v646");
  }

  function atualizar(form) {
    const criadas = labelDe(form, "generatedFormat");
    if (criadas) criadas.hidden = form.elements.allowGenerated?.value !== "yes";
    const alvo = form.querySelector("[data-v646-resumo]");
    if (alvo) alvo.textContent = resumo(form);
  }

  function estilo() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      #questionTrainingForm[data-v646] > h2 { margin-bottom: 4px; }
      #questionTrainingForm[data-v646] > p:first-of-type { margin-top: 0; color: #b8cadd; }
      #questionTrainingForm .qt-prefs-v646 {
        margin: 14px 0; border: 1px solid rgba(61, 163, 255, .45); border-left: 5px solid #3da3ff;
        border-radius: 14px; background: linear-gradient(145deg, #0d2b45 0%, #061a2d 100%);
      }
      #questionTrainingForm .qt-prefs-v646 > summary {
        display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px;
        padding: 12px 16px; cursor: pointer; list-style: none; color: #f5f9fd; font-weight: 700;
      }
      #questionTrainingForm .qt-prefs-v646 > summary::-webkit-details-marker { display: none; }
      #questionTrainingForm .qt-prefs-v646 > summary::after { content: "Alterar"; margin-left: auto; font-size: .78rem; color: #3da3ff; }
      #questionTrainingForm .qt-prefs-v646[open] > summary::after { content: "Recolher"; }
      #questionTrainingForm .qt-prefs-v646 [data-v646-resumo] { flex: 1 1 100%; font-weight: 400; font-size: .84rem; color: #b8cadd; }
      #questionTrainingForm .qt-prefs-v646 > .qt-fields { padding: 4px 16px 16px; }
      #questionTrainingForm .qt-nota-v646 { font-size: .76rem; color: #b8cadd; line-height: 1.45; }
      #questionTrainingForm [data-qt-close] { display: none !important; }
      #questionTrainingForm label[hidden] { display: none !important; }
      #questionTrainingForm label.qt-legado-v646 { display: none !important; }
      #questionTrainingForm .qt-bancas-v646 { grid-column: 1 / -1; display: grid; gap: 6px; }
      #questionTrainingForm .qt-bancas-v646 > small { color: #b8cadd; font-size: .8rem; }
      #questionTrainingForm .qt-bancas-v646 ol { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 4px; }
      #questionTrainingForm .qt-bancas-v646 li { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border: 1px solid rgba(133,181,220,.18); border-radius: 10px; background: rgba(255,255,255,.02); }
      #questionTrainingForm .qt-bancas-v646 li.marcada { border-color: rgba(54,203,192,.55); background: rgba(54,203,192,.08); }
      #questionTrainingForm .qt-bancas-v646 li input[type=checkbox] { width: 18px; height: 18px; margin: 0; flex: none; }
      #questionTrainingForm .qt-bancas-v646 .pos { min-width: 26px; font-weight: 800; color: #36cbc0; font-size: .82rem; }
      #questionTrainingForm .qt-bancas-v646 .nome { flex: 1 1 auto; color: #f5f9fd; }
      #questionTrainingForm .qt-bancas-v646 li input[type=text] { flex: 1 1 140px; min-width: 0; margin: 0; padding: 4px 8px; }
      #questionTrainingForm .qt-bancas-v646 li button { flex: none; width: 32px; min-width: 0; min-height: 0; height: 30px; margin: 0; padding: 0; border-radius: 8px; }
      #questionTrainingForm .qt-bancas-v646 li button:disabled { opacity: .35; }
    `;
    document.head.appendChild(s);
  }

  function arrumar() {
    const form = document.querySelector("#questionTrainingDialog #questionTrainingForm");
    if (!form || form.dataset.v646) return false;
    form.dataset.v646 = "true";
    estilo();

    // Últimas escolhas: aplicadas antes de reorganizar; o "change" deixa o site
    // e a V621 mostrarem/esconderem os campos que dependem delas.
    if (aplicarPrefs(form, lerPrefs())) {
      form.elements.primary?.dispatchEvent(new Event("change", { bubbles: true }));
      const aviso = form.querySelector("#qtNotice");
      if (aviso) aviso.textContent = "";
    }

    const principais = form.querySelector(".qt-fields");
    if (!principais) return false;
    const cartao = document.createElement("details");
    cartao.className = "qt-prefs-v646";
    const sumario = document.createElement("summary");
    const titulo = document.createElement("span");
    titulo.textContent = "Preferências da busca";
    const linha = document.createElement("span");
    linha.dataset.v646Resumo = "";
    sumario.append(titulo, linha);
    const grade = document.createElement("div");
    grade.className = "qt-fields";
    cartao.append(sumario, grade);
    for (const nome of PREFERENCIAS) {
      const label = labelDe(form, nome);
      if (label && label.parentNode === principais) grade.appendChild(label);
    }
    principais.insertAdjacentElement("afterend", cartao);
    montarBancas(form, grade, lerPrefs());
    // A pasta de destino da V621 fica logo abaixo dos campos principais.
    const destino = form.querySelector("#qtDestinationV621");
    if (destino) principais.insertAdjacentElement("afterend", destino);

    for (const [nome, texto] of Object.entries(TITULOS)) {
      const label = labelDe(form, nome);
      const no = label && [...label.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      if (no) no.textContent = texto;
    }
    const nota = [...form.querySelectorAll(":scope > p")].find((p) => /QConcursos/.test(p.textContent));
    if (nota) nota.classList.add("qt-nota-v646");

    atualizar(form);
    form.addEventListener("change", () => atualizar(form));
    form.addEventListener("input", () => atualizar(form));
    return true;
  }

  function agendar() { for (const ms of [0, 60, 250]) setTimeout(() => { try { arrumar(); } catch (error) { console.error("[Aldus V646]", error); } }, ms); }

  if (typeof document !== "undefined") {
    document.addEventListener("click", (event) => { if (event.target?.closest?.("[data-qt-open],[data-qt-factory]")) agendar(); });
    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (form?.id === "questionTrainingForm") gravarPrefs(form);
    }, true);
    // Observa só a caixa do formulário (o site troca o conteúdo dela a cada
    // abertura) e, até ela existir, só os filhos diretos do <body>.
    if (typeof MutationObserver === "function") {
      let caixaObservada = null;
      const vigiarCaixa = () => {
        const caixa = document.getElementById("questionTrainingDialog");
        if (!caixa || caixa === caixaObservada) return;
        caixaObservada = caixa;
        new MutationObserver(() => agendar()).observe(caixa, { childList: true });
        agendar();
      };
      const iniciar = () => {
        if (!document.body) return;
        vigiarCaixa();
        new MutationObserver(vigiarCaixa).observe(document.body, { childList: true });
      };
      if (document.body) iniciar(); else document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    }
  }

  const api = Object.freeze({ version: VERSION, arrumar, resumo, lerPrefs, gravarPrefs, aplicarPrefs });
  globalThis[KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
