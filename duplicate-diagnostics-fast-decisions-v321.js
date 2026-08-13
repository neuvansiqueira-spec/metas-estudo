(() => {
  "use strict";
  const VERSION = "20260813-fast-individual-decisions-v321";
  const ROOT = "aldusDuplicateDiagnosticsV260";
  const local = new Map(), removed = new Set(), resolved = new Set(), running = new Set();
  let listObserver, summaryObserver, lastList, lastSummary, scheduled = false;
  const api = () => globalThis.AldusDuplicateDiagnosticsV309 || globalThis.AldusDuplicateDiagnosticsV304 || globalThis.AldusDuplicateDiagnosticsV260;
  const root = () => document.getElementById(ROOT);
  const clone = value => { try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); } };
  const runtime = () => { try { return typeof state !== "undefined" && state && Array.isArray(state.syllabusItems) ? state : null; } catch { return null; } };
  const keyOf = (a, b) => api()?.pairKey ? api().pairKey(a, b) : [String(a), String(b)].sort().join("::");
  const status = (text, type = "info") => { const n = root()?.querySelector("[data-dup-status]"); if (n) { n.textContent = text; n.dataset.type = type; } };

  function mainDb(mode, fn) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("metas-estudo-db", 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains("appState")) req.result.createObjectStore("appState", { keyPath: "id" }); };
      req.onerror = () => reject(req.error || new Error("Falha no banco principal."));
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction("appState", mode), store = tx.objectStore("appState"), op = fn(store);
        tx.oncomplete = () => { db.close(); resolve(op?.result); };
        tx.onerror = () => { db.close(); reject(tx.error || op?.error || new Error("Falha no banco principal.")); };
      };
    });
  }
  async function load() {
    const current = runtime();
    if (current) return { state: current, runtime: true };
    const row = await mainDb("readonly", s => s.get("current")).catch(() => null);
    if (row?.data) return { state: clone(row.data), runtime: false };
    const fallback = JSON.parse(localStorage.getItem("metasConcursoData") || "null");
    if (fallback) return { state: fallback, runtime: false };
    throw new Error("Dados atuais não localizados.");
  }
  async function write(info, verify = false) {
    if (info.runtime && typeof saveData === "function") {
      try { await Promise.resolve(saveData({ markLocalChange: true, skipDerivedRefresh: true })); if (!verify) return; } catch (e) { console.warn(`[${VERSION}] saveData falhou; usando gravação direta.`, e); }
    }
    const text = JSON.stringify(info.state), checksum = api()?.checksumState?.(info.state) || text.length;
    await mainDb("readwrite", s => s.put({ id: "current", schemaVersion: 1, savedAt: new Date().toISOString(), serializedSize: text.length, data: clone(info.state) }));
    try { localStorage.setItem("metasConcursoData", text); } catch {}
    if (verify) {
      const row = await mainDb("readonly", s => s.get("current"));
      const got = api()?.checksumState?.(row?.data) || JSON.stringify(row?.data || {}).length;
      if (!row?.data || got !== checksum) throw new Error("A validação da gravação falhou.");
    }
  }
  function backupDb(mode, fn) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("aldus-duplicate-diagnostics-v260", 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains("snapshots")) req.result.createObjectStore("snapshots", { keyPath: "id" }); };
      req.onerror = () => reject(req.error || new Error("Falha no banco de segurança."));
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction("snapshots", mode), store = tx.objectStore("snapshots"), op = fn(store);
        tx.oncomplete = () => { db.close(); resolve(op?.result); };
        tx.onerror = () => { db.close(); reject(tx.error || op?.error || new Error("Falha no banco de segurança.")); };
      };
    });
  }
  async function backup(stateValue, label) {
    const data = clone(stateValue), checksum = api()?.checksumState?.(data) || String(JSON.stringify(data).length), id = `${Date.now()}-${String(checksum).slice(-12)}`;
    const record = { id, version: VERSION, createdAt: new Date().toISOString(), label, checksum, counts: api()?.stateCounts?.(data) || {}, data };
    await backupDb("readwrite", s => s.put(record));
    const rows = await backupDb("readonly", s => s.getAll()).catch(() => []);
    for (const stale of rows.sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(10)) await backupDb("readwrite", s => s.delete(stale.id));
    try { localStorage.setItem("aldusDuplicateDiagnosticsLastBackupV260", JSON.stringify({ id, createdAt: record.createdAt, checksum, counts: record.counts })); } catch {}
    return record;
  }
  function busy(card, on, text = "") {
    if (!card) return;
    card.classList.toggle("aldus-v321-busy", on); card.setAttribute("aria-busy", String(on));
    card.querySelectorAll("button").forEach(b => { if (on) { b.dataset.v321 = b.disabled ? "1" : "0"; b.disabled = true; } else if (b.dataset.v321) { b.disabled = b.dataset.v321 === "1"; delete b.dataset.v321; } });
    let note = card.querySelector("[data-v321-status]");
    if (on) { if (!note) { note = document.createElement("div"); note.dataset.v321Status = "1"; note.className = "aldus-v321-note"; card.prepend(note); } note.textContent = text || "Salvando…"; } else note?.remove();
  }
  function remember(card, key, action) {
    const classification = card?.dataset.classification || "";
    local.set(key, { action, classification, html: card?.outerHTML || "" });
    if ((action === "not-duplicate" || action === "consolidated") && /^(exact|probable)$/.test(classification)) resolved.add(key);
  }
  function priority() {
    const cards = [...(root()?.querySelectorAll("[data-dup-summary] > div") || [])]; if (cards.length < 5) return;
    const num = i => Number(String(cards[i]?.querySelector("strong")?.textContent || "0").replace(/\D/g, "")) || 0;
    const value = cards[4].querySelector("strong"), label = cards[4].querySelector("span"), next = String(Math.max(0, num(1) + num(2) - resolved.size));
    if (value?.textContent !== next) value.textContent = next; if (label && label.textContent !== "Casos prioritários") label.textContent = "Casos prioritários";
  }
  function cloneLater(entry, key) {
    const t = document.createElement("template"); t.innerHTML = entry.html.trim(); const card = t.content.firstElementChild; if (!card) return null;
    card.dataset.pairKey = key; card.dataset.decision = "later";
    const h = card.querySelector(".aldus-dup-pair-header > div"); if (h && !h.querySelector(".is-later")) h.insertAdjacentHTML("afterbegin", '<span class="aldus-dup-badge is-later">Analisar depois</span>');
    return card;
  }
  function reconcile() {
    scheduled = false; const r = root(), list = r?.querySelector("[data-dup-list]"); if (!list) return; const filter = r.querySelector("[data-dup-filter]")?.value || "probable";
    [...list.querySelectorAll(":scope > .aldus-dup-pair")].forEach(card => {
      const key = String(card.dataset.pairKey || ""), ids = key.split("::"), entry = local.get(key);
      if (ids.some(id => removed.has(id))) { if (/^(exact|probable)$/.test(card.dataset.classification || "")) resolved.add(key); card.remove(); return; }
      if (!entry) return;
      if (entry.action === "not-duplicate" || entry.action === "consolidated") card.remove();
      else if (entry.action === "later") { card.dataset.decision = "later"; if (filter !== "later") card.remove(); }
    });
    if (filter === "later") local.forEach((entry, key) => { if (entry.action !== "later" || removed.size && key.split("::").some(id => removed.has(id)) || [...list.children].some(c => c.dataset?.pairKey === key)) return; const c = cloneLater(entry, key); if (c) list.appendChild(c); });
    priority();
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(reconcile); } }
  function removeItem(id) {
    removed.add(String(id)); const list = root()?.querySelector("[data-dup-list]");
    [...(list?.querySelectorAll(":scope > .aldus-dup-pair") || [])].forEach(card => { const key = String(card.dataset.pairKey || ""); if (!key.split("::").includes(String(id))) return; if (/^(exact|probable)$/.test(card.dataset.classification || "")) resolved.add(key); card.remove(); });
  }

  async function simple(action, decision) {
    const left = action.dataset.leftId, right = action.dataset.rightId, key = keyOf(left, right), card = action.closest(".aldus-dup-pair");
    if (!left || !right || running.size) return; running.add(key); busy(card, true, decision === "not-duplicate" ? "Registrando decisão…" : "Movendo para analisar depois…");
    try { const info = await load(); api().setPairDecision(info.state, left, right, decision); await write(info, false); remember(card, key, decision); if (decision === "not-duplicate" || root()?.querySelector("[data-dup-filter]")?.value !== "later") card?.remove(); else busy(card, false); schedule(); status(decision === "not-duplicate" ? "Par marcado como não duplicado. Próximo caso disponível." : "Par separado para analisar depois. Próximo caso disponível.", "success"); }
    catch (e) { console.error(`[${VERSION}]`, e); busy(card, false); status(`A decisão não foi salva: ${e?.message || e}`, "error"); }
    finally { running.delete(key); }
  }
  async function consolidate(action) {
    const keep = action.dataset.keepId, drop = action.dataset.removeId, key = keyOf(keep, drop), card = action.closest(".aldus-dup-pair"); if (!keep || !drop || running.size) return;
    const topics = [...(card?.querySelectorAll(".aldus-dup-topic") || [])].map(n => n.textContent.trim()), side = /Manter B/i.test(action.textContent || "") ? 1 : 0;
    if (!confirm(`Manter “${topics[side] || keep}” e consolidar “${topics[side ? 0 : 1] || drop}”?\n\nSerá criada uma cópia integral de segurança antes da alteração.`)) return;
    running.add(key); busy(card, true, "Criando backup e consolidando vínculos…"); const start = performance.now(); let info, rollback;
    try { info = await load(); rollback = clone(info.state); const snap = await backup(info.state, `before-${key}`); await new Promise(r => requestAnimationFrame(r)); busy(card, true, "Remapeando vínculos…"); const result = api().consolidateItems(info.state, keep, drop, { backupId: snap.id }); busy(card, true, "Validando gravação…"); await write(info, true); remember(card, key, "consolidated"); removeItem(drop); card?.remove(); const undo = root()?.querySelector("[data-dup-undo]"); if (undo) undo.disabled = false; schedule(); status(`Consolidação concluída em ${((performance.now()-start)/1000).toFixed(1)}s: ${result.remappedLinks || 0} vínculos remapeados. Sem recarregar a página.`, "success"); }
    catch (e) { if (info?.state && rollback) { try { api()?.replaceStateContents?.(info.state, rollback); await write(info, true); } catch {} } console.error(`[${VERSION}]`, e); busy(card, false); status(`A consolidação não foi concluída: ${e?.message || e}`, "error"); }
    finally { running.delete(key); }
  }
  function click(event) {
    const r = root(), action = event.target.closest?.("[data-action]"); if (!r || r.hidden || !action || !r.contains(action) || !["keep","not-duplicate","later"].includes(action.dataset.action)) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    if (action.dataset.action === "keep") void consolidate(action); else void simple(action, action.dataset.action);
  }
  function observe() {
    const r = root(); if (!r) return false; const list = r.querySelector("[data-dup-list]"), summary = r.querySelector("[data-dup-summary]");
    if (list && list !== lastList) { listObserver?.disconnect(); lastList = list; listObserver = new MutationObserver(schedule); listObserver.observe(list, { childList: true }); }
    if (summary && summary !== lastSummary) { summaryObserver?.disconnect(); lastSummary = summary; summaryObserver = new MutationObserver(schedule); summaryObserver.observe(summary, { childList: true, subtree: true, characterData: true }); }
    return Boolean(list);
  }
  function install() {
    if (globalThis.__aldusFastIndividualDecisionsV321 === VERSION) return; globalThis.__aldusFastIndividualDecisionsV321 = VERSION;
    const style = document.createElement("style"); style.textContent = `#${ROOT} .aldus-v321-busy{position:relative}#${ROOT} .aldus-v321-busy:after{content:"";position:absolute;inset:0;background:rgba(255,255,255,.38);pointer-events:none;border-radius:inherit}#${ROOT} .aldus-v321-note{position:relative;z-index:4;margin:0 0 10px;padding:9px 12px;border-radius:10px;font-weight:800;background:#eef6ff;border:1px solid #9cc7ef;color:#123b62}`; document.head.appendChild(style);
    document.addEventListener("click", click, true); document.addEventListener("change", e => { if (e.target?.matches?.(`#${ROOT} [data-dup-filter]`)) setTimeout(schedule, 0); }, true);
    if (!observe()) { const o = new MutationObserver(() => { if (observe()) { o.disconnect(); schedule(); } }); o.observe(document.documentElement, { childList: true, subtree: true }); } schedule();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true }); else install();
})();
