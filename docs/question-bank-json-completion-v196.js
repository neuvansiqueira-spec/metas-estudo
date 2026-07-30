(() => {
  "use strict";

  const VERSION = "20260730-confirmacao-final-json-qconcursos-v196";
  if (globalThis.__ALDUS_QB_JSON_COMPLETION_V196__) return;

  function text(value) { return String(value ?? "").trim(); }
  function escapeHtml(value) {
    return text(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function reviewSnapshot(modal) {
    const stats = {};
    modal?.querySelectorAll(".aldus-json-review-stat-v192").forEach((card) => {
      const label = text(card.querySelector("span")?.textContent);
      const value = Number.parseInt(text(card.querySelector("strong")?.textContent), 10) || 0;
      if (label) stats[label] = value;
    });
    return {
      stats,
      note: text(modal?.querySelector(".aldus-json-review-note-v192")?.textContent),
      fileName: text(modal?.querySelector(".aldus-json-review-head-v192 > div > p:last-child")?.textContent)
    };
  }

  function completionMessage(snapshot, pageMessage) {
    const stats = snapshot?.stats || {};
    const valid = stats["Questões válidas"] || 0;
    const created = stats.Novas || 0;
    const updated = stats.Atualizadas || 0;
    const unchanged = stats["Sem alteração"] || 0;
    const duplicate = /já existe|não será duplicado/i.test(snapshot?.note || "");
    if (duplicate && !created && !updated) {
      return `Nenhuma alteração era necessária. As ${valid || unchanged} questão(ões) e o desempenho deste arquivo já estavam registrados; nada foi duplicado.`;
    }
    if (!created && !updated && unchanged) {
      return `Importação concluída. As ${unchanged} questão(ões) já estavam atualizadas no banco.`;
    }
    return pageMessage || `Importação concluída: ${created} nova(s), ${updated} atualizada(s) e ${unchanged} sem alteração.`;
  }

  function showCompletion(snapshot, pageMessage, isError = false) {
    document.getElementById("aldusQbJsonCompletionV196")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "aldusQbJsonCompletionV196";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:18px;background:rgba(2,12,25,.72)";
    const title = isError ? "Não foi possível concluir" : "Importação concluída";
    const message = isError ? (pageMessage || "Ocorreu um erro ao salvar a importação.") : completionMessage(snapshot, pageMessage);
    const stats = snapshot?.stats || {};
    const visibleStats = ["Questões válidas", "Novas", "Atualizadas", "Sem alteração", "Certas", "Erradas", "Não respondidas"]
      .filter((label) => Object.prototype.hasOwnProperty.call(stats, label))
      .map((label) => `<article style="border:1px solid #cbd5e1;border-radius:10px;padding:8px;background:#fff"><span style="display:block;color:#526174;font-size:.76rem;font-weight:600">${escapeHtml(label)}</span><strong style="display:block;color:#10233c;font-size:1.05rem;margin-top:2px">${stats[label]}</strong></article>`)
      .join("");
    overlay.innerHTML = `<section style="width:min(720px,94vw);max-height:88vh;overflow:auto;background:#f8fafc;color:#172033;border:1px solid #d5dde8;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.38);padding:22px">
      <p style="margin:0 0 5px;color:${isError ? "#9b2c2c" : "#17603a"};font-weight:800;letter-spacing:.04em">${isError ? "ATENÇÃO" : "SALVAMENTO CONCLUÍDO"}</p>
      <h2 style="margin:0 0 10px;color:#172033">${title}</h2>
      ${snapshot?.fileName ? `<p style="margin:0 0 12px;color:#526174">${escapeHtml(snapshot.fileName)}</p>` : ""}
      <p style="margin:0 0 14px;line-height:1.55;color:#243449">${escapeHtml(message)}</p>
      ${visibleStats ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:14px 0">${visibleStats}</div>` : ""}
      <div style="display:flex;justify-content:flex-end;margin-top:16px"><button type="button" data-json-completion-close style="min-width:160px;padding:11px 18px;border:1px solid #1f4fa8;border-radius:10px;background:linear-gradient(135deg,#3379e6,#2357b8);color:#fff;font-weight:800;cursor:pointer">Entendi</button></div>
    </section>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener("click", (event) => { if (event.target === overlay || event.target.closest("[data-json-completion-close]")) close(); });
    overlay.querySelector("[data-json-completion-close]")?.focus();
  }

  function observeConfirmation(event) {
    const button = event.target?.closest?.("[data-json-review-confirm]");
    if (!button) return;
    const modal = button.closest("#aldusQbJsonReviewV192");
    if (!modal) return;
    const snapshot = reviewSnapshot(modal);
    window.setTimeout(() => {
      if (document.getElementById("aldusQbJsonReviewV192")) return;
      const pageMessage = text(document.getElementById("qbMessage")?.textContent);
      showCompletion(snapshot, pageMessage, /^erro\b/i.test(pageMessage));
    }, 120);
  }

  if (typeof document !== "undefined") document.addEventListener("click", observeConfirmation, true);
  const api = Object.freeze({ version: VERSION, reviewSnapshot, completionMessage, showCompletion, observeConfirmation });
  globalThis.AldusQuestionBankJsonCompletionV196 = api;
  globalThis.__ALDUS_QB_JSON_COMPLETION_V196__ = api;
})();