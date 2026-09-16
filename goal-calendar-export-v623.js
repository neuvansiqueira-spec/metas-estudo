/* V623.5 — Calendário de Metas: resumo/treino de cada meta conferidos na pasta real do Drive e PDF leve em tabelas. */
(() => {
  "use strict";

  const VERSION = "20260916-calendario-real-pdf-leve-v623-5";
  const FLAG = "__ALDUS_GOAL_CALENDAR_EXPORT_V623__";
  if (globalThis[FLAG]) return;

  const COLORS = {
    navy: "#061C33", ink: "#111827", blue: "#1D4ED8", blueSoft: "#E8F0FF", muted: "#475569", line: "#CBD5E1",
    paper: "#F8FAFC", gold: "#B78318", goldSoft: "#FFF7E5", green: "#166534", greenSoft: "#DCFCE7",
    red: "#B91C1C", redSoft: "#FEE2E2", amber: "#9A5B00", amberSoft: "#FEF3C7", white: "#FFFFFF"
  };
  const MODULES = [["resumoAula", "RESUMO/AULA"], ["lei", "LEI"], ["jurisprudencia", "JURISPRUDÊNCIA"], ["peca", "PEÇA"], ["completo", "COMPLETO"]];
  const MODULE_LABEL = Object.fromEntries(MODULES);
  const FOLDER_MIME = "application/vnd.google-apps.folder";
  const PRODUCED_STATUSES = new Set(["Aguardando revisão", "Aprovado", "PDF gerado"]);
  const PREJUDICADO = "PREJUDICADO";
  const NO_DATE = "SEM DATA REGISTRADA";
  const DRIVE_READ_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
  const PAGE_CACHE_KEY = "aldusCalendarioPaginasPdfV623";
  const FILE_FIELDS = "id,name,mimeType,createdTime,modifiedTime,webViewLink";
  const BUTTONS = { exportGoalCalendarPdf: "pdf", exportGoalCalendarExcel: "excel", exportGoalCalendarImage: "image" };
  const DRIVE_NOTES = {
    on: "Arquivos e páginas conferidos no Google Drive",
    off: "NÃO CONFERIDO — Google Drive não conectado",
    denied: "NÃO CONFERIDO — o Google Drive não autorizou a leitura",
    error: "NÃO CONFERIDO — falha ao ler o Google Drive"
  };

  const text = (value) => String(value ?? "").trim();
  const canon = (value) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const xmlEsc = (value) => String(value ?? "").replace(/[\u0000-\b\u000b\f\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const naturalCompare = (a, b) => String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
  const call = (name, ...args) => { try { const fn = globalThis[name]; return typeof fn === "function" ? fn(...args) : undefined; } catch { return undefined; } };
  const dateBR = (value) => { const iso = text(value).slice(0, 10); const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : text(value); };
  const dateTimeBR = (value) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? text(value) : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
  const minutesLabel = (value) => { const n = Math.max(0, Math.round(Number(value) || 0)); if (n < 60) return `${n} min`; const h = Math.floor(n / 60), m = n % 60; return m ? `${h}h ${m}min` : `${h}h`; };
  const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const weekdayOf = (iso) => { const d = new Date(`${text(iso).slice(0, 10)}T12:00:00`); return Number.isNaN(d.getTime()) ? "" : WEEKDAYS[d.getDay()]; };
  const todayISO = () => { const app = call("todayISO"); if (typeof app === "string" && app) return app; const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const currentState = () => { try { return typeof state !== "undefined" && state && typeof state === "object" ? state : null; } catch { return null; } };

  function factoryAgendaOf(appState) {
    return Array.isArray(appState?.factoryAgenda) && appState.factoryAgenda.length ? appState.factoryAgenda : (Array.isArray(appState?.factoryItems) ? appState.factoryItems : []);
  }
  function syllabusIdsOf(item = {}) {
    return [...new Set([...(item.editalLink?.itemIds || []), ...(item.syllabusItemIds || []), item.syllabusItemId].filter(Boolean).map(String))];
  }
  const contestShortName = (name) => text(name).split(" — ")[0] || text(name);
  function editalInfo(appState, ids = []) {
    const profiles = new Map((appState?.contestProfiles || []).map((p) => [p.id, p]));
    const lookup = globalThis.officialMappingsForItem;
    const mappings = ids.flatMap((id) => typeof lookup === "function" ? (lookup(appState, id) || []) : (appState?.contestSyllabusMap || []).filter((m) => m.syllabusItemId === id));
    if (mappings.length) {
      const byContest = new Map();
      mappings.forEach((m) => { if (!byContest.has(m.contestId)) byContest.set(m.contestId, new Set()); if (text(m.code)) byContest.get(m.contestId).add(text(m.code)); });
      const contests = [...byContest.keys()];
      const item = contests.map((id) => `${contestShortName(profiles.get(id)?.name || id)}: ${[...byContest.get(id)].sort(naturalCompare).join(", ") || "sem código"}`).join(" · ");
      return { edital: contests.map((id) => text(profiles.get(id)?.name) || id).join("; "), item, label: item };
    }
    const syllabus = (appState?.syllabusItems || []).find((entry) => ids.includes(String(entry.id)));
    const edital = text(appState?.edital?.contestName) || text(profiles.get(appState?.activeContestId)?.name) || "EDITAL NÃO VINCULADO";
    const item = text(syllabus?.reference) || text(syllabus?.subtopic) || "ITEM NÃO VINCULADO";
    return { edital, item, label: `${contestShortName(edital)} · ${item}` };
  }
  function modulesOf(item) {
    const normalized = call("normalizeFactoryModules", item?.modules || {}, item);
    return normalized && typeof normalized === "object" ? normalized : (item?.modules || {});
  }
  const destinationOf = (item) => text(item?.factoryDestinationFolder || item?.pastaDestinoWordPdf || item?.destinationFolder || item?.finalFilesFolder);
  function summaryRecord(appState, item, key, factoryStatus) {
    const edital = editalInfo(appState, syllabusIdsOf(item)), module = modulesOf(item)?.[key] || {};
    return {
      kind: "resumo", id: `resumo|${item.id}|${key}`, order: MODULES.findIndex(([k]) => k === key), moduleKey: key, typeLabel: MODULE_LABEL[key] || key,
      factoryStatus, discipline: text(item.disciplina || item.discipline) || "DISCIPLINA NÃO INFORMADA",
      theme: text(item.tema || item.subject) || "TEMA NÃO INFORMADO", edital: edital.edital, editalItem: edital.item, editalLabel: edital.label,
      date: text(module.dataConclusao), folderUrl: destinationOf(item), wordLink: text(module.wordLink), pdfLink: text(module.pdfLink)
    };
  }
  const recordOrder = (a,b) => naturalCompare(a.discipline,b.discipline) || naturalCompare(a.theme,b.theme) || (a.order??0)-(b.order??0) || naturalCompare(a.date||"",b.date||"");
  function elaboratedSummaries(appState) {
    const rows = [];
    for (const item of factoryAgendaOf(appState)) {
      if (!item || typeof item !== "object") continue;
      const modules = modulesOf(item);
      MODULES.forEach(([key]) => {
        const module = modules?.[key];
        if (module && PRODUCED_STATUSES.has(text(module.status))) rows.push(summaryRecord(appState, item, key, text(module.status)));
      });
    }
    return rows.sort(recordOrder);
  }
  // Tema exato primeiro: vários temas da Fábrica dividem o mesmo item do edital,
  // e o primeiro deles com esse item quase nunca é o tema do treino.
  function findFactoryItem(appState, discipline, theme, syllabusItemId, factoryItemId) {
    const agenda = factoryAgendaOf(appState), id = text(syllabusItemId), d = canon(discipline), t = canon(theme);
    if (factoryItemId) { const byItem = agenda.find((item) => text(item.id) === text(factoryItemId)); if (byItem) return byItem; }
    const sameTheme = t ? agenda.filter((item) => canon(item.tema || item.subject) === t) : [];
    return sameTheme.find((item) => id && syllabusIdsOf(item).includes(id)) || sameTheme.find((item) => canon(item.disciplina || item.discipline) === d)
      || (id ? (() => { const byId = agenda.filter((item) => syllabusIdsOf(item).includes(id)); return byId.length === 1 ? byId[0] : null; })() : null);
  }
  const questionsLabel = (count) => `${count} ${count === 1 ? "QUESTÃO" : "QUESTÕES"}`;
  const eventTopic = (event) => ({ discipline: text(event?.discipline || event?.config?.discipline), theme: text(event?.theme || event?.config?.theme) });
  const topicKeyOf = (discipline, theme) => `${canon(discipline)}|${canon(theme)}`;
  function trainingRecords(appState) {
    const events = Array.isArray(appState?.questionTrainingEvents) ? appState.questionTrainingEvents : [];
    const prompts = new Map(events.filter((e) => e?.kind === "prompt").map((e) => [e.roundId || e.id, e]));
    const rounds = new Map(), importedTopics = new Set();
    events.forEach((event) => {
      if (event?.kind !== "import") return;
      const key = event.roundId || event.id;
      if (!rounds.has(key)) rounds.set(key, { key, imports: [], questionIds: new Set() });
      const round = rounds.get(key); round.imports.push(event); (event.questionIds || []).forEach((id) => round.questionIds.add(id));
    });
    const record = ({ id, discipline, theme, config = {}, factoryStatus, typeLabel, date }) => {
      const factoryItem = findFactoryItem(appState, discipline, theme, config.syllabusItemId, config.factoryItemId);
      const ids = [...new Set([text(config.syllabusItemId), ...(factoryItem ? syllabusIdsOf(factoryItem) : [])].filter(Boolean))];
      const edital = editalInfo(appState, ids);
      return {
        kind: "treino", id, factoryStatus, typeLabel, discipline: discipline || "DISCIPLINA NÃO INFORMADA", theme: theme || "TREINO MISTO DA DISCIPLINA",
        edital: edital.edital, editalItem: edital.item, editalLabel: edital.label, date, folderUrl: text(config.destinationFolder) || destinationOf(factoryItem)
      };
    };
    const rows = [...rounds.values()].map((round) => {
      const prompt = prompts.get(round.key), config = prompt?.config || {}, first = round.imports[0] || {};
      const discipline = text(first.discipline || prompt?.discipline || config.discipline), theme = text(first.theme || prompt?.theme || config.theme);
      importedTopics.add(topicKeyOf(discipline, theme));
      return record({ id: `treino|${round.key}`, discipline, theme, config, factoryStatus: "Elaborado", typeLabel: [text(config.primary), questionsLabel(round.questionIds.size)].filter(Boolean).join(" · "),
        date: round.imports.map((e) => text(e.createdAt)).filter(Boolean).sort().at(-1) || text(prompt?.createdAt) });
    });
    // Treino feito pelo fluxo de 2 prompts (arquivo TREINO_*.html na pasta) sem
    // importar as questões no site: entra uma vez por tema, com o prompt mais recente.
    const promptOnly = new Map();
    prompts.forEach((prompt) => {
      const { discipline, theme } = eventTopic(prompt), key = topicKeyOf(discipline, theme);
      if (!canon(discipline) || importedTopics.has(key)) return;
      if (!promptOnly.has(key) || text(prompt.createdAt) > text(promptOnly.get(key).createdAt)) promptOnly.set(key, prompt);
    });
    promptOnly.forEach((prompt, key) => {
      const { discipline, theme } = eventTopic(prompt), config = prompt.config || {};
      rows.push(record({ id: `treino|prompt|${key}`, discipline, theme, config, factoryStatus: "Prompt gerado — questões não importadas no site",
        typeLabel: [text(config.primary), Number(prompt.requestedCount || config.count) ? `${Number(prompt.requestedCount || config.count)} PEDIDAS` : ""].filter(Boolean).join(" · ") || "PROMPT GERADO",
        date: text(prompt.createdAt) }));
    });
    return rows.sort(recordOrder);
  }

  function driveIdFrom(url) {
    const value = text(url); let m = value.match(/\/folders\/([\w-]{10,})/); if (m) return { kind:"folder", id:m[1] };
    m = value.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([\w-]{10,})/); if (m) return { kind:"file", id:m[1] };
    m = value.match(/[?&]id=([\w-]{10,})/); return m ? { kind:"file", id:m[1] } : null;
  }
  const IGNORED_FILE = /^~\$|ARQUIVO[_\s-]*INCORRETO|DESCONSIDERAR/i;
  const FILE_KINDS = [["jurisprudencia",/JURISPRUD/i],["peca",/(^|[_\s.-])PE[CÇ]A([_\s.-]|$)/i],["lei",/RESUMO[_\s-]*TOPIFICADO[_\s-]*LEI|(^|[_\s-])LEI[_\s-]/i],["resumoAula",/RESUMO[_\s-]*AULA|MAPA[_\s-]*HIERARQUICO/i],["completo",/COMPLETO|FUS[AÃ]O[_\s-]*FINAL|CONSOLIDA/i]];
  const isWord = (file) => /\.docx?$/i.test(file?.name || "") || /wordprocessingml|msword|google-apps\.document/.test(file?.mimeType || "");
  const isPdf = (file) => /\.pdf$/i.test(file?.name || "") || file?.mimeType === "application/pdf";
  // Treino pronto = o HTML do treino (ou o JSON salvo por ele). Prompts, modelo e exclusões não contam.
  const isTrainingFile = (file) => { const name = file?.name || ""; return /^TREINO[_\s-]/i.test(name) && !/EXCLUS|TRIAGEM|PDF[_\s-]*PARA[_\s-]*HTML|MODELO/i.test(name) && (/\.(html?|json)$/i.test(name) || /text\/html|application\/json/.test(file?.mimeType || "")); };
  const isFolder = (file) => file?.mimeType === FOLDER_MIME;
  // Pelo começo do nome, que é o padrão dos agentes da Fábrica: "MAPA_HIERARQUICO_RESUMO_AULA_LEI_13_709"
  // é RESUMO/AULA, não LEI. Nome fora do padrão (texto de lei, aula-fonte) não conta como resumo pronto.
  const PRODUCT_KINDS = [["jurisprudencia",/^MAPA[_\s-]*MENTAL[_\s-]*JURISPRUD/i],["peca",/^(MAPA[_\s-]*TOPIFICADO[_\s-]*PE[CÇ]A|RESUMO[_\s-]*PE[CÇ]A)/i],["lei",/^RESUMO[_\s-]*TOPIFICADO[_\s-]*LEI/i],["resumoAula",/^(MAPA[_\s-]*HIERARQUICO|RESUMO[_\s-]*AULA)/i],["completo",/^(RESUMO[_\s-]*COMPLETO|FUS[AÃ]O[_\s-]*FINAL|CONSOLIDA)/i]];
  const productKind = (file) => { const name = text(file?.name).replace(/^\d+[\s._-]+/, ""); return PRODUCT_KINDS.find(([,pattern]) => pattern.test(name))?.[0] || ""; };
  const fileKind = (file) => productKind(file) || FILE_KINDS.find(([,pattern]) => pattern.test(file?.name || ""))?.[0] || "";
  function productsIn(files) {
    const usable = files.filter((f) => f && !IGNORED_FILE.test(f.name || "")), resumos = new Map();
    usable.filter((f) => isWord(f) || isPdf(f)).forEach((f) => { const kind = productKind(f); if (!kind) return; const entry = resumos.get(kind) || { kind, word: [], pdf: [] }; (isWord(f) ? entry.word : entry.pdf).push(f); resumos.set(kind, entry); });
    return { resumos, treinos: usable.filter(isTrainingFile) };
  }
  const baseName = (name) => text(name).replace(/\.[^.]+$/,"").replace(/\s*\(\d+\)\s*$/,"").trim().toUpperCase();
  const newest = (files) => files.slice().sort((a,b) => naturalCompare(b.modifiedTime || "", a.modifiedTime || ""))[0] || null;
  function pickModuleFiles({ explicit=[], moduleFolder=[], shared=[] }, moduleKey) {
    const usable = (files) => files.filter((f) => f && !IGNORED_FILE.test(f.name || "") && (isWord(f) || isPdf(f)));
    const candidates = [...usable(explicit), ...usable(moduleFolder), ...usable(shared).filter((f) => fileKind(f) === moduleKey)];
    const unique = [...new Map(candidates.map((f) => [f.id,f])).values()], explicitIds = new Set(usable(explicit).map((f) => f.id));
    const choose = (test) => { const list = unique.filter(test); return newest(list.filter((f) => explicitIds.has(f.id))) || newest(list); };
    const word = choose(isWord), twin = word ? newest(unique.filter((f) => isPdf(f) && baseName(f.name) === baseName(word.name))) : null, pdf = twin || choose(isPdf);
    return { word, pdf, twin:Boolean(twin) };
  }
  function createDriveReader({ get, countPdfPages }) {
    const folders = new Map(), metas = new Map(), parents = new Map();
    const listFolder = (id) => { if (!folders.has(id)) { const q = encodeURIComponent(`'${id}' in parents and trashed=false`); folders.set(id, get(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${encodeURIComponent(`files(${FILE_FIELDS})`)}&pageSize=300&supportsAllDrives=true&includeItemsFromAllDrives=true`).then((d) => Array.isArray(d?.files) ? d.files : [])); } return folders.get(id); };
    const fileMeta = (id) => { if (!metas.has(id)) metas.set(id, get(`https://www.googleapis.com/drive/v3/files/${id}?fields=${encodeURIComponent(FILE_FIELDS)}&supportsAllDrives=true`)); return metas.get(id); };
    async function resolveSummary(record) {
      const destination = driveIdFrom(record.folderUrl), groups = { explicit:[], moduleFolder:[], shared:[] };
      for (const link of [record.wordLink, record.pdfLink].map(driveIdFrom).filter(Boolean)) {
        if (link.kind === "file") groups.explicit.push(await fileMeta(link.id));
        else if (destination?.kind === "folder" && link.id === destination.id) groups.shared.push(...await listFolder(link.id));
        else groups.moduleFolder.push(...await listFolder(link.id));
      }
      if (destination?.kind === "folder") groups.shared.push(...await listFolder(destination.id));
      const picked = pickModuleFiles(groups, record.moduleKey); let pdfPages = null, pdfError = "";
      if (picked.pdf) { try { pdfPages = await countPdfPages(picked.pdf); } catch (e) { pdfError = String(e?.message || e); } }
      return { checked:true, ...picked, pdfPages, pdfError };
    }
    async function resolveTraining(record) { const destination = driveIdFrom(record.folderUrl), files = destination?.kind === "folder" ? await listFolder(destination.id) : []; return { checked:true, trainingFile:newest(files.filter(isTrainingFile)) }; }
    // Um link sem permissão não derruba a conferência toda; só o token recusado (401) derruba.
    const onlyTokenErrors = (fallback) => (e) => { if (e?.status === 401) throw e; return fallback; };
    const folderParent = (id) => { if (!parents.has(id)) parents.set(id, get(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,parents&supportsAllDrives=true`).then((d) => text(d?.parents?.[0]))); return parents.get(id); };
    // Arquivos de um tema: pasta destino + links do Word/PDF de cada módulo. Se a pasta não tem
    // nenhum resumo nem treino, olha um nível abaixo (subpastas dos subitens do tema).
    async function filesOfItem(item) {
      const files = [], seen = new Set();
      const addFolder = async (id) => { if (seen.has(id)) return; seen.add(id); files.push(...await listFolder(id)); };
      const destination = driveIdFrom(destinationOf(item));
      if (destination?.kind === "folder") await addFolder(destination.id);
      for (const module of Object.values(modulesOf(item) || {})) for (const link of [module?.wordLink, module?.pdfLink].map(driveIdFrom).filter(Boolean)) {
        if (link.kind === "folder") await addFolder(link.id); else if (!seen.has(link.id)) { seen.add(link.id); files.push(await fileMeta(link.id).catch(onlyTokenErrors(null))); }
      }
      const found = productsIn(files);
      if (!found.resumos.size && !found.treinos.length) for (const sub of files.filter(isFolder).slice(0, 12)) await addFolder(sub.id);
      return files;
    }
    async function resolveGoal(links, folderIndex = new Map()) {
      const own = links.map((link) => link.item), ownFiles = [], foundKinds = [];
      for (const item of own) { const files = await filesOfItem(item); ownFiles.push(...files); productsIn(files).resumos.forEach((_, kind) => foundKinds.push({ item, kind })); }
      const { resumos, treinos } = productsIn([...new Map(ownFiles.filter(Boolean).map((f) => [f.id, f])).values()]);
      let parent = null;
      if (!resumos.size) for (const item of own) {
        const destination = driveIdFrom(destinationOf(item)); if (destination?.kind !== "folder") continue;
        const parentId = await folderParent(destination.id).catch(onlyTokenErrors("")), parentItems = (folderIndex.get(parentId) || []).filter((p) => !own.includes(p));
        if (!parentItems.length) continue;
        const above = productsIn(await listFolder(parentId));
        if (above.resumos.size) { parent = { theme: text(parentItems[0].tema || parentItems[0].subject), kinds: [...above.resumos.keys()] }; break; }
      }
      return { checked:true, resumos:[...resumos.values()].sort((a,b) => MODULES.findIndex(([k]) => k===a.kind) - MODULES.findIndex(([k]) => k===b.kind)), treinos, parent, foundKinds };
    }
    async function runQueue(tasks, onProgress) {
      const results = new Map(), queue = tasks.slice(); let done=0, fatal=null;
      const worker = async () => { while (queue.length && !fatal) { const [key, task] = queue.shift(); try { results.set(key, await task()); } catch (e) { if (e?.status===401 || e?.status===403) fatal=e; results.set(key,{checked:false,error:String(e?.message||e)}); } done++; onProgress(done,tasks.length); } };
      await Promise.all(Array.from({length:6},worker)); return { results, state:fatal ? "denied" : "on" };
    }
    const resolve = (records, onProgress=()=>{}) => runQueue(records.map((record) => [record.id, () => record.kind === "treino" ? resolveTraining(record) : resolveSummary(record)]), onProgress);
    const resolveGoals = (linksByGoal, folderIndex, onProgress=()=>{}) => runQueue([...linksByGoal].filter(([,links]) => links.length).map(([key, links]) => [key, () => resolveGoal(links, folderIndex)]), onProgress);
    return { resolve, resolveGoals, listFolder, fileMeta };
  }

  const driveNote = (state) => DRIVE_NOTES[state] || DRIVE_NOTES.off;
  const hasNoLinks = (record) => !record.folderUrl && !record.wordLink && !record.pdfLink;
  function summaryView(record, info, driveState="off") {
    const checked = driveState === "on" && info?.checked;
    const unavailable = hasNoLinks(record) ? PREJUDICADO : driveNote(driveState === "on" ? "error" : driveState);
    const fileDate = checked ? (info.pdf?.createdTime || info.word?.createdTime || "") : "";
    const date = record.date ? dateBR(record.date) : fileDate ? `${dateBR(fileDate)} (data do arquivo no Drive)` : NO_DATE;
    let wordPages = unavailable, pdfPages = unavailable;
    if (checked) {
      pdfPages = !info.pdf ? PREJUDICADO : Number.isFinite(info.pdfPages) ? String(info.pdfPages) : "NÃO CONTADO — não foi possível ler o PDF";
      wordPages = !info.word ? PREJUDICADO : info.twin && Number.isFinite(info.pdfPages) ? `${info.pdfPages} (conferido pelo PDF do mesmo arquivo)` : "NÃO CONTADO — sem PDF do mesmo Word para conferir";
    }
    const warn = (v) => /^(PREJUDICADO|NÃO |SEM DATA)/.test(v) ? "warn" : "";
    return {
      title:`RESUMO - ${record.typeLabel} ELABORADO`,
      fields:[
        {label:"DISCIPLINA",value:record.discipline},{label:"TEMA",value:record.theme},{label:"EDITAL",value:record.edital},{label:"ITEM DO EDITAL",value:record.editalItem},
        {label:"RESUMO - TIPO ELABORADO",value:record.typeLabel},{label:"",value:`RESUMO - ${record.typeLabel} ELABORADO`,statement:true},{label:"STATUS NA FÁBRICA",value:record.factoryStatus || "Elaborado"},
        {label:"DATA",value:date,tone:warn(date)},{label:"LINK DA PASTA DESTINO",value:record.folderUrl||PREJUDICADO,href:record.folderUrl,tone:record.folderUrl?"":"warn"},
        {label:"ARQUIVO WORD",value:checked ? (info.word?.name || PREJUDICADO) : unavailable,href:checked?info.word?.webViewLink:"",tone:checked&&info.word?"":warn(unavailable)},
        {label:"QUANTIDADE DE PÁGINAS DO WORD DO RESUMO",value:wordPages,href:checked?info.word?.webViewLink:"",tone:warn(wordPages)},
        {label:"ARQUIVO PDF",value:checked ? (info.pdf?.name || PREJUDICADO) : unavailable,href:checked?info.pdf?.webViewLink:"",tone:checked&&info.pdf?"":warn(unavailable)},
        {label:"QUANTIDADE DE PÁGINAS DO PDF DO RESUMO",value:pdfPages,href:checked?info.pdf?.webViewLink:"",tone:warn(pdfPages)}
      ]
    };
  }
  function trainingView(record, info, driveState="off") {
    const checked = driveState === "on" && info?.checked;
    const file = checked ? (info.trainingFile?.name || PREJUDICADO) : (record.folderUrl ? driveNote(driveState === "on" ? "error" : driveState) : PREJUDICADO);
    return {
      title:`TREINO DE QUESTÕES - ${record.typeLabel} ELABORADO`,
      fields:[
        {label:"DISCIPLINA",value:record.discipline},{label:"TEMA",value:record.theme},{label:"EDITAL",value:record.edital},{label:"ITEM DO EDITAL",value:record.editalItem},
        {label:"TREINO - TIPO",value:record.typeLabel},{label:"",value:`TREINO DE QUESTÕES - ${record.typeLabel} ELABORADO`,statement:true},{label:"STATUS NA FÁBRICA",value:record.factoryStatus || "Elaborado"},
        {label:"DATA",value:record.date?dateBR(record.date):NO_DATE,tone:record.date?"":"warn"},{label:"LINK DA PASTA DESTINO",value:record.folderUrl||PREJUDICADO,href:record.folderUrl,tone:record.folderUrl?"":"warn"},
        {label:"ARQUIVO DO TREINO",value:file,href:checked?info.trainingFile?.webViewLink:"",tone:/^(PREJUDICADO|NÃO )/.test(file)?"warn":""}
      ]
    };
  }

  // Liga a meta ao tema da Fábrica pelo item do edital, como o Plano do Dia: o nome da meta
  // ("Lei de Interceptação Telefônica") nem sempre é o nome do tema ("Lei nº 9.296/1996").
  const disciplineKey = (value) => canon(value).replace(/^direito /, "");
  const disciplinesCompatible = (a, b) => { const x = disciplineKey(a), y = disciplineKey(b); return Boolean(x && y) && (x === y || x.endsWith(` ${y}`) || y.endsWith(` ${x}`)); };
  const goalKey = (goal) => [goal.date, text(goal.syllabusItemId), canon(goal.discipline), canon(goal.subject)].join("|");
  function createGoalLinker(appState) {
    const agenda = factoryAgendaOf(appState), byTheme = new Map(), byId = new Map(), byFolder = new Map();
    const add = (map, key, item) => { if (!key) return; if (!map.has(key)) map.set(key, []); if (!map.get(key).includes(item)) map.get(key).push(item); };
    agenda.forEach((item) => { if (!item || typeof item !== "object") return; add(byTheme, canon(item.tema || item.subject), item); syllabusIdsOf(item).forEach((id) => add(byId, id, item)); const folder = driveIdFrom(destinationOf(item)); if (folder?.kind === "folder") add(byFolder, folder.id, item); });
    const syllabus = new Map((appState?.syllabusItems || []).map((entry) => [String(entry.id), entry]));
    const cache = new Map();
    function links(goal) {
      const key = goalKey(goal); if (cache.has(key)) return cache.get(key);
      const id = text(goal.syllabusItemId), sameId = byId.get(id) || [], subject = canon(goal.subject);
      let result = (byTheme.get(subject) || []).filter((item) => sameId.includes(item) || disciplinesCompatible(item.disciplina || item.discipline, goal.discipline)).map((item) => ({ item, relation: "tema" }));
      if (!result.length && sameId.length === 1) result = [{ item: sameId[0], relation: "item" }];
      if (!result.length && sameId.length > 1) { const main = canon(syllabus.get(id)?.subject); result = sameId.filter((item) => main && canon(item.tema || item.subject) === main).map((item) => ({ item, relation: "item" })); }
      cache.set(key, result); return result;
    }
    return { links, folderIndex: byFolder };
  }
  function trainingEventIndex(appState) {
    const index = new Map(), add = (key, event) => { if (!key || key === "|") return; if (!index.has(key)) index.set(key, new Set()); index.get(key).add(event); };
    (appState?.questionTrainingEvents || []).forEach((event) => { if (!event || !["prompt","import"].includes(event.kind)) return; const topic = eventTopic(event); add(topicKeyOf(topic.discipline, topic.theme), event); if (event.config?.factoryItemId) add(`item:${event.config.factoryItemId}`, event); });
    return index;
  }
  const formatsLabel = (entry) => entry.word.length && entry.pdf.length ? "Word e PDF" : entry.word.length ? "Word" : "PDF";
  function factoryOutcomeForGoal(goal, report) {
    const key = goalKey(goal); if (report?.outcomes?.has(key)) return report.outcomes.get(key);
    const links = report?.linker ? report.linker.links(goal) : [], items = links.map((link) => link.item);
    const info = report?.goalDrive?.get(key), checked = report?.driveState === "on" && info?.checked === true;
    const marked = [...new Set(items.flatMap((item) => MODULES.filter(([k]) => PRODUCED_STATUSES.has(text(modulesOf(item)?.[k]?.status))).map(([, label]) => label)))];
    const otherThemes = [...new Set(links.filter((link) => link.relation !== "tema").map((link) => text(link.item.tema || link.item.subject)))];
    const themeNote = otherThemes.length ? `tema na Fábrica: ${otherThemes.join("; ")}` : "";
    const unreadNote = report?.driveState === "on" ? "falha ao ler a pasta no Drive" : "Drive não conferido";
    let summaryDone = false, summaryLabel = "NÃO", summaryDetail = themeNote;
    if (!links.length) summaryLabel = "NÃO — tema não está na Fábrica";
    else if (checked && info.resumos.length) { summaryDone = true; summaryLabel = `SIM — ${info.resumos.map((entry) => `${MODULE_LABEL[entry.kind]} (${formatsLabel(entry)})`).join("; ")}`; }
    else if (checked && info.parent) { summaryLabel = "NÃO NO TEMA — há resumo do tema maior"; summaryDetail = [`${info.parent.theme} (${info.parent.kinds.map((k) => MODULE_LABEL[k]).join(", ")})`, themeNote].filter(Boolean).join(" · "); }
    else if (checked && marked.length) { summaryLabel = "NÃO — a pasta não tem o arquivo"; summaryDetail = [`a Fábrica marca ${marked.join(", ")} como pronto`, themeNote].filter(Boolean).join(" · "); }
    else if (!checked && marked.length) { summaryDone = true; summaryLabel = `SIM — ${marked.join(", ")}`; summaryDetail = [`marcado na Fábrica; ${unreadNote}`, themeNote].filter(Boolean).join(" · "); }
    else if (!checked) { summaryLabel = "NÃO MARCADO NA FÁBRICA"; summaryDetail = [unreadNote, themeNote].filter(Boolean).join(" · "); }
    const events = new Set(); [topicKeyOf(goal.discipline, goal.subject), ...items.map((item) => topicKeyOf(item.disciplina || item.discipline, item.tema || item.subject)), ...items.map((item) => `item:${item.id}`)].forEach((k) => (report?.trainingEvents?.get(k) || []).forEach((e) => events.add(e)));
    const imported = new Set([...events].filter((e) => e.kind === "import").flatMap((e) => e.questionIds || [])).size;
    const lastPrompt = [...events].filter((e) => e.kind === "prompt").map((e) => text(e.createdAt)).filter(Boolean).sort().at(-1) || "";
    const trainingFile = checked ? newest((info.treinos || []).filter((file) => /\.html?$/i.test(file.name || ""))) || newest(info.treinos || []) : null;
    let trainingDone = false, trainingLabel = "NÃO", trainingDetail = "";
    if (trainingFile) { trainingDone = true; trainingLabel = "SIM — arquivo do treino na pasta"; trainingDetail = [trainingFile.name, imported ? `${questionsLabel(imported).toLowerCase()} no site` : ""].filter(Boolean).join(" · "); }
    else if (imported) { trainingDone = true; trainingLabel = `SIM — ${questionsLabel(imported).toLowerCase()} importadas no site`; }
    else if (lastPrompt) { trainingLabel = checked ? "NÃO — prompt gerado, arquivo não está na pasta" : !links.length ? "NÃO — prompt gerado, tema sem pasta na Fábrica" : "PROMPT GERADO"; trainingDetail = [`prompt de ${dateBR(lastPrompt)}`, checked || !links.length ? "" : unreadNote].filter(Boolean).join(" · "); }
    else if (!checked && links.length) { trainingLabel = "NÃO REGISTRADO NO SITE"; trainingDetail = unreadNote; }
    const outcome = { links, summaryDone, summaryLabel, summaryDetail, trainingDone, trainingLabel, trainingDetail };
    report?.outcomes?.set(key, outcome); return outcome;
  }
  const outcomeText = (label, detail) => detail ? `${label} (${detail})` : label;
  function goalState(goal, report) {
    if (/conclu/i.test(goal.status || "")) return "done";
    const out = factoryOutcomeForGoal(goal, report);
    if (out.summaryDone || out.trainingDone) return "factory";
    return text(goal.date) && goal.date < report.today ? "missed" : "pending";
  }
  const STATE_LABEL = { done:"Concluída", factory:"Produto elaborado", missed:"Não realizada", pending:"A fazer" };
  const PERIOD_TITLE = { daily:"Calendário do dia", weekly:"Calendário da semana", monthly:"Calendário do mês" };
  function buildReport({periods,referenceDate,scope,scopeLabel,summaries,trainings,appState=null,driveInfo=new Map(),goalDrive=new Map(),driveState="off",generatedAt=new Date().toISOString(),today=todayISO()}) {
    const report={version:VERSION,generatedAt,referenceDate,scope,scopeLabel,today,driveState,driveNote:driveNote(driveState),periods:periods.map(({label,key,data})=>({label,key,title:PERIOD_TITLE[key]||`Calendário — ${label}`,data})),summaries:[],trainings:[]};
    report.summaries=summaries.map((record)=>({record,view:summaryView(record,driveInfo.get(record.id),driveState)}));
    report.trainings=trainings.map((record)=>({record,view:trainingView(record,driveInfo.get(record.id),driveState)}));
    report.linker=appState?createGoalLinker(appState):null; report.trainingEvents=trainingEventIndex(appState); report.goalDrive=goalDrive; report.outcomes=new Map(); return report;
  }
  const periodRange = (data) => data.start===data.end ? dateBR(data.start) : `${dateBR(data.start)} a ${dateBR(data.end)}`;
  function periodMetrics(data, report) {
    const goals = data.goals || data.days?.flatMap((d)=>d.goals||[]) || [];
    const recognized = goals.filter((g)=>["done","factory"].includes(goalState(g,report))).length;
    return { goals:goals.length, recognized, percent:goals.length?Math.round(recognized*100/goals.length):0, planned:Number(data.planned)||0, actual:Number(data.actual)||0 };
  }
  const disciplineList = (data) => Object.entries(data.disciplines||{}).sort(([a],[b])=>naturalCompare(a,b));

  function logoSvg() { const svg=call("generatedBrandLogoSvg"); if (typeof svg==="string"&&svg.includes("<svg")) return svg; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 440"><rect width="1200" height="440" rx="60" fill="${COLORS.navy}"/></svg>`; }
  function logoMarkSvg(x,y,width) { const mark=call("generatedBrandMarkSvg",x,y,width); if (typeof mark==="string"&&mark.includes("data-generated-brand")) return mark; return `<g data-generated-brand="Aldus Metas Concurso" transform="translate(${x} ${y})"><rect width="${width}" height="${Math.round(width*440/1200)}" rx="16" fill="${COLORS.navy}"/></g>`; }

  // PDF leve: tabelas simples, só Arial normal e negrito (peso 800 puxava a Arial Black),
  // sem cantos arredondados nem faixas coloridas por linha. Cada caixa desenhada e cada
  // campo de cartão viravam objetos próprios no PDF do Chrome.
  // Timbre e rodapé nas margens da página (@top-*/@bottom-*): o position:fixed com deslocamento negativo
  // da V623.4 fazia o Chrome desenhar o timbre embaixo e o rodapé em cima da tabela, cobrindo linhas.
  const cssText = (value) => String(value ?? "").replace(/[\\"]/g, (ch) => `\\${ch}`).replace(/[\r\n]+/g, " ");
  const LOGO_DATA_URI = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><text x="0" y="58" font-family="Arial,Helvetica,sans-serif" font-size="58" font-weight="700" letter-spacing="8" fill="${COLORS.navy}">ALDUS</text><text x="2" y="92" font-family="Arial,Helvetica,sans-serif" font-size="21" font-weight="700" letter-spacing="6" fill="${COLORS.gold}">METAS CONCURSO</text></svg>`)}`;
  function printCss(report) { return `
@media screen{#goalCalendarPrintableReport.aldus-cal-v623{display:none!important}}
@media print{@page{size:A4 landscape;margin:17mm 8mm 12mm;@top-left{content:"";width:44mm;background:url("${LOGO_DATA_URI}") left bottom/40mm auto no-repeat}@top-right{content:"Calendário de metas  ·  ${cssText(`Referência ${dateBR(report.referenceDate)} · ${report.scopeLabel}`)}";vertical-align:bottom;padding-bottom:1.2mm;font:700 8.5pt Arial,Helvetica,sans-serif;color:${COLORS.navy}}@bottom-left{content:"${cssText(`Aldus Meta · Metas de Estudo · Gerado em ${dateTimeBR(report.generatedAt)}`)}";font:6.5pt Arial,Helvetica,sans-serif;color:${COLORS.muted}}@bottom-right{content:"Página " counter(page);font:7pt Arial;color:${COLORS.muted}}}body.calendar-print-mode{min-width:0!important;width:auto!important;margin:0!important;padding:0!important}body.calendar-print-mode #goalCalendarPrintableReport.aldus-cal-v623{display:block!important;width:100%!important;max-width:281mm!important;margin:0 auto!important}}
#goalCalendarPrintableReport.aldus-cal-v623{color:${COLORS.ink}!important;font:7.4pt/1.28 Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;opacity:1!important}.aldus-cal-v623 *{box-sizing:border-box;opacity:1!important;box-shadow:none!important;text-shadow:none!important;filter:none!important;border-radius:0!important}.aldus-cal-v623 b{font-weight:700}
.aldus-cal-v623 .acv-intro p{margin:.6mm 0 0}.aldus-cal-v623 .acv-intro{margin:2mm 0 3mm}
.aldus-cal-v623 .acv-section{margin:0 0 4mm}.aldus-cal-v623 .acv-section h2{margin:0 0 1mm;padding:.4mm 0 .4mm 2mm;border-left:1mm solid ${COLORS.blue};font-size:10pt;color:${COLORS.navy}!important;break-after:avoid}.aldus-cal-v623 .acv-section h2 span{margin-left:2.5mm;font-size:7.4pt;font-weight:400;color:${COLORS.muted}!important}.aldus-cal-v623 .acv-factory h2{border-left-color:${COLORS.gold}}
.aldus-cal-v623 .acv-line,.aldus-cal-v623 .acv-note,.aldus-cal-v623 .acv-empty{margin:0 0 1.2mm}.aldus-cal-v623 .acv-line b{color:${COLORS.navy}!important}.aldus-cal-v623 .acv-muted,.aldus-cal-v623 .acv-note,.aldus-cal-v623 .acv-empty{color:${COLORS.muted}!important}
.aldus-cal-v623 table{min-width:0!important}.aldus-cal-v623 table.acv-t{width:100%;border-collapse:collapse;table-layout:fixed}.aldus-cal-v623 table.acv-t thead{display:table-header-group}.aldus-cal-v623 table.acv-t th{padding:.8mm 1.1mm;background:${COLORS.navy};color:#fff!important;text-align:left;font-size:6.6pt;font-weight:700}.aldus-cal-v623 table.acv-t td{padding:.7mm 1.1mm;border-bottom:.2mm solid ${COLORS.line};vertical-align:top;color:${COLORS.ink}!important;overflow-wrap:anywhere;word-break:break-word;min-width:0}.aldus-cal-v623 table.acv-t tr{break-inside:avoid;page-break-inside:avoid}.aldus-cal-v623 table.acv-t tr.acv-day td{padding-top:1.2mm;font-weight:700;color:${COLORS.navy}!important;border-bottom:.35mm solid ${COLORS.navy}}
.aldus-cal-v623 .acv-t small,.aldus-cal-v623 .acv-t .acv-block{display:block}.aldus-cal-v623 .acv-t td.acv-strong{font-weight:700}.aldus-cal-v623 table.acv-t td.acv-warn{font-weight:700;color:${COLORS.amber}!important}.aldus-cal-v623 .acv-t small{font-size:6.4pt;color:${COLORS.muted}!important}.aldus-cal-v623 .acv-ok{color:${COLORS.green}!important}.aldus-cal-v623 .acv-no{color:#334155!important}.aldus-cal-v623 .acv-warn{color:${COLORS.amber}!important}.aldus-cal-v623 .acv-miss{color:${COLORS.red}!important}.aldus-cal-v623 .acv-pend{color:${COLORS.blue}!important}.aldus-cal-v623 a{color:${COLORS.blue}!important;text-decoration:underline}`; }
  const STATE_CLASS = { done:"acv-ok", factory:"acv-ok", missed:"acv-miss", pending:"acv-pend" };
  const WARN_OUTCOME = /^(NÃO NO TEMA|NÃO — a pasta|NÃO — prompt|PROMPT GERADO)/;
  const readyCell = (done, label, detail) => `<b class="${done ? "acv-ok" : WARN_OUTCOME.test(label) ? "acv-warn" : "acv-no"}">${esc(label)}</b>${detail ? `<small>${esc(detail)}</small>` : ""}`;
  function goalRowHtml(g, report) {
    const state = goalState(g, report), out = factoryOutcomeForGoal(g, report);
    return `<tr><td><b>${esc(g.discipline)}</b><span class="acv-block">${esc(g.subject)}</span></td><td>${esc(g.type)}</td><td>${esc(minutesLabel(g.plannedMinutes))}</td><td>${esc(minutesLabel(g.actualMinutes))}</td><td><b class="${STATE_CLASS[state]}">${esc(STATE_LABEL[state])}</b></td><td>${readyCell(out.summaryDone, out.summaryLabel, out.summaryDetail)}</td><td>${readyCell(out.trainingDone, out.trainingLabel, out.trainingDetail)}</td></tr>`;
  }
  function goalsTableHtml(days, report, withDayRows) {
    if (!withDayRows && !days.some((d) => (d.goals || []).length)) return `<p class="acv-empty">Nenhuma meta nesta data.</p>`;
    const rows = days.map((d) => `${withDayRows ? `<tr class="acv-day"><td colspan="7">${esc(weekdayOf(d.date))} · ${esc(dateBR(d.date))} · ${esc(d.dayType)} · ${(d.goals || []).length ? `${d.goals.length} meta(s)` : "sem metas"}</td></tr>` : ""}${(d.goals || []).map((g) => goalRowHtml(g, report)).join("")}`).join("");
    return `<table class="acv-t acv-goals"><colgroup><col style="width:25%"><col style="width:8%"><col style="width:6.5%"><col style="width:6.5%"><col style="width:9%"><col style="width:25%"><col style="width:20%"></colgroup><thead><tr><th>Disciplina e assunto</th><th>Tipo</th><th>Planejado</th><th>Realizado</th><th>Meta</th><th>Resumo pronto?</th><th>Treino pronto?</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function periodHtml(period, report) {
    const m = periodMetrics(period.data, report), disciplines = disciplineList(period.data), daily = period.key === "daily";
    return `<section class="acv-section"><h2>${esc(period.title)}<span>${esc(periodRange(period.data))}</span></h2><p class="acv-line">Metas <b>${m.goals}</b> · Concluídas/produzidas <b>${m.recognized}</b> · Cumprimento <b>${m.percent}%</b> · Planejado <b>${esc(minutesLabel(m.planned))}</b> · Realizado <b>${esc(minutesLabel(m.actual))}</b></p>${disciplines.length ? `<p class="acv-line acv-muted">${disciplines.map(([n, c]) => `${esc(n)} (${c})`).join(" · ")}</p>` : ""}${goalsTableHtml(daily ? (period.data.days || []).slice(0, 1) : (period.data.days || []), report, !daily)}</section>`;
  }
  const compactValue = (value) => text(value).replace(" (conferido pelo PDF do mesmo arquivo)", " (pelo PDF)").replace(" (data do arquivo no Drive)", " (Drive)").replace(/^NÃO CONTADO — sem PDF.*/, "NÃO CONTADO (sem PDF gêmeo)").replace(/^NÃO CONTADO — não foi.*/, "NÃO CONTADO (PDF ilegível)").replace(/^NÃO CONFERIDO — .*/, "NÃO CONFERIDO");
  const fieldsOf = (view) => Object.fromEntries(view.fields.filter((f) => f.label).map((f) => [f.label, f]));
  // A cor vai na própria <td> (um elemento a menos por célula no PDF marcado do Chrome), e só a
  // pasta destino e o arquivo do treino ganham link; os links de cada Word/PDF ficam no Excel.
  const fieldCell = (f, { link = false, linkText = "" } = {}) => { if (!f) return "<td></td>"; const value = compactValue(f.value), body = link && f.href ? `<a href="${esc(f.href)}">${esc(linkText || value)}</a>` : esc(value); return `<td${f.tone === "warn" ? ' class="acv-warn"' : ""}>${body}</td>`; };
  const folderCell = (f) => fieldCell(f, { link: true, linkText: "abrir pasta" });
  function listTableHtml(cols, heads, rows) { return `<table class="acv-t acv-list"><colgroup>${cols.map((w) => `<col style="width:${w}%">`).join("")}</colgroup><thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`; }
  const summariesTableHtml = (entries) => listTableHtml([11,18,12,10,9,9,6,13,12], ["Disciplina","Tema","Edital · item","Resumo (tipo)","Status na Fábrica","Data","Pasta destino","Páginas do Word","Páginas do PDF"],
    entries.map(({ record, view }) => { const by = fieldsOf(view); return `<tr><td>${esc(record.discipline)}</td><td class="acv-strong">${esc(record.theme)}</td><td>${esc(record.editalLabel || record.editalItem)}</td><td>${esc(record.typeLabel)}</td><td>${esc(record.factoryStatus)}</td>${fieldCell(by.DATA)}${folderCell(by["LINK DA PASTA DESTINO"])}${fieldCell(by["QUANTIDADE DE PÁGINAS DO WORD DO RESUMO"])}${fieldCell(by["QUANTIDADE DE PÁGINAS DO PDF DO RESUMO"])}</tr>`; }));
  const trainingsTableHtml = (entries) => listTableHtml([11,17,13,10,13,8,7,21], ["Disciplina","Tema","Edital · item","Treino","Status","Data","Pasta destino","Arquivo do treino"],
    entries.map(({ record, view }) => { const by = fieldsOf(view); return `<tr><td>${esc(record.discipline)}</td><td class="acv-strong">${esc(record.theme)}</td><td>${esc(record.editalLabel || record.editalItem)}</td><td>${esc(record.typeLabel)}</td><td>${esc(record.factoryStatus)}</td>${fieldCell(by.DATA)}${folderCell(by["LINK DA PASTA DESTINO"])}${fieldCell(by["ARQUIVO DO TREINO"], { link: true })}</tr>`; }));
  function factoryHtml(title, entries, table, legend, report) {
    return `<section class="acv-section acv-factory"><h2>${esc(title)}<span>${entries.length} registro(s)</span></h2><p class="acv-note">${esc(report.driveNote)}.${legend ? ` ${esc(legend)}` : ""}</p>${entries.length ? table(entries) : `<p class="acv-empty">Nenhum registro.</p>`}</section>`;
  }
  function buildPrintHtml(report) {
    const intro = `<div class="acv-intro"><p>Período: <b>${esc(report.scopeLabel)}</b> · Referência: <b>${esc(dateBR(report.referenceDate))}</b> · ${report.summaries.length} resumo(s) e ${report.trainings.length} treino(s) na Fábrica · ${esc(report.driveNote)}</p><p class="acv-muted">“Resumo pronto?” e “Treino pronto?” conferem a pasta destino do tema no Google Drive. Sem o Drive, valem as marcações da Fábrica e os treinos registrados no site.</p></div>`;
    const content = [intro, ...report.periods.map((p) => periodHtml(p, report)),
      factoryHtml("Fábrica de Resumos — resumos elaborados", report.summaries, summariesTableHtml, "(pelo PDF) = páginas do Word conferidas no PDF gêmeo; (Drive) = data do arquivo no Drive.", report),
      factoryHtml("Fábrica de Resumos — treinos de questões", report.trainings, trainingsTableHtml, "", report)].join("");
    // aria-hidden: o relatório só existe durante a impressão (fica oculto na tela). Sem ele, o Chrome grava
    // no PDF uma estrutura de acessibilidade por célula (~1.500 objetos) e o arquivo quase triplica.
    return `<article id="goalCalendarPrintableReport" class="aldus-cal-v623" data-version="${VERSION}" aria-hidden="true"><style>${printCss(report)}</style><main class="acv-main">${content}</main></article>`;
  }

  const approxWidth=(v,s)=>String(v).length*s*.55;
  const fit=(v,w,s)=>{const src=String(v??"");if(approxWidth(src,s)<=w)return src;return `${src.slice(0,Math.max(4,Math.floor(w/(s*.55))-1))}…`;};
  const svgText=(x,y,v,{size=16,weight=400,color=COLORS.ink,anchor="start",maxWidth=0}={})=>`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(maxWidth?fit(v,maxWidth,size):v)}</text>`;
  const STATE_COLORS={done:[COLORS.green,COLORS.greenSoft],factory:[COLORS.green,COLORS.greenSoft],missed:[COLORS.red,COLORS.redSoft],pending:[COLORS.blue,COLORS.blueSoft]};
  function buildSvg(report) {
    const W=1600,M=60,CW=W-M*2,COL_GAP=20,COL_W=(CW-COL_GAP)/2; let y=0; const p=[];
    p.push(logoMarkSvg(M,28,250)); p.push(svgText(W-M,72,"Calendário de metas",{size:34,weight:800,color:COLORS.navy,anchor:"end"})); p.push(svgText(W-M,104,`Referência ${dateBR(report.referenceDate)} · ${report.scopeLabel} · ${dateTimeBR(report.generatedAt)}`,{size:16,color:COLORS.muted,anchor:"end"})); p.push(`<rect x="${M}" y="138" width="${CW}" height="5" fill="${COLORS.navy}"/><rect x="${M}" y="147" width="${CW}" height="3" fill="${COLORS.gold}"/>`); y=184;
    const section=(title,right,accent=COLORS.blue,soft=COLORS.blueSoft)=>{p.push(`<rect x="${M}" y="${y}" width="${CW}" height="56" rx="12" fill="${soft}"/><rect x="${M}" y="${y}" width="9" height="56" rx="4" fill="${accent}"/>`);p.push(svgText(M+28,y+36,title,{size:24,weight:800,color:COLORS.navy,maxWidth:CW-360}));if(right)p.push(svgText(W-M-20,y+36,right,{size:16,color:COLORS.muted,anchor:"end"}));y+=72;};
    for(const period of report.periods){section(period.title,periodRange(period.data));const m=periodMetrics(period.data,report),tiles=[["Metas",m.goals],["Concl./prod.",m.recognized],["Cumprimento",`${m.percent}%`],["Planejado",minutesLabel(m.planned)],["Realizado",minutesLabel(m.actual)]],tw=(CW-64)/5;tiles.forEach(([l,v],i)=>{const x=M+i*(tw+16);p.push(`<rect x="${x}" y="${y}" width="${tw}" height="84" rx="12" fill="${COLORS.paper}" stroke="${COLORS.line}"/>`);p.push(svgText(x+18,y+30,l.toUpperCase(),{size:13,weight:700,color:COLORS.muted,maxWidth:tw-30}));p.push(svgText(x+18,y+67,v,{size:28,weight:800,color:COLORS.navy,maxWidth:tw-30}));});y+=100;p.push(`<rect x="${M}" y="${y}" width="${CW}" height="9" rx="5" fill="#E2E8F0"/><rect x="${M}" y="${y}" width="${Math.round(CW*m.percent/100)}" height="9" rx="5" fill="${COLORS.green}"/>`);y+=28;for(const day of period.data.days||[]){if(period.key!=="daily"){p.push(`<rect x="${M}" y="${y}" width="${CW}" height="42" rx="9" fill="${COLORS.paper}" stroke="${COLORS.line}"/>`);p.push(svgText(M+18,y+28,`${weekdayOf(day.date)} · ${dateBR(day.date)} · ${day.dayType}`,{size:17,weight:800,color:COLORS.navy}));y+=50;}for(const g of day.goals||[]){const state=goalState(g,report),out=factoryOutcomeForGoal(g,report),[strong,soft]=STATE_COLORS[state],summaryText=`Resumo pronto? ${outcomeText(out.summaryLabel,out.summaryDetail)}`,trainingText=`Treino pronto? ${outcomeText(out.trainingLabel,out.trainingDetail)}`;p.push(`<rect x="${M}" y="${y}" width="${CW}" height="90" rx="10" fill="#fff" stroke="${COLORS.line}"/><rect x="${M}" y="${y}" width="8" height="90" rx="4" fill="${strong}"/>`);p.push(svgText(M+24,y+23,`${g.discipline} — ${g.subject}`,{size:17,weight:700,color:COLORS.navy,maxWidth:CW-260}));p.push(svgText(M+24,y+43,`${g.type} · ${minutesLabel(g.plannedMinutes)} planejado · ${minutesLabel(g.actualMinutes)} realizado`,{size:13,color:COLORS.muted,maxWidth:CW-260}));p.push(svgText(M+24,y+64,summaryText,{size:13,weight:800,color:out.summaryDone?COLORS.green:COLORS.muted,maxWidth:CW-270}));p.push(svgText(M+24,y+82,trainingText,{size:13,weight:800,color:out.trainingDone?COLORS.green:COLORS.muted,maxWidth:CW-270}));p.push(`<rect x="${W-M-210}" y="${y+13}" width="190" height="29" rx="15" fill="${soft}"/>`);p.push(svgText(W-M-115,y+33,STATE_LABEL[state],{size:13,weight:800,color:strong,anchor:"middle",maxWidth:175}));y+=98;}if(!(day.goals||[]).length){p.push(svgText(M+18,y+22,"Sem metas.",{size:14,color:COLORS.muted}));y+=34;}}y+=12;}
    const compactEntry=(entry,x,cy,w)=>{const fields=entry.view.fields.filter((f)=>!f.statement);const shown=fields.filter((f)=>["DISCIPLINA","TEMA","EDITAL","ITEM DO EDITAL","STATUS NA FÁBRICA","DATA","LINK DA PASTA DESTINO","QUANTIDADE DE PÁGINAS DO WORD DO RESUMO","QUANTIDADE DE PÁGINAS DO PDF DO RESUMO","ARQUIVO DO TREINO"].includes(f.label));const h=62+shown.length*24;p.push(`<rect x="${x}" y="${cy}" width="${w}" height="${h}" rx="11" fill="#fff" stroke="${COLORS.line}"/><rect x="${x}" y="${cy}" width="7" height="${h}" rx="4" fill="${COLORS.gold}"/>`);p.push(svgText(x+22,cy+30,entry.view.title,{size:16,weight:800,color:COLORS.blue,maxWidth:w-40}));shown.forEach((f,i)=>{const ly=cy+58+i*24;p.push(svgText(x+22,ly,`${f.label}:`,{size:11,weight:800,color:COLORS.muted,maxWidth:205}));p.push(svgText(x+225,ly,f.value,{size:12,weight:f.tone==="warn"?800:500,color:f.tone==="warn"?COLORS.amber:(f.href?COLORS.blue:COLORS.ink),maxWidth:w-245}));});return h;};
    const grid=(title,entries)=>{section(title,`${entries.length} registro(s)`,COLORS.gold,COLORS.goldSoft);p.push(svgText(M,y,`${report.driveNote}.`,{size:14,color:COLORS.muted,maxWidth:CW}));y+=24;if(!entries.length){p.push(svgText(M+18,y+20,"Nenhum registro elaborado.",{size:14,color:COLORS.muted}));y+=40;return;}let leftY=y,rightY=y;entries.forEach((entry,i)=>{const useLeft=leftY<=rightY,x=useLeft?M:M+COL_W+COL_GAP,cy=useLeft?leftY:rightY,h=compactEntry(entry,x,cy,COL_W);if(useLeft)leftY+=h+12;else rightY+=h+12;});y=Math.max(leftY,rightY)+14;};
    grid("Fábrica de Resumos — resumos elaborados",report.summaries);grid("Fábrica de Resumos — treinos elaborados",report.trainings);p.push(`<rect x="${M}" y="${y}" width="${CW}" height="2" fill="${COLORS.line}"/>`);p.push(svgText(M,y+30,"Aldus Meta · Metas de Estudo",{size:14,color:COLORS.muted}));p.push(svgText(W-M,y+30,`Gerado em ${dateTimeBR(report.generatedAt)}`,{size:14,color:COLORS.muted,anchor:"end"}));const H=y+55;return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"><title>Calendário de metas — Aldus Meta</title><style>text{font-family:Arial,Helvetica,sans-serif}</style><rect width="100%" height="100%" fill="#fff"/>${p.join("")}</svg>`;
  }

  function columnName(index){let v=index,n="";while(v>0){const r=(v-1)%26;n=String.fromCharCode(65+r)+n;v=Math.floor((v-1)/26);}return n;}
  const XS={base:0,title:1,subtitle:2,section:3,header:4,cell:5,zebra:6,number:7,done:8,pending:9,missed:10,link:11,kpiLabel:12,kpiValue:13,statement:14,warn:15,numberZebra:16,linkZebra:17,factory:18};
  function stylesXml(){const font=(o)=>`<font>${o.b?"<b/>":""}${o.u?"<u/>":""}<sz val="${o.sz||10}"/><color rgb="FF${(o.color||COLORS.ink).slice(1)}"/><name val="Calibri"/><family val="2"/></font>`;const fonts=[font({}),font({b:1,sz:18,color:COLORS.navy}),font({sz:10,color:COLORS.muted}),font({b:1,sz:12,color:COLORS.navy}),font({b:1,color:"#FFFFFF"}),font({b:1,color:COLORS.green}),font({b:1,color:COLORS.blue}),font({b:1,color:COLORS.red}),font({u:1,color:COLORS.blue}),font({b:1,sz:14,color:COLORS.navy}),font({b:1,color:COLORS.amber})];const fill=(c)=>`<fill><patternFill patternType="solid"><fgColor rgb="FF${c.slice(1)}"/><bgColor indexed="64"/></patternFill></fill>`;const fills=[`<fill><patternFill patternType="none"/></fill>`,`<fill><patternFill patternType="gray125"/></fill>`,fill(COLORS.navy),fill(COLORS.blueSoft),fill(COLORS.paper),fill(COLORS.greenSoft),fill(COLORS.redSoft),fill(COLORS.amberSoft)];const border=`<border><left style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></left><right style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></right><top style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></top><bottom style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></bottom><diagonal/></border>`;const xf=(f,fi,b,a=`<alignment vertical="top" wrapText="1"/>`)=>`<xf numFmtId="0" fontId="${f}" fillId="${fi}" borderId="${b}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${a}</xf>`;const c=`<alignment horizontal="center" vertical="center" wrapText="1"/>`,r=`<alignment horizontal="right" vertical="top"/>`,m=`<alignment vertical="center"/>`;const xfs=[xf(0,0,0,m),xf(1,0,0,m),xf(2,0,0,m),xf(3,3,0,m),xf(4,2,1,c),xf(0,0,1),xf(0,4,1),xf(0,0,1,r),xf(5,5,1,c),xf(6,3,1,c),xf(7,6,1,c),xf(8,0,1),xf(2,4,1,c),xf(9,4,1,c),xf(6,0,1),xf(10,7,1),xf(0,4,1,r),xf(8,4,1),xf(5,5,1,c)];return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fonts.join("")}</fonts><fills count="${fills.length}">${fills.join("")}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${border}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;}
  function cellXml(ref,cell){if(cell==null)return"";const{v,s=XS.cell,link}=typeof cell==="object"?cell:{v:cell};if(link){const label=String(v??link),formula=`HYPERLINK("${String(link).replace(/"/g,'""')}","${label.replace(/"/g,'""').slice(0,250)}")`;return `<c r="${ref}" s="${s}" t="str"><f>${xmlEsc(formula)}</f><v>${xmlEsc(label)}</v></c>`;}if(typeof v==="number"&&Number.isFinite(v))return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;}
  function sheetXml(sheet){const rows=sheet.rows.map((row,i)=>{const n=i+1;if(!row)return `<row r="${n}"/>`;return `<row r="${n}"${row.height?` ht="${row.height}" customHeight="1"`:""}>${row.cells.map((c,j)=>cellXml(`${columnName(j+1)}${n}`,c)).join("")}</row>`;}).join("");const last=columnName(sheet.cols.length),freeze=sheet.freezeRow?`<pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow+1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${sheet.freezeRow+1}" sqref="A${sheet.freezeRow+1}"/>`:"";return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${last}${Math.max(1,sheet.rows.length)}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0">${freeze}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${sheet.cols.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows}</sheetData>${sheet.autoFilter?`<autoFilter ref="${sheet.autoFilter}"/>`:""}${sheet.merges?.length?`<mergeCells count="${sheet.merges.length}">${sheet.merges.map((r)=>`<mergeCell ref="${r}"/>`).join("")}</mergeCells>`:""}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><drawing r:id="rId1"/></worksheet>`;}
  function letterheadRows(title,subtitle,columns,titleColumn=2){const lead=Array.from({length:titleColumn},()=>null),pad=(cells)=>[...cells,...Array.from({length:Math.max(0,columns-cells.length)},()=>null)];return[{height:22,cells:pad([])},{height:28,cells:pad([...lead,{v:title,s:XS.title}])},{height:20,cells:pad([...lead,{v:subtitle,s:XS.subtitle}])},{height:20,cells:pad([])},null];}
  function calendarSheet(report){const cols=12,rows=letterheadRows("Calendário de metas",`Referência ${dateBR(report.referenceDate)} · ${report.scopeLabel} · ${dateTimeBR(report.generatedAt)}`,cols,3),merges=[];for(const period of report.periods){const start=rows.length+1;rows.push({height:26,cells:[{v:`${period.title.toUpperCase()} — ${periodRange(period.data)}`,s:XS.section},...Array.from({length:cols-1},()=>({v:"",s:XS.section}))]});merges.push(`A${start}:${columnName(cols)}${start}`);const m=periodMetrics(period.data,report),k=[["Metas",m.goals],["Concl./produzidas",m.recognized],["Cumprimento",`${m.percent}%`],["Planejado",minutesLabel(m.planned)],["Realizado",minutesLabel(m.actual)]];rows.push({cells:k.flatMap(([l])=>[{v:l,s:XS.kpiLabel},{v:"",s:XS.kpiLabel}]).concat([{v:"",s:XS.kpiLabel},{v:"",s:XS.kpiLabel}])});rows.push({height:24,cells:k.flatMap(([,v])=>[{v:v,s:XS.kpiValue},{v:"",s:XS.kpiValue}]).concat([{v:"",s:XS.kpiValue},{v:"",s:XS.kpiValue}])});rows.push({height:32,cells:["Data","Dia","Tipo do dia","Disciplina","Assunto","Tipo","Planejado (min)","Realizado (min)","Situação","Resumo pronto?","Treino pronto?","Prioridade"].map((v)=>({v,s:XS.header}))});let zebra=false;for(const day of period.data.days||[]){const goals=day.goals.length?day.goals:[null];for(const g of goals){const base=zebra?XS.zebra:XS.cell,num=zebra?XS.numberZebra:XS.number;if(!g){rows.push({cells:[{v:dateBR(day.date),s:base},{v:weekdayOf(day.date),s:base},{v:day.dayType,s:base},{v:"Sem metas",s:base},...Array.from({length:8},()=>({v:"",s:base}))]});continue;}const state=goalState(g,report),out=factoryOutcomeForGoal(g,report);rows.push({cells:[{v:dateBR(day.date),s:base},{v:weekdayOf(day.date),s:base},{v:day.dayType,s:base},{v:g.discipline,s:base},{v:g.subject,s:base},{v:g.type,s:base},{v:Number(g.plannedMinutes)||0,s:num},{v:Number(g.actualMinutes)||0,s:num},{v:STATE_LABEL[state],s:XS[state]},{v:outcomeText(out.summaryLabel,out.summaryDetail),s:out.summaryDone?XS.factory:base},{v:outcomeText(out.trainingLabel,out.trainingDetail),s:out.trainingDone?XS.factory:base},{v:g.priority,s:base}]});}zebra=!zebra;}rows.push(null);}return{name:"Calendário",cols:[12,7,16,26,40,14,13,13,18,46,40,12],rows,merges,freezeRow:5};}
  function factorySheet(name,title,entries,headers,report){const columns=headers.length,rows=letterheadRows(title,`${entries.length} registro(s) · ${report.driveNote}`,columns,1),headerRow=rows.length+1;rows.push({height:34,cells:headers.map((v)=>({v,s:XS.header}))});entries.forEach(({view},index)=>{const zebra=index%2===1,by=Object.fromEntries(view.fields.filter((f)=>!f.statement).map((f)=>[f.label,f]));rows.push({height:42,cells:headers.map((header)=>{const f=by[header];if(!f)return{v:"",s:zebra?XS.zebra:XS.cell};if(f.tone==="warn")return{v:f.value,s:XS.warn};if(f.href)return{v:f.value,link:f.href,s:zebra?XS.linkZebra:XS.link};return{v:f.value,s:zebra?XS.zebra:XS.cell};})});});if(!entries.length)rows.push({cells:[{v:"Nenhum registro elaborado.",s:XS.cell}]});return{name,cols:headers.map((h)=>/LINK|ARQUIVO/.test(h)?42:/PÁGINAS/.test(h)?28:/TEMA/.test(h)?38:/EDITAL/.test(h)?32:/STATUS|RESUMO|TREINO/.test(h)?26:22),rows,merges:[],freezeRow:headerRow,autoFilter:entries.length?`A${headerRow}:${columnName(columns)}${rows.length}`:""};}
  function buildWorkbookFiles(report,logoBytes){const summaryHeaders=["DISCIPLINA","TEMA","EDITAL","ITEM DO EDITAL","RESUMO - TIPO ELABORADO","STATUS NA FÁBRICA","DATA","LINK DA PASTA DESTINO","ARQUIVO WORD","QUANTIDADE DE PÁGINAS DO WORD DO RESUMO","ARQUIVO PDF","QUANTIDADE DE PÁGINAS DO PDF DO RESUMO"],trainingHeaders=["DISCIPLINA","TEMA","EDITAL","ITEM DO EDITAL","TREINO - TIPO","STATUS NA FÁBRICA","DATA","LINK DA PASTA DESTINO","ARQUIVO DO TREINO"];const sheets=[calendarSheet(report),factorySheet("Fábrica - resumos","Fábrica de Resumos — resumos elaborados",report.summaries,summaryHeaders,report),factorySheet("Fábrica - treinos","Fábrica de Resumos — treinos de questões",report.trainings,trainingHeaders,report)],NS="http://schemas.openxmlformats.org",files=[{name:"[Content_Types].xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join("")}</Types>`},{name:"_rels/.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},{name:"xl/workbook.xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${xmlEsc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>`},{name:"xl/_rels/workbook.xml.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},{name:"xl/styles.xml",data:stylesXml()},{name:"xl/media/logo.png",data:logoBytes}];sheets.forEach((s,i)=>{const n=i+1;files.push({name:`xl/worksheets/sheet${n}.xml`,data:sheetXml(s)},{name:`xl/worksheets/_rels/sheet${n}.xml.rels`,data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/></Relationships>`},{name:`xl/drawings/drawing${n}.xml`,data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="${NS}/drawingml/2006/spreadsheetDrawing" xmlns:a="${NS}/drawingml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>57150</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>57150</xdr:rowOff></xdr:from><xdr:ext cx="1600200" cy="586740"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Timbre Aldus Meta"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1600200" cy="586740"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`},{name:`xl/drawings/_rels/drawing${n}.xml.rels`,data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/image" Target="../media/logo.png"/></Relationships>`});});return files;}

  const drive={token:"",expiresAt:0,client:null,pending:null}; const driveReady=()=>Boolean(drive.token&&Date.now()<drive.expiresAt-60000);
  function settleDrive(response){const resolve=drive.pending;drive.pending=null;if(response?.access_token){drive.token=response.access_token;drive.expiresAt=Date.now()+Number(response.expires_in||3600)*1000;resolve?.(true);return;}resolve?.(false);}
  function ensureDriveRead(){if(driveReady())return Promise.resolve(true);let clientId="";try{clientId=typeof GOOGLE_CLIENT_ID!=="undefined"?GOOGLE_CLIENT_ID:"";}catch{}if(!clientId||call("isGoogleClientConfigured")===false)return Promise.resolve(false);const request=()=>new Promise((resolve)=>{const oauth=globalThis.google?.accounts?.oauth2;if(!oauth){resolve(false);return;}drive.pending=resolve;drive.client ||= oauth.initTokenClient({client_id:clientId,scope:DRIVE_READ_SCOPE,include_granted_scopes:true,callback:settleDrive,error_callback:()=>settleDrive(null)});drive.client.requestAccessToken({prompt:""});setTimeout(()=>{if(drive.pending===resolve)settleDrive(null);},180000);});if(globalThis.google?.accounts?.oauth2)return request();return Promise.resolve(call("loadGoogleIdentityServices")).then(request,()=>false);}
  async function driveGet(url,as="json"){const response=await fetch(url,{headers:{Authorization:`Bearer ${drive.token}`}});if(response.status===401||response.status===403){if(response.status===401)drive.token="";const e=new Error(`Google Drive recusou a leitura (${response.status}).`);e.status=response.status;throw e;}if(!response.ok)throw new Error(`Google Drive respondeu ${response.status}.`);return as==="json"?response.json():response.arrayBuffer();}
  const readPageCache=()=>{try{return JSON.parse(localStorage.getItem(PAGE_CACHE_KEY)||"{}")||{};}catch{return{};}}; const writePageCache=(c)=>{try{localStorage.setItem(PAGE_CACHE_KEY,JSON.stringify(c));}catch{}};
  async function loadPdfLibrary(){if(globalThis.__ALDUS_PDFJS__)return globalThis.__ALDUS_PDFJS__;const base=document.baseURI,pdfjs=await import(new URL("vendor/pdf.mjs",base).href);pdfjs.GlobalWorkerOptions.workerSrc=new URL("vendor/pdf.worker.mjs",base).href;globalThis.__ALDUS_PDFJS__=pdfjs;return pdfjs;}
  async function countPdfPagesInDrive(file){const key=`${file.id}|${file.modifiedTime||""}`,cache=readPageCache();if(Number.isFinite(cache[key]))return cache[key];const bytes=await driveGet(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`,"buffer"),pdfjs=await loadPdfLibrary(),doc=await pdfjs.getDocument({data:new Uint8Array(bytes)}).promise,pages=doc.numPages;try{await doc.destroy();}catch{}const next=readPageCache();next[key]=pages;writePageCache(next);return pages;}
  function setStatus(message,error=false){if(typeof globalThis.setGoalCalendarExportStatus==="function"){call("setGoalCalendarExportStatus",message,error);return;}const target=document.getElementById("goalCalendarExportStatus");if(!target)return;target.hidden=false;target.textContent=message;target.classList.toggle("error",error);}
  function collectPeriods(referenceDate,scope){const payload=call("buildGoalCalendarExportPayload",referenceDate),selected=call("selectedGoalCalendarPeriods",payload,scope);if(!payload||!Array.isArray(selected))throw new Error("O calendário ainda não está pronto.");return selected.map(([label,key,data])=>({label,key,data}));}
  const exportFilename=(report,ext)=>`calendario-${call("goalCalendarScopeLabel",report.scope)||report.scope}-${report.referenceDate}.${ext}`;
  function saveBlob(blob,filename){if(call("downloadGeneratedFile",blob,filename)!==undefined)return;if(typeof globalThis.downloadGeneratedFile==="function")return;const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function printReport(report){call("cleanupGoalCalendarPrint");document.getElementById("goalCalendarPrintableReport")?.remove();document.body.insertAdjacentHTML("beforeend",buildPrintHtml(report));document.body.classList.add("calendar-print-mode");const cleanup=()=>{document.body.classList.remove("calendar-print-mode");document.getElementById("goalCalendarPrintableReport")?.remove();};window.addEventListener("afterprint",cleanup,{once:true});setTimeout(()=>window.print(),120);}
  async function logoPngBytes(){const blob=await call("rasterizeSvgToPngBlob",logoSvg(),{width:600,height:220});return new Uint8Array(await blob.arrayBuffer());}
  async function renderPng(svg){const height=Number(svg.match(/viewBox="0 0 1600 (\d+)"/)?.[1])||2000;const scale=height>18000?Math.max(.85,18000/height):1.5;return call("rasterizeSvgToPngBlob",svg,{width:Math.round(1600*scale),height:Math.round(height*scale)});}
  async function prepareReport(){
    const appState=currentState();if(!appState)throw new Error("Os dados ainda estão carregando.");
    const referenceDate=document.getElementById("calendarDate")?.value||todayISO(),scope=document.getElementById("goalCalendarExportScope")?.value||"daily",scopeLabel={daily:"Somente dia",weekly:"Somente semana",monthly:"Somente mês",all:"Dia + semana + mês"}[scope]||scope;
    const periods=collectPeriods(referenceDate,scope),summaries=elaboratedSummaries(appState),trainings=trainingRecords(appState),linker=createGoalLinker(appState),goalLinks=new Map();
    periods.forEach(({data})=>(data.days||[]).forEach((day)=>(day.goals||[]).forEach((goal)=>{const key=goalKey(goal);if(!goalLinks.has(key))goalLinks.set(key,linker.links(goal));})));
    let driveInfo=new Map(),goalDrive=new Map(),driveState="off";
    if(summaries.length||trainings.length||goalLinks.size){
      setStatus("Conferindo a Fábrica e solicitando leitura do Google Drive…");
      if(await ensureDriveRead()){
        try{
          const reader=createDriveReader({get:driveGet,countPdfPages:countPdfPagesInDrive});
          const goals=await reader.resolveGoals(goalLinks,linker.folderIndex,(done,total)=>setStatus(`Conferindo no Google Drive as pastas dos temas das metas: ${done} de ${total}…`));
          goalDrive=goals.results;driveState=goals.state;
          // Arquivo pronto na pasta de um tema cujo status na Fábrica ficou para trás também entra na lista de resumos.
          const known=new Set(summaries.map((r)=>r.id));
          goalDrive.forEach((info)=>(info.foundKinds||[]).forEach(({item,kind})=>{const id=`resumo|${item.id}|${kind}`;if(known.has(id))return;known.add(id);summaries.push(summaryRecord(appState,item,kind,`${text(modulesOf(item)?.[kind]?.status)||"Sem status"} na Fábrica · arquivo encontrado no Drive`));}));
          summaries.sort(recordOrder);
          if(driveState==="on"){const outcome=await reader.resolve([...summaries,...trainings],(done,total)=>setStatus(`Conferindo arquivos da Fábrica no Google Drive: ${done} de ${total}…`));driveInfo=outcome.results;driveState=outcome.state;}
        }catch(e){console.warn(`[Aldus ${VERSION}] Drive falhou.`,e);driveState="error";}
      }
    }
    return buildReport({periods,referenceDate,scope,scopeLabel,summaries,trainings,appState,driveInfo,goalDrive,driveState});
  }
  const ORIGINAL_EXPORTERS={pdf:"exportGoalCalendarPdf",excel:"exportGoalCalendarExcel",image:"exportGoalCalendarImage"}; let running=false;
  async function runExport(kind){if(running)return;running=true;try{const report=await prepareReport(),drivePart=report.driveState==="on"?"com arquivos conferidos no Google Drive":"sem conferência do Google Drive";if(kind==="pdf"){setStatus(`PDF pronto (${drivePart}).`);printReport(report);}else if(kind==="excel"){const zip=globalThis.spreadsheetZipArchive;if(typeof zip!=="function")throw new Error("gerador de planilha indisponível");const archive=zip(buildWorkbookFiles(report,await logoPngBytes()));saveBlob(new Blob([archive],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),exportFilename(report,"xlsx"));setStatus(`Excel completo gerado (${drivePart}).`);}else{const blob=await renderPng(buildSvg(report));saveBlob(blob,exportFilename(report,"png"));setStatus(`Imagem gerada (${drivePart}).`);}}catch(e){console.error(`[Aldus ${VERSION}] Exportação falhou.`,e);setStatus(`Falha na exportação nova (${e?.message||e}).`,true);try{await call(ORIGINAL_EXPORTERS[kind]);}catch{}}finally{running=false;}}
  function interceptExportClick(event){const button=event.target?.closest?.("#exportGoalCalendarPdf, #exportGoalCalendarExcel, #exportGoalCalendarImage");if(!button)return;event.preventDefault();event.stopImmediatePropagation();runExport(BUTTONS[button.id]);}
  function preloadGoogleWhenCalendarOpens(view){if(view!=="calendario-metas"||call("isGoogleClientConfigured")===false)return;Promise.resolve(call("loadGoogleIdentityServices")).catch(()=>{});}

  const api=Object.freeze({VERSION,PREJUDICADO,NO_DATE,DRIVE_NOTES,PRODUCED_STATUSES,elaboratedSummaries,trainingRecords,editalInfo,driveIdFrom,fileKind,pickModuleFiles,createDriveReader,summaryView,trainingView,factoryOutcomeForGoal,createGoalLinker,productKind,isTrainingFile,buildReport,buildPrintHtml,buildSvg,buildWorkbookFiles,runExport});
  globalThis[FLAG]=api;
  if(typeof module!=="undefined"&&module.exports){module.exports=api;return;}
  if(typeof document==="undefined")return;
  document.addEventListener("click",interceptExportClick,true);
  window.addEventListener("aldus:view-active",(event)=>preloadGoogleWhenCalendarOpens(event?.detail?.view));
  if(String(location.hash||"").replace(/^#/,"")==="calendario-metas")preloadGoogleWhenCalendarOpens("calendario-metas");
})();