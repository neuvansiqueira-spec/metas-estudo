(() => {
  "use strict";

  const VERSION = "20260811-gerador-simulados-disciplinas-v311";
  const QUESTION_BANK_SCHEMA = "metas-estudo-question-bank-v1";
  const selectedIds = new Set();
  const selectedDisciplines = new Set();
  const config = {
    banca: "CEBRASPE",
    quantidade: 10,
    dificuldade: "Mista",
    distribuicao: "Equilibrada entre os temas",
    distribuicaoPersonalizada: "",
    comentarios: true,
    fundamentoLegal: true,
    jurisprudencia: true
  };
  let lastPrompt = "";
  let baseRenderFactory = null;

  function text(value) {
    return String(value ?? "").trim();
  }

  function escapeHtml(value) {
    return text(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function canonicalText(value) {
    return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function clampQuestionCount(value) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? Math.min(100, Math.max(1, number)) : 10;
  }

  function bankProfile(banca) {
    const key = text(banca).toUpperCase();
    if (key === "FGV") {
      return {
        banca: "FGV",
        tipo: "Múltipla escolha",
        gabarito: "A, B, C, D ou E",
        alternativas: "Crie exatamente cinco alternativas (A a E), com uma única correta. Use casos práticos, interpretação jurídica, exceções, distinções e distratores plausíveis, sem ambiguidade ou dupla resposta.",
        estilo: "Reproduza o padrão de raciocínio da FGV, com enunciados contextualizados e alternativas próximas, sem copiar questões existentes nem atribuir falsamente a questão à banca."
      };
    }
    if (key === "AOCP") {
      return {
        banca: "AOCP",
        tipo: "Múltipla escolha",
        gabarito: "A, B, C, D ou E",
        alternativas: "Crie exatamente cinco alternativas (A a E), com uma única correta. Combine literalidade legal, domínio conceitual e aplicação objetiva, mantendo redação clara e distratores tecnicamente plausíveis.",
        estilo: "Reproduza o padrão de cobrança da AOCP, sem copiar questões existentes nem atribuir falsamente a questão à banca."
      };
    }
    return {
      banca: "CEBRASPE",
      tipo: "Certo/Errado",
      gabarito: "C ou E",
      alternativas: "Não crie alternativas. Cada item deve conter uma única proposição julgável como CERTA ou ERRADA. Varie equilibradamente os gabaritos e evite tornar a resposta previsível pela redação.",
      estilo: "Reproduza o padrão de precisão do CEBRASPE, explorando literalidade, finalidade, exceções, jurisprudência e inversões conceituais, sem copiar questões existentes nem atribuir falsamente o item à banca."
    };
  }

  function themeLine(item, index) {
    const subthemes = Array.isArray(item.editalSubtemas) ? item.editalSubtemas.filter(Boolean).join("; ") : text(item.subtema || item.subtheme);
    const source = typeof factorySourceFolderLink === "function" ? factorySourceFolderLink(item) : text(item.sourceFolder || item.factorySourceFolder);
    return `${index + 1}. DISCIPLINA: ${text(item.disciplina) || "Não informada"}\n   TEMA: ${text(item.tema) || "Não informado"}\n   SUBTEMAS/RECORTE: ${subthemes || "Usar somente o recorte do tema indicado"}\n   FONTES: ${source || "Utilizar somente as fontes fornecidas pelo usuário durante a execução"}`;
  }

  function buildPrompt(nextConfig = {}, items = []) {
    const normalizedItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!normalizedItems.length) throw new Error("Selecione pelo menos um tema para gerar o simulado.");
    const options = { ...config, ...nextConfig };
    const profile = bankProfile(options.banca);
    const amount = clampQuestionCount(options.quantidade);
    const customDistribution = text(options.distribuicaoPersonalizada);
    const distribution = customDistribution || text(options.distribuicao) || "Equilibrada entre os temas";
    const commentsRule = options.comentarios
      ? "Inclua comentário didático e justificativa individual após definir o gabarito, explicando também por que os distratores estão errados nas questões de múltipla escolha."
      : "Mantenha os campos comentario e justificativa como strings vazias, sem comentários adicionais.";
    const lawRule = options.fundamentoLegal
      ? "Inclua fundamento legal específico e atualizado quando a questão depender de lei, indicando o diploma e o dispositivo aplicável."
      : "Não acrescente fundamento legal além do que estiver expressamente nas fontes.";
    const precedentRule = options.jurisprudencia
      ? "Quando houver cobrança jurisprudencial, use somente entendimento seguro e identificável, informando tribunal, precedente ou enunciado e ano. Não invente número de processo, tese, súmula ou julgamento."
      : "Não crie questões cuja resposta dependa de jurisprudência não fornecida nas fontes.";
    const themes = normalizedItems.map(themeLine).join("\n\n");
    const alternativesExample = profile.tipo === "Certo/Errado"
      ? '"alternativas": {}'
      : '"alternativas": {"A": "texto", "B": "texto", "C": "texto", "D": "texto", "E": "texto"}';

    return `Você é um elaborador e revisor especializado em questões para concursos jurídicos de alto nível.

OBJETIVO
Crie um simulado INÉDITO com exatamente ${amount} questões no estilo ${profile.banca}, cobrindo somente os temas e recortes indicados abaixo.

CONFIGURAÇÕES
- Banca simulada: ${profile.banca}
- Formato: ${profile.tipo}
- Quantidade exata: ${amount}
- Dificuldade: ${text(options.dificuldade) || "Mista"}
- Distribuição: ${distribution}
- Público: concursos jurídicos, com prioridade para o cargo de Delegado de Polícia quando o conteúdo permitir

TEMAS SELECIONADOS
${themes}

PADRÃO DA BANCA
${profile.estilo}
${profile.alternativas}

REGRAS DE CONTEÚDO E SEGURANÇA JURÍDICA
1. Use prioritariamente as fontes indicadas para cada tema e respeite rigorosamente o recorte selecionado.
2. Não invente lei, artigo, prazo, competência, exceção, tese, precedente, súmula, número de processo ou entendimento jurisprudencial.
3. Se uma informação necessária não puder ser confirmada nas fontes disponíveis, não formule questão dependente dessa informação.
4. Não copie questão real. Produza conteúdo inédito apenas inspirado no modo de cobrança da banca.
5. Cada questão deve possuir uma única resposta defensável e não pode depender de opinião doutrinária controvertida sem indicar a corrente adotada.
6. Evite repetição de enunciados, fundamentos, gabaritos em sequência previsível e cobrança superficial do mesmo ponto.
7. ${commentsRule}
8. ${lawRule}
9. ${precedentRule}

FORMATO OBRIGATÓRIO DE ENTREGA
Entregue somente JSON válido, sem texto introdutório, sem conclusão e sem cercas de Markdown. O arquivo deve ser diretamente importável no Banco de Questões do Aldus Meta.

Use exatamente esta estrutura:
{
  "schema": "${QUESTION_BANK_SCHEMA}",
  "metadata": {
    "titulo": "Simulado temático ${profile.banca}",
    "banca": "${profile.banca}",
    "origem": "simulado-inédito-gerado",
    "quantidade": ${amount},
    "dificuldade": "${text(options.dificuldade) || "Mista"}",
    "regra_pontuacao": "${profile.banca === "CEBRASPE" ? "+1 acerto, -1 erro e 0 em branco, salvo regra diferente do edital" : "1 ponto por acerto e 0 por erro ou branco, salvo regra diferente do edital"}"
  },
  "questionBank": [
    {
      "id": "SIM-${profile.banca}-001",
      "disciplina": "disciplina exata",
      "assunto": "assunto principal",
      "tema": "tema específico",
      "banca": "${profile.banca}",
      "tipo": "${profile.tipo}",
      "enunciado": "enunciado completo",
      ${alternativesExample},
      "gabarito": "${profile.gabarito}",
      "comentario": "comentário conforme as configurações",
      "justificativa": "justificativa conforme as configurações",
      "fundamento": "lei, dispositivo ou precedente efetivamente utilizado",
      "tags": ["simulado inédito", "${profile.banca}", "tema específico"]
    }
  ]
}

VALIDAÇÃO FINAL OBRIGATÓRIA
- Confirme internamente que existem exatamente ${amount} objetos em questionBank.
- Confirme que todos os IDs são únicos e sequenciais.
- Confirme que o gabarito usa somente ${profile.gabarito}.
- Confirme que cada questão está vinculada a um dos temas selecionados.
- Confirme a validade sintática do JSON.
- Não inclua resposta_marcada, resultado, acertou ou qualquer campo que registre desempenho antes de o usuário responder.
- Não apresente esta validação; entregue somente o JSON final.`;
  }

  function agenda() {
    if (typeof ensureFactoryAgenda !== "function") return [];
    return ensureFactoryAgenda();
  }

  function findItem(id) {
    return agenda().find((item) => text(item.id) === text(id));
  }

  function selectedItems() {
    const byId = new Map(agenda().map((item) => [text(item.id), item]));
    for (const id of [...selectedIds]) if (!byId.has(id)) selectedIds.delete(id);
    return [...selectedIds].map((id) => byId.get(id)).filter(Boolean);
  }

  function disciplineKey(value) {
    return canonicalText(value);
  }

  function listDisciplines(items = agenda()) {
    const disciplines = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const label = text(item?.disciplina) || "Sem disciplina";
      const key = disciplineKey(label);
      if (key && !disciplines.has(key)) disciplines.set(key, label);
    }
    return [...disciplines].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }

  function filterThemesByDisciplines(items, disciplines = selectedDisciplines) {
    const source = Array.isArray(items) ? items : [];
    const active = new Set([...disciplines].map(disciplineKey).filter(Boolean));
    if (!active.size) return source;
    return source.filter((item) => active.has(disciplineKey(text(item?.disciplina) || "Sem disciplina")));
  }

  function disciplineSelectorHtml() {
    const disciplines = listDisciplines();
    const selectedCount = selectedDisciplines.size;
    if (!disciplines.length) return '<p class="factory-simulado-empty">Nenhuma disciplina cadastrada.</p>';
    return `<fieldset class="factory-simulado-disciplines">
      <legend>Disciplinas <span>${selectedCount || "Todas"}</span></legend>
      <p class="item-meta">Escolha uma ou várias. Sem marcação, serão pesquisadas todas as disciplinas.</p>
      <div class="factory-simulado-discipline-list">${disciplines.map(({ key, label }) => `<label><input type="checkbox" data-factory-simulado-discipline="${escapeHtml(key)}" ${selectedDisciplines.has(key) ? "checked" : ""} /><span>${escapeHtml(label)}</span></label>`).join("")}</div>
      ${selectedCount ? '<button type="button" class="secondary-button" data-factory-simulado-disciplines-clear>Usar todas as disciplinas</button>' : ""}
    </fieldset>`;
  }

  function selectedThemeHtml(items) {
    if (!items.length) return '<p class="factory-simulado-empty">Nenhum tema selecionado. Pesquise abaixo ou use “Criar simulado deste tema”.</p>';
    return `<div class="factory-simulado-chips">${items.map((item) => `<span class="factory-simulado-chip"><span><strong>${escapeHtml(item.tema || "Tema")}</strong><small>${escapeHtml(item.disciplina || "Sem disciplina")}</small></span><button type="button" data-factory-simulado-remove="${escapeHtml(item.id)}" aria-label="Remover ${escapeHtml(item.tema || "tema")}">×</button></span>`).join("")}</div>`;
  }

  function builderHtml() {
    const items = selectedItems();
    const output = lastPrompt
      ? `<div class="factory-simulado-output"><h4>Prompt pronto</h4><textarea readonly rows="18" data-factory-simulado-output>${escapeHtml(lastPrompt)}</textarea><div class="card-actions"><button type="button" data-factory-simulado-copy>Copiar prompt</button><span class="item-meta" data-factory-simulado-message aria-live="polite"></span></div></div>`
      : "";
    return `<details id="factorySimuladoBuilderV310" class="factory-section factory-simulado-builder factory-collapsible" open>
      <summary>GERADOR DE SIMULADOS <small>CEBRASPE • FGV • AOCP</small></summary>
      <div class="factory-collapsible-content">
        <p class="notice">Crie um prompt para um tema específico ou combine vários temas. O resultado será solicitado em JSON compatível com o Banco de Questões.</p>
        ${disciplineSelectorHtml()}
        <div class="factory-simulado-selected"><div class="factory-simulado-title-row"><h4>Temas selecionados <span>${items.length}</span></h4>${items.length ? '<button type="button" class="secondary-button" data-factory-simulado-clear>Limpar seleção</button>' : ""}</div>${selectedThemeHtml(items)}</div>
        <div class="factory-simulado-search-box"><label for="factorySimuladoSearchV310">Adicionar tema</label><input id="factorySimuladoSearchV310" type="search" data-factory-simulado-search placeholder="Digite o nome do tema" autocomplete="off" /><div class="factory-simulado-suggestions" data-factory-simulado-suggestions></div></div>
        <div class="factory-simulado-grid">
          <label>Banca<select data-factory-simulado-config="banca"><option ${config.banca === "CEBRASPE" ? "selected" : ""}>CEBRASPE</option><option ${config.banca === "FGV" ? "selected" : ""}>FGV</option><option ${config.banca === "AOCP" ? "selected" : ""}>AOCP</option></select></label>
          <label>Quantidade de questões<input type="number" min="1" max="100" inputmode="numeric" value="${config.quantidade}" data-factory-simulado-config="quantidade" /></label>
          <label>Dificuldade<select data-factory-simulado-config="dificuldade"><option ${config.dificuldade === "Mista" ? "selected" : ""}>Mista</option><option ${config.dificuldade === "Básica" ? "selected" : ""}>Básica</option><option ${config.dificuldade === "Intermediária" ? "selected" : ""}>Intermediária</option><option ${config.dificuldade === "Avançada" ? "selected" : ""}>Avançada</option></select></label>
          <label>Distribuição<select data-factory-simulado-config="distribuicao"><option ${config.distribuicao === "Equilibrada entre os temas" ? "selected" : ""}>Equilibrada entre os temas</option><option ${config.distribuicao === "Proporcional à prioridade dos temas" ? "selected" : ""}>Proporcional à prioridade dos temas</option><option ${config.distribuicao === "Aleatória e equilibrada" ? "selected" : ""}>Aleatória e equilibrada</option></select></label>
          <label class="wide">Distribuição personalizada (opcional)<input type="text" value="${escapeHtml(config.distribuicaoPersonalizada)}" data-factory-simulado-config="distribuicaoPersonalizada" placeholder="Ex.: 6 questões de Penal e 4 de Processo Penal" /></label>
        </div>
        <fieldset class="factory-simulado-options"><legend>Conteúdo do gabarito</legend>
          <label><input type="checkbox" data-factory-simulado-config="comentarios" ${config.comentarios ? "checked" : ""} /> Comentários e justificativas</label>
          <label><input type="checkbox" data-factory-simulado-config="fundamentoLegal" ${config.fundamentoLegal ? "checked" : ""} /> Fundamento legal</label>
          <label><input type="checkbox" data-factory-simulado-config="jurisprudencia" ${config.jurisprudencia ? "checked" : ""} /> Jurisprudência, quando pertinente</label>
        </fieldset>
        <div class="card-actions"><button type="button" data-factory-simulado-generate ${items.length ? "" : "disabled"}>Gerar prompt do simulado</button></div>
        ${output}
      </div>
    </details>`;
  }

  function mountBuilder() {
    if (typeof document === "undefined") return;
    const container = document.getElementById("factoryList");
    if (!container) return;
    const current = document.getElementById("factorySimuladoBuilderV310");
    if (current) current.remove();
    container.insertAdjacentHTML("afterbegin", builderHtml());

    container.querySelectorAll("[data-factory-card]").forEach((card) => {
      const id = text(card.dataset.factoryCard);
      const actions = card.querySelector(".factory-prompt-actions .card-actions");
      if (!id || !actions || actions.querySelector("[data-factory-simulado-single]")) return;
      actions.insertAdjacentHTML("beforeend", `<button type="button" class="secondary-button factory-simulado-single" data-factory-simulado-single="${escapeHtml(id)}">Criar simulado deste tema</button>`);
    });
  }

  function renderSuggestions(query) {
    const panel = document.querySelector("[data-factory-simulado-suggestions]");
    if (!panel) return;
    const needle = canonicalText(query);
    if (needle.length < 2) {
      panel.innerHTML = "";
      panel.hidden = true;
      return;
    }
    const matches = filterThemesByDisciplines(agenda())
      .filter((item) => !selectedIds.has(text(item.id)) && canonicalText(`${item.disciplina} ${item.tema} ${(item.editalSubtemas || []).join(" ")}`).includes(needle))
      .slice(0, 12);
    panel.innerHTML = matches.length
      ? matches.map((item) => `<button type="button" data-factory-simulado-add="${escapeHtml(item.id)}"><strong>${escapeHtml(item.tema || "Tema")}</strong><span>${escapeHtml(item.disciplina || "Sem disciplina")}</span></button>`).join("")
      : '<p class="item-meta">Nenhum tema encontrado.</p>';
    panel.hidden = false;
  }

  async function copyPrompt() {
    const message = document.querySelector("[data-factory-simulado-message]");
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(lastPrompt);
      else {
        const area = document.querySelector("[data-factory-simulado-output]");
        area?.select();
        if (!document.execCommand("copy")) throw new Error("copy indisponível");
      }
      if (message) message.textContent = "Prompt copiado.";
    } catch (_error) {
      if (message) message.textContent = "Não foi possível copiar automaticamente. Selecione o texto acima.";
    }
  }

  function scrollToBuilder() {
    document.getElementById("factorySimuladoBuilderV310")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleClick(event) {
    const target = event.target.closest?.("button");
    if (!target) return;
    const single = target.closest("[data-factory-simulado-single]");
    if (single) {
      event.preventDefault();
      selectedIds.clear();
      selectedIds.add(text(single.dataset.factorySimuladoSingle));
      lastPrompt = "";
      mountBuilder();
      scrollToBuilder();
      return;
    }
    const add = target.closest("[data-factory-simulado-add]");
    if (add) {
      event.preventDefault();
      selectedIds.add(text(add.dataset.factorySimuladoAdd));
      lastPrompt = "";
      mountBuilder();
      document.querySelector("[data-factory-simulado-search]")?.focus();
      return;
    }
    const remove = target.closest("[data-factory-simulado-remove]");
    if (remove) {
      event.preventDefault();
      selectedIds.delete(text(remove.dataset.factorySimuladoRemove));
      lastPrompt = "";
      mountBuilder();
      return;
    }
    if (target.closest("[data-factory-simulado-clear]")) {
      event.preventDefault();
      selectedIds.clear();
      lastPrompt = "";
      mountBuilder();
      return;
    }
    if (target.closest("[data-factory-simulado-disciplines-clear]")) {
      event.preventDefault();
      selectedDisciplines.clear();
      lastPrompt = "";
      mountBuilder();
      document.querySelector("[data-factory-simulado-search]")?.focus();
      return;
    }
    if (target.closest("[data-factory-simulado-generate]")) {
      event.preventDefault();
      try {
        lastPrompt = buildPrompt(config, selectedItems());
        mountBuilder();
        scrollToBuilder();
      } catch (error) {
        window.alert(error.message || "Não foi possível gerar o prompt.");
      }
      return;
    }
    if (target.closest("[data-factory-simulado-copy]")) {
      event.preventDefault();
      copyPrompt();
    }
  }

  function handleInput(event) {
    const discipline = event.target.closest?.("[data-factory-simulado-discipline]");
    if (discipline) {
      const key = disciplineKey(discipline.dataset.factorySimuladoDiscipline);
      if (discipline.checked) selectedDisciplines.add(key);
      else selectedDisciplines.delete(key);
      lastPrompt = "";
      mountBuilder();
      return;
    }
    const search = event.target.closest?.("[data-factory-simulado-search]");
    if (search) {
      renderSuggestions(search.value);
      return;
    }
    const field = event.target.closest?.("[data-factory-simulado-config]");
    if (!field) return;
    const key = field.dataset.factorySimuladoConfig;
    if (field.type === "checkbox") config[key] = field.checked;
    else if (key === "quantidade") config[key] = clampQuestionCount(field.value);
    else config[key] = field.value;
    lastPrompt = "";
  }

  function installStylesheet() {
    if (typeof document === "undefined" || document.getElementById("aldusFactorySimuladoStylesV310")) return;
    const link = document.createElement("link");
    link.id = "aldusFactorySimuladoStylesV310";
    link.rel = "stylesheet";
    link.href = "factory-simulado-prompt-v310.css?v=20260811-gerador-simulados-disciplinas-v311";
    (document.head || document.documentElement).appendChild(link);
  }

  function initBrowser() {
    if (typeof document === "undefined" || globalThis.__ALDUS_FACTORY_SIMULADO_V310_BROWSER__) return;
    globalThis.__ALDUS_FACTORY_SIMULADO_V310_BROWSER__ = true;
    installStylesheet();
    document.addEventListener("click", handleClick);
    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleInput);
    if (typeof renderFactory === "function") {
      baseRenderFactory = renderFactory;
      renderFactory = function renderFactoryWithSimuladoV310(...args) {
        const result = baseRenderFactory.apply(this, args);
        mountBuilder();
        return result;
      };
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountBuilder, { once: true });
    else mountBuilder();
  }

  globalThis.__ALDUS_FACTORY_SIMULADO_V310__ = Object.freeze({
    version: VERSION,
    schema: QUESTION_BANK_SCHEMA,
    bankProfile,
    buildPrompt,
    clampQuestionCount,
    listDisciplines,
    filterThemesByDisciplines
  });
  initBrowser();
})();
