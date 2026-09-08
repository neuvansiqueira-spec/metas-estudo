(async () => {
  "use strict";
  const mode = "undo";
  const START = "2026-09-08", KEY = "backupMetasV610";
  const copy = x => JSON.parse(JSON.stringify(x));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const date = g => String(g.date || g.data || "").slice(0, 10);
  const canon = x => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const minutes = g => Math.max(0, Number(g.minutes ?? g.minutos ?? g.plannedMinutes) || 0);
  const timed = g => Number(g.actualMinutes) > 0 || Number(g.tempoReal) > 0;
  const fixed = g => timed(g) || g.completed === true || ["concluida", "concluido"].includes(canon(g.status));
  const piece = g => g.fixedDailyPieceV183 || canon(g.origin || g.origem) === "planejamento peca diaria";
  const nextDate = d => { const value = new Date(`${d}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + 1); return value.toISOString().slice(0, 10); };
  function report(before, after) {
    const dates = [...new Set([...before, ...after].map(date).filter(d => d >= START))].sort();
    const rows = dates.map(d => {
      const a = before.filter(g => date(g) === d), b = after.filter(g => date(g) === d);
      return { data: d, metasAntes: a.length, minutosAntes: a.reduce((n,g) => n + minutes(g),0),
        metasDepois: b.length, minutosDepois: b.reduce((n,g) => n + minutes(g),0), cotasDepois: b.filter(g => g.simulado3V605).length };
    });
    console.table(rows);
    return rows;
  }
  if (typeof state === "undefined" || !Array.isArray(state.dailyGoals)) throw new Error("Abra o console do Aldus Meta com os dados carregados.");
  if (typeof bootstrapStateReady !== "undefined" && !bootstrapStateReady) throw new Error("Aguarde o carregamento dos dados.");
  if (typeof indexedDBPersistInFlight !== "undefined" && indexedDBPersistInFlight || typeof indexedDBPersistQueued !== "undefined" && indexedDBPersistQueued) throw new Error("Há um salvamento em andamento. Aguarde sua conclusão e execute novamente.");
  if (typeof loadStateFromIndexedDB !== "function" || typeof saveStateToIndexedDB !== "function" || typeof validateIndexedDBState !== "function") throw new Error("Persistência IndexedDB indisponível; nenhum dado foi alterado.");
  const before = state.dailyGoals.slice();
  const beforeJson = JSON.stringify(state);
  const persisted = await loadStateFromIndexedDB();
  if (JSON.stringify(state) !== beforeJson) throw new Error("Os dados mudaram durante a leitura. Execute novamente com o cronômetro parado.");
  if (!validateIndexedDBState(persisted) || !persisted.checksum) throw new Error("O IndexedDB não está validado; nenhum dado foi alterado.");
  if (typeof indexedDBPersistBaseChecksum !== "undefined" && indexedDBPersistBaseChecksum && indexedDBPersistBaseChecksum !== persisted.checksum) throw new Error("Outra aba alterou os dados. Sincronize o aplicativo antes de executar.");
  let after, backup;
  if (mode === "apply") {
    if (Object.prototype.hasOwnProperty.call(state, KEY)) throw new Error("backupMetasV610 já existe. Não será sobrescrito nem a operação repetida.");
    const targets = before.filter(g => date(g) >= START && !piece(g) && (g.dataOriginalV605 || g.simulado3V605));
    const ids = new Set();
    for (const g of targets) {
      if (!g.id || ids.has(g.id) || before.filter(x => x.id === g.id).length !== 1) throw new Error("Uma meta-alvo não tem identificador único. Nenhum dado foi alterado.");
      ids.add(g.id);
      if (g.dataOriginalV605 && g.simulado3V605) throw new Error("Uma meta possui os dois carimbos. Revise essa inconsistência antes de executar.");
    }
    const removed = targets.filter(g => g.dataOriginalV605 && !fixed(g));
    const movable = targets.filter(g => g.simulado3V605 && !fixed(g)).sort((a,b) => minutes(b)-minutes(a) || String(a.id).localeCompare(String(b.id)));
    const movableIds = new Set(movable.map(g => g.id));
    const slots = new Map();
    for (const g of before) if (g.simulado3V605 && !movableIds.has(g.id) && date(g) >= START) slots.set(date(g),(slots.get(date(g)) || 0)+1);
    const moved = [], assigned = new Map();
    let d = START;
    while (movable.length) {
      let capacity = Math.max(0, 2-(slots.get(d)||0));
      let heavy = true;
      while (capacity > 0 && movable.length) {
        const old = heavy && !(before.some(g => !movableIds.has(g.id) && g.simulado3V605 && date(g) === d && minutes(g)>=120)) ? movable.shift() : movable.pop();
        const goal = { ...copy(old), date: d, data: d };
        assigned.set(old.id, goal);
        if (!same(old,goal)) moved.push({ before: copy(old), after: copy(goal) });
        capacity--; heavy = false;
      }
      d = nextDate(d);
    }
    const removedIds = new Set(removed.map(g => g.id));
    after = before.filter(g => !removedIds.has(g.id)).map(g => assigned.get(g.id) || g);
    backup = { version: 610, status: "applied", fromDate: START, appliedAt: new Date().toISOString(),
      removed: removed.map(g => ({ index: before.indexOf(g), goal: copy(g) })), moved,
      expected: { delta: 36, simulado: 17 }, observed: { delta: targets.filter(g => g.dataOriginalV605).length, simulado: targets.filter(g => g.simulado3V605).length },
      protectedIds: targets.filter(fixed).map(g => g.id) };
    console.info("Prévia V610", { retiradasDelta: removed.length, cotasEncontradas: backup.observed.simulado, cotasRedistribuídas: moved.length, protegidas: backup.protectedIds.length });
  } else {
    const saved = state[KEY];
    if (saved?.version !== 610 || saved.status !== "applied" || !Array.isArray(saved.removed) || !Array.isArray(saved.moved)) throw new Error("Não existe aplicação V610 ativa para desfazer.");
    for (const entry of saved.moved) {
      const current = before.filter(g => g.id === entry.after.id);
      if (current.length !== 1 || !same(current[0],entry.after) || timed(current[0])) throw new Error("Uma cota mudou após a aplicação. O desfazer foi interrompido para preservar seu trabalho.");
    }
    for (const entry of saved.removed) if (before.some(g => g.id === entry.goal.id)) throw new Error("Uma aula retirada já voltou ao plano. Revise antes de desfazer para não duplicar metas.");
    const restored = new Map(saved.moved.map(entry => [entry.after.id, copy(entry.before)]));
    after = before.map(g => restored.get(g.id) || g);
    for (const entry of saved.removed.slice().sort((a,b)=>a.index-b.index)) after.splice(Math.min(entry.index,after.length),0,copy(entry.goal));
    backup = { ...copy(saved), status: "undone", undoneAt: new Date().toISOString() };
  }
  const rows = report(before,after);
  const candidate = copy({ ...state, dailyGoals: after, [KEY]: backup });
  // Escrita atomica com checksum: sem mesclagem que ressuscite aulas retiradas.
  // Os comandos nao invocam saveData/render, que normalizam metas preexistentes.
  const hadBackup = Object.prototype.hasOwnProperty.call(state,KEY), oldBackup = state[KEY];
  state.dailyGoals = after; state[KEY] = backup;
  const submittedJson = JSON.stringify(state);
  const ownsLock = typeof indexedDBPersistInFlight !== "undefined";
  if (ownsLock) indexedDBPersistInFlight = true;
  let committed = false;
  try {
    const saved = await saveStateToIndexedDB(candidate,{ directSnapshot: true, expectedChecksum: persisted.checksum });
    committed = true;
    if (typeof indexedDBPersistBaseChecksum !== "undefined") indexedDBPersistBaseChecksum = saved.checksum;
    const verified = await loadStateFromIndexedDB();
    if (!validateIndexedDBState(verified) || verified.checksum !== saved.checksum) throw new Error("A gravação ocorreu, mas a releitura divergiu. Preserve esta aba e confira o backup antes de continuar.");
    if (typeof markLocalUpdated === "function") markLocalUpdated();
    if (typeof publishIndexedDBPersistenceSignal === "function") publishIndexedDBPersistenceSignal(saved);
    console.info(mode === "apply" ? "V610 aplicada e verificada no IndexedDB. Backup preservado. Recarregue o site para atualizar a tela." : "V610 desfeita e verificada no IndexedDB. Recarregue o site para atualizar a tela.");
    return { mode, removed: backup.removed.length, moved: backup.moved.length, rows };
  } catch (error) {
    if (!committed && JSON.stringify(state) === submittedJson) {
      state.dailyGoals = before;
      if (hadBackup) state[KEY] = oldBackup; else delete state[KEY];
    }
    throw error;
  } finally {
    if (ownsLock) indexedDBPersistInFlight = false;
  }
})();
