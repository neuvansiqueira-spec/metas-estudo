/* Melhorias do Treino de Questões da Fábrica — v621.2. */
(() => {
  "use strict";

  const VERSION = "20260914-treino-fabrica-decisao-conversa-v621-2";
  const FLAG = "__ALDUS_QUESTION_TRAINING_FACTORY_V621__";
  const PROMPT_MARK = "__aldusQuestionTrainingPromptV621";
  const TEMPLATE_MARK = "__aldusQuestionTrainingTemplateV621";
  let lastGenerated = null;
  let pendingFactoryId = "";

  if (globalThis[FLAG]) {
    try { globalThis[FLAG].install?.(); } catch { /* já instalado */ }
    return;
  }

  const text = (value) => String(value ?? "").trim();
  const canon = (value) => text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  function currentState() {
    try {
      // eslint-disable-next-line no-undef
      if (typeof state !== "undefined" && state) return state;
    } catch { /* usa fallback */ }
    return globalThis.state || null;
  }

  function agenda(targetState = currentState()) {
    if (Array.isArray(targetState?.factoryAgenda) && targetState.factoryAgenda.length) return targetState.factoryAgenda;
    return Array.isArray(targetState?.factoryItems) ? targetState.factoryItems : [];
  }

  function destinationOf(item = {}) {
    return text(
      item.factoryDestinationFolder || item.pastaDestinoWordPdf || item.destinationFolder ||
      item.finalFilesFolder || item.destinationFolderUrl || item.pastaDestino || item.folderUrl
    );
  }

  function topicOf(item = {}) {
    return {
      discipline: text(item.discipline || item.disciplina || item.materia || item.editalLink?.discipline || item.editalVinculo?.discipline),
      theme: text(item.theme || item.tema || item.subject || item.assunto || item.topic || item.topico || item.editalLink?.subject || item.editalVinculo?.subject),
      syllabusItemId: text(item.syllabusItemId || item.editalLink?.syllabusItemId || item.editalVinculo?.syllabusItemId)
    };
  }

  function findFactoryItem({ id = "", discipline = "", theme = "", syllabusItemId = "" } = {}, targetState = currentState()) {
    const items = agenda(targetState);
    if (id) {
      const exactId = items.find((item) => text(item?.id) === text(id));
      if (exactId) return exactId;
    }
    if (syllabusItemId) {
      const exactSyllabus = items.find((item) => topicOf(item).syllabusItemId === text(syllabusItemId));
      if (exactSyllabus) return exactSyllabus;
    }
    const d = canon(discipline), t = canon(theme);
    if (!d || !t) return null;
    return items.find((item) => {
      const topic = topicOf(item);
      return canon(topic.discipline) === d && canon(topic.theme) === t;
    }) || null;
  }

  function destinationFor(config = {}, targetState = currentState()) {
    const direct = text(
      config.destinationFolder || config.factoryDestinationFolder || config.pastaDestinoWordPdf ||
      config.destinationFolderUrl || config.pastaDestino || config.folderUrl
    );
    if (direct) return direct;
    return destinationOf(findFactoryItem({
      id: config.factoryItemId,
      discipline: config.discipline || config.disciplina,
      theme: config.theme || config.tema || config.subject || config.assunto,
      syllabusItemId: config.syllabusItemId
    }, targetState) || {});
  }

  function safeFilePart(value, fallback) {
    const cleaned = text(value || fallback)
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .trim();
    return (cleaned || fallback).toLocaleUpperCase("pt-BR").slice(0, 110);
  }

  function baseName(discipline, theme) {
    return `TREINO_${safeFilePart(discipline, "DISCIPLINA")}_${safeFilePart(theme, "MISTO")}`;
  }

  function questionsOf(payload = {}) {
    return Array.isArray(payload) ? payload : (payload.questionBank || payload.questoes || payload.questions || payload.items || []);
  }

  function roundOf(payload = {}) {
    return payload.trainingRound || payload.metadata?.trainingRound || {};
  }

  function augmentInstruction(result, rawConfig, targetState) {
    const config = result?.config || rawConfig || {};
    const destinationFolder = destinationFor({ ...rawConfig, ...config }, targetState);
    const base = baseName(config.discipline || rawConfig.discipline, config.theme || rawConfig.theme);
    if (result?.config) {
      result.config.destinationFolder = destinationFolder;
      result.config.outputBaseName = base;
    }
    const round = result?.metadata?.trainingRound;
    if (round) {
      round.destinationFolder = destinationFolder;
      round.outputBaseName = base;
      round.config ||= {};
      round.config.destinationFolder = destinationFolder;
      round.config.outputBaseName = base;
      if ("searchAudit" in round) delete round.searchAudit;
    }

    const folderText = destinationFolder || "NÃO IDENTIFICADA. Não invente pasta nem diga que salvou no Drive.";
    const critical = `# REGRAS CRÍTICAS DESTA RODADA — CUMPRIMENTO OBRIGATÓRIO
NOME BASE DOS ARQUIVOS: ${base}
PASTA DE DESTINO DO TEMA/DISCIPLINA NO GOOGLE DRIVE: ${folderText}

# ARQUIVAMENTO DO TREINO
- O HTML final deve se chamar ${base}.html e o JSON completo deve se chamar ${base}.json.
- Se a pasta de destino acima estiver preenchida E você tiver ferramenta autorizada para gravação no Google Drive, salve DIRETAMENTE os dois arquivos nessa pasta. Não salve em pasta genérica, raiz ou pasta de outra disciplina/tema.
- Se não houver ferramenta de gravação autorizada, entregue os arquivos para download e informe objetivamente que não foi possível gravá-los no Drive. Nunca alegue salvamento que não ocorreu.

# PORTÃO QCONCURSOS — ANTES DE QUALQUER QUESTÃO AUTORAL
1. Pesquise PRIMEIRO no QConcursos a banca principal, disciplina e tema desta rodada. Percorra múltiplas páginas/resultados e abra as páginas individuais necessárias para confirmar íntegra, metadados e gabarito.
2. Enquanto existir questão REAL válida do QConcursos que atenda aos filtros e não esteja nas exclusões, é PROIBIDO criar questão autoral para ocupar a vaga.
3. Se encontrar quantidade suficiente de questões reais, gere o treino normalmente apenas com elas.
4. Se encontrar MENOS questões reais do que a quantidade solicitada, NÃO crie ainda nenhuma questão autoral. Informe na CONVERSA, de forma objetiva: quantas questões reais válidas foram encontradas, quantas faltam para completar o treino e quais bancas/filtros foram pesquisados. Em seguida, PARE e aguarde decisão expressa do usuário sobre completar ou não o déficit com questões autorais.
5. Somente depois de o usuário autorizar expressamente na conversa, complete apenas o número faltante com questões autorais, se isso também estiver permitido pela configuração da rodada.
6. Falha de acesso, login ausente, bloqueio, timeout, dificuldade de pesquisa ou limite de ferramenta NÃO provam inexistência de questões. Nesses casos, informe a limitação na conversa e PARE; NÃO complete automaticamente com autorais.
7. NÃO registre auditoria de busca no JSON. O JSON deve conter somente os dados normais do treino e das questões. A decisão sobre eventual complementação autoral pertence à conversa com o usuário.`;

    result.instruction = `${critical}\n\n${result.instruction}`;
    result.destinationFolder = destinationFolder;
    result.outputBaseName = base;
    return result;
  }

  /* Mantido apenas como utilitário legado para compatibilidade de testes antigos.
     Não é chamado pela validação/importação e não exige auditoria no JSON. */
  function validateSearchAudit(payload) {
    const questions = questionsOf(payload);
    const authorial = questions.filter((q) => q?.origem_tipo === "autoral");
    if (!authorial.length) return;
    const round = roundOf(payload);
    const audit = round.searchAudit || payload.searchAudit || payload.metadata?.searchAudit;
    if (!audit || audit.qconcursosSearched !== true) {
      throw new Error("Questões autorais bloqueadas: falta auditoria obrigatória da busca no QConcursos.");
    }
    if (audit.accessIssue === true) {
      throw new Error("Questões autorais bloqueadas: impedimento de acesso ao QConcursos não autoriza completar com questões criadas pelo agente.");
    }
    if (!Array.isArray(audit.queries) || audit.queries.filter(text).length === 0 || Number(audit.pagesChecked || 0) < 2) {
      throw new Error("Questões autorais bloqueadas: registre as consultas e ao menos duas páginas/resultados efetivamente pesquisados no QConcursos.");
    }
    const real = questions.filter((q) => q?.origem_tipo === "qconcursos");
    const deficit = Number(audit.deficitAfterRealSearch);
    if (!Number.isFinite(deficit) || deficit <= 0 || authorial.length > deficit) {
      throw new Error("Questões autorais bloqueadas: o déficit após a busca real não comprova a quantidade autoral entregue.");
    }
    if (real.length && (!Array.isArray(audit.realUsedIds) || audit.realUsedIds.filter(text).length < real.length)) {
      throw new Error("Questões autorais bloqueadas: a auditoria não lista todos os códigos Q reais usados.");
    }
    const found = Number(audit.realCandidatesFound || 0);
    const rejected = Array.isArray(audit.rejectedCandidates) ? audit.rejectedCandidates : [];
    if (found > real.length + rejected.length) {
      throw new Error("Questões autorais bloqueadas: há candidatas reais encontradas sem uso nem motivo de descarte.");
    }
    if (!real.length) {
      if (audit.verifiedZeroResults !== true) {
        throw new Error("Treino 100% autoral bloqueado: é necessária confirmação explícita de zero questão real válida encontrada.");
      }
      if (!Array.isArray(audit.evidence) || audit.evidence.filter(text).length < 2) {
        throw new Error("Treino 100% autoral bloqueado: registre evidências de pelo menos duas buscas/páginas do QConcursos.");
      }
    }
  }

  function installApi() {
    const api = globalThis.AldusQuestionTraining;
    if (!api) return false;
    if (typeof api.prompt === "function" && !api.prompt[PROMPT_MARK]) {
      const originalPrompt = api.prompt;
      const wrappedPrompt = function promptV621(config = {}, targetState = currentState(), roundId) {
        const result = originalPrompt.call(this, config, targetState, roundId);
        lastGenerated = augmentInstruction(result, config, targetState);
        return result;
      };
      Object.defineProperty(wrappedPrompt, PROMPT_MARK, { value: true });
      api.prompt = wrappedPrompt;
    }
    return true;
  }

  function installTemplate() {
    const template = globalThis.AldusTrainingTemplate;
    if (!template || typeof template.buildHTML !== "function" || template.buildHTML[TEMPLATE_MARK]) return Boolean(template);
    const originalBuild = template.buildHTML;
    const wrappedBuild = function buildHTMLV621(payload) {
      const html = originalBuild.call(this, payload);
      const round = roundOf(payload);
      const base = text(round.outputBaseName) || baseName(round.discipline, round.theme);
      return html.replace("a.download='treino-questoes.json';", `a.download=${JSON.stringify(`${base}.json`)};`);
    };
    Object.defineProperty(wrappedBuild, TEMPLATE_MARK, { value: true });
    template.buildHTML = wrappedBuild;
    return true;
  }

  function install() {
    const a = installApi();
    const b = installTemplate();
    return a || b;
  }

  function syncCebraspe(form) {
    const select = form?.elements?.cebraspe;
    if (!select) return;
    const active = text(form.elements.primary?.value).toUpperCase() === "CEBRASPE";
    select.disabled = !active;
    const label = select.closest?.("label");
    if (label) {
      label.hidden = !active;
      label.setAttribute("aria-hidden", String(!active));
    }
  }

  function ensureHidden(form, name, value) {
    let input = form.querySelector?.(`input[name="${name}"]`);
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.append(input);
    }
    input.value = text(value);
    return input;
  }

  function formContext(form) {
    const targetState = currentState();
    const dialog = form?.closest?.("#questionTrainingDialog");
    const item = findFactoryItem({
      id: dialog?.dataset?.factoryItemId || pendingFactoryId,
      discipline: form?.elements?.discipline?.value,
      theme: form?.elements?.theme?.value,
      syllabusItemId: form?.dataset?.syllabusId
    }, targetState);
    const destinationFolder = destinationOf(item || {});
    const discipline = text(form?.elements?.discipline?.value);
    const theme = text(form?.elements?.theme?.value);
    const base = baseName(discipline, theme);
    ensureHidden(form, "destinationFolder", destinationFolder);
    ensureHidden(form, "factoryItemId", item?.id || "");
    form.dataset.qtOutputBase = base;
    form.dataset.qtDestination = destinationFolder;
    return { item, destinationFolder, discipline, theme, base };
  }

  function renderDestination(form) {
    const context = formContext(form);
    let box = form.querySelector("#qtDestinationV621");
    if (!box) {
      box = document.createElement("p");
      box.id = "qtDestinationV621";
      box.style.whiteSpace = "normal";
      const fields = form.querySelector(".qt-fields");
      (fields || form).insertAdjacentElement?.("afterend", box);
      if (!box.isConnected) form.append(box);
    }
    box.replaceChildren();
    if (context.destinationFolder) {
      box.append(document.createTextNode("Pasta de destino deste treino: "));
      const link = document.createElement("a");
      link.href = context.destinationFolder;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = context.destinationFolder;
      box.append(link);
    } else {
      box.textContent = "Pasta de destino deste treino: não identificada para a disciplina/tema selecionados.";
    }
    return context;
  }

  function decorateDialog() {
    install();
    const dialog = document.getElementById("questionTrainingDialog");
    const form = dialog?.querySelector("#questionTrainingForm");
    if (!form) return;
    if (pendingFactoryId) dialog.dataset.factoryItemId = pendingFactoryId;
    syncCebraspe(form);
    renderDestination(form);
  }

  function download(name, content, type = "text/plain;charset=utf-8") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url); }, 2500);
  }

  function exclusionPayload(targetState) {
    return lastGenerated?.excluded || globalThis.AldusQuestionTraining?.exclusions?.(targetState) || { ids: [], questions: [] };
  }

  function decorateOutput(form) {
    const context = formContext(form);
    const output = form.querySelector("#qtOutput");
    if (!output || !output.children.length) return;
    let note = output.querySelector("#qtFileNamesV621");
    if (!note) {
      note = document.createElement("p");
      note.id = "qtFileNamesV621";
      output.prepend(note);
    }
    note.textContent = `Nome da rodada: ${context.base} — prompt, exclusões, modelo, HTML final e JSON usarão este nome-base.`;
  }

  function stop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  async function handleAction(event, button) {
    const form = button.closest("#questionTrainingForm");
    if (!form) return false;
    const context = formContext(form);
    const promptText = form.querySelector("#qtPromptText")?.value || "";
    const excluded = exclusionPayload(currentState());
    const excludedText = JSON.stringify(excluded, null, 2);
    const notice = form.querySelector("#qtNotice");

    if (button.id === "qtDownload") {
      stop(event);
      download(`${context.base}.txt`, promptText);
      if (excludedText.length > 18000) download(`${context.base}_EXCLUSOES.json`, excludedText, "application/json;charset=utf-8");
      if (notice) notice.textContent = `Prompt baixado como ${context.base}.txt.`;
      return true;
    }
    if (button.id === "qtExclusions") {
      stop(event);
      download(`${context.base}_EXCLUSOES.json`, excludedText, "application/json;charset=utf-8");
      if (notice) notice.textContent = `Histórico baixado como ${context.base}_EXCLUSOES.json.`;
      return true;
    }
    if (button.id === "qtTemplate") {
      stop(event);
      const metadata = lastGenerated?.metadata || { schema: globalThis.AldusQuestionTraining?.SCHEMA, trainingRound: { discipline: context.discipline, theme: context.theme, outputBaseName: context.base, destinationFolder: context.destinationFolder } };
      const html = globalThis.AldusTrainingTemplate?.buildHTML?.({ ...metadata, questionBank: [] }) || "";
      download(`${context.base}_MODELO.html`, html, "text/html;charset=utf-8");
      if (notice) notice.textContent = `Modelo baixado como ${context.base}_MODELO.html.`;
      return true;
    }
    if (button.id === "qtCopy") {
      stop(event);
      try {
        await navigator.clipboard.writeText(promptText);
        if (notice) notice.textContent = excludedText.length > 18000 ? "Prompt copiado. O histórico de exclusões nomeado também foi baixado." : "Prompt copiado. Cole no agente para gerar o treino.";
      } catch {
        form.querySelector("#qtPromptText")?.select?.();
        if (notice) notice.textContent = "Selecionei o prompt. Use Ctrl+C para copiar.";
      }
      if (excludedText.length > 18000) download(`${context.base}_EXCLUSOES.json`, excludedText, "application/json;charset=utf-8");
      return true;
    }
    return false;
  }

  const api = Object.freeze({ version: VERSION, install, destinationFor, baseName, validateSearchAudit, findFactoryItem });
  globalThis[FLAG] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  install();
  if (typeof document === "undefined") return;

  document.addEventListener("click", (event) => {
    install();
    const trigger = event.target.closest?.("[data-qt-open],[data-qt-factory]");
    if (trigger) {
      pendingFactoryId = text(trigger.dataset.qtFactory);
      queueMicrotask(decorateDialog);
      return;
    }
    const button = event.target.closest?.("#qtDownload,#qtTemplate,#qtExclusions,#qtCopy");
    if (button) void handleAction(event, button);
  }, true);

  document.addEventListener("change", (event) => {
    install();
    const form = event.target.closest?.("#questionTrainingForm");
    if (!form) return;
    syncCebraspe(form);
    renderDestination(form);
  }, true);

  document.addEventListener("submit", (event) => {
    install();
    const form = event.target.closest?.("#questionTrainingForm");
    if (!form) return;
    syncCebraspe(form);
    renderDestination(form);
    queueMicrotask(() => decorateOutput(form));
  }, true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
})();