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
  const VERSION = "20260928-rodada-arrumada-v646";
  const KEY = "__ALDUS_QUESTION_TRAINING_FORM_V646__";
  const PREFS_KEY = "aldus:qt:preferencias:v646";
  const STYLE_ID = "questionTrainingFormStyleV646";
  if (globalThis[KEY]) return;

  // Campos lembrados (disciplina e tema não: vêm do assunto clicado).
  const LEMBRAR = ["count", "primary", "otherPrimary", "cebraspe", "supplement", "first", "second", "allowGenerated", "generatedFormat", "difficulty", "order"];
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
    const banca = e.primary?.value === "Outra" ? (e.otherPrimary?.value || "outra banca") : textoOpcao(e.primary);
    partes.push(banca);
    if (visivel(labelDe(form, "cebraspe"))) partes.push(`CEBRASPE: ${textoOpcao(e.cebraspe)}`);
    const sup = e.supplement?.value;
    if (sup && sup !== "none") partes.push(`completa: ${textoOpcao(e.supplement).replace(/^Sim:\s*/i, "")}`);
    else partes.push("sem outras bancas");
    if (e.allowGenerated?.value === "yes") partes.push(`criadas: ${textoOpcao(e.generatedFormat).toLowerCase()}`);
    else partes.push("só reais");
    partes.push(textoOpcao(e.difficulty).toLowerCase());
    partes.push(textoOpcao(e.order).toLowerCase());
    return partes.filter(Boolean).join(" · ");
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
