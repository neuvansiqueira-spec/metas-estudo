/* V647 — "Tema específico" fora dos temas da Fábrica.
   Pedido dele (28/09/2026): se o tema é específico, não faz sentido ele ficar
   dentro de um tema. Antes (V639, bloco 4) o prompt usava as pastas do cartão
   onde estava, e o arquivo de um assunto ia parar na pasta de outro.

   Agora é um painel próprio no topo da Fábrica: Disciplina, Tema específico,
   Recorte e Pasta de destino (vem preenchida com a pasta da disciplina, do
   catálogo V222, e aceita outro link do Drive). Os mesmos 7 prompts.

   O prompt é montado pelo mesmo gerador do site (factoryPromptText) com um tema
   avulso que só existe na memória desta tela: não cria meta, não entra na
   Fábrica e nada é gravado. Os botões usam data-factory-prompt e o texto fica em
   data-factory-prompt-text, então a busca do bridge (V630/V631/V632) funciona
   igual, lendo a linha "Tema:". */
(() => {
  "use strict";
  const VERSION = "20260928-tema-especifico-avulso-v647";
  const KEY = "__ALDUS_FACTORY_TEMA_ESPECIFICO_V647__";
  const ID = "tema-especifico-avulso-v647";
  const PAINEL = "aldusTemaEspecificoV647";
  const STYLE_ID = "aldusTemaEspecificoEstiloV647";
  if (globalThis[KEY]) return;

  const TIPOS = [
    ["resumoAulaJurisprudencia", "RESUMO/AULA + JURISPRUDÊNCIA"],
    ["leiJurisprudencia", "LEI + JURISPRUDÊNCIA"],
    ["jurisprudencia", "JURISPRUDÊNCIA"],
    ["triagem", "TRIAGEM"],
    ["resumoAula", "RESUMO/AULA"],
    ["lei", "LEI"],
    ["peca", "PEÇA"]
  ];

  const byId = (id) => document.getElementById(id);
  const texto = (v) => String(v ?? "").trim();
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function agenda() {
    try { return typeof ensureFactoryAgenda === "function" ? ensureFactoryAgenda() : []; } catch { return []; }
  }
  function disciplinas() {
    const nomes = new Set();
    for (const item of agenda()) if (texto(item?.disciplina)) nomes.add(texto(item.disciplina));
    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  // Pasta da disciplina, pelo mesmo catálogo que a Fábrica usa (V222).
  function pastaDaDisciplina(disciplina) {
    try {
      const catalogo = globalThis.__FACTORY_DESTINATION_CATALOG_V222__;
      const resolver = globalThis.__resolveFactoryDestinationDisciplineV222;
      if (!catalogo || typeof resolver !== "function" || !disciplina) return "";
      return texto(resolver({ disciplina }, catalogo)?.entry?.folder?.url);
    } catch { return ""; }
  }

  const ehLinkDoDrive = (v) => /^https:\/\/drive\.google\.com\//i.test(texto(v));

  function estilo() {
    if (byId(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    // Como na V639: só borda colorida; fundo e texto herdados (as variáveis do :root são claras).
    s.textContent = `
      #${PAINEL} .te-corpo { display: grid; gap: 10px; }
      #${PAINEL} .te-campos { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
      #${PAINEL} .te-campos label { display: grid; gap: 4px; font-size: .82rem; font-weight: 700; }
      #${PAINEL} .te-campos .te-largo { grid-column: 1 / -1; }
      #${PAINEL} .te-campos input, #${PAINEL} .te-campos select { padding: 8px 10px; border-radius: 12px; font: inherit; font-weight: 400; }
      #${PAINEL} .te-pasta-acoes { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: .78rem; font-weight: 400; opacity: .85; }
      #${PAINEL} .te-pasta-acoes button { width: auto; min-height: 0; padding: 4px 10px; font-size: .78rem; }
      #${PAINEL} .te-botoes { display: flex; flex-wrap: wrap; gap: 8px; }
      #${PAINEL} .te-botoes button { font-size: .86rem; width: auto !important; flex: 0 1 auto !important; margin: 0 !important; }
      #${PAINEL} .te-aviso { margin: 0; font-size: .8rem; opacity: .85; }
      #${PAINEL} .te-saida textarea { width: 100%; min-height: 180px; }
      #${PAINEL} .te-saida .card-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    `;
    document.head.appendChild(s);
  }

  function montar() {
    const view = byId("view-fabrica-resumos");
    if (!view || byId(PAINEL)) return Boolean(byId(PAINEL));
    estilo();
    const painel = document.createElement("details");
    painel.id = PAINEL;
    // Mesmo formato dos blocos do topo da Fábrica (factory-simple-v163).
    painel.className = "factory-top-panel-v163";
    painel.innerHTML = `
      <summary><span class="factory-panel-title-v163"><strong>Tema específico</strong><small>Assunto fora dos temas da Fábrica: escolha a disciplina, o tema e a pasta de destino.</small></span></summary>
      <div class="factory-top-content-v163 te-corpo">
        <div class="te-campos">
          <label>Disciplina<select data-te="disciplina"><option value="">Selecione</option>${disciplinas().map((d) => `<option>${esc(d)}</option>`).join("")}</select></label>
          <label>Tema específico<input type="text" data-te="tema" placeholder="ex.: busca pessoal em abordagem policial"></label>
          <label>Recorte (opcional)<input type="text" data-te="recorte" placeholder="ex.: revisão de jurisprudência 2025–2026"></label>
          <label class="te-largo">Pasta de destino no Google Drive
            <input type="url" data-te="pasta" placeholder="escolha a disciplina ou cole o link de uma pasta do Drive">
            <span class="te-pasta-acoes"><span data-te="pasta-info"></span><button type="button" class="secondary-button" data-te-acao="pasta-disciplina">Usar a pasta da disciplina</button></span>
          </label>
        </div>
        <div class="te-botoes">${TIPOS.map(([tipo, nome]) => `<button type="button" class="secondary-button" data-factory-prompt="${ID}|${tipo}">${nome}</button>`).join("")}</div>
        <p class="te-aviso">Não cria meta nem altera a Fábrica. O arquivo vai para a pasta indicada acima.</p>
        <p class="te-aviso" data-factory-prompt-message="${ID}" aria-live="polite"></p>
        <div class="te-saida" data-te="saida" hidden>
          <h4 data-te="titulo">Prompt</h4>
          <textarea readonly data-factory-prompt-text="${ID}"></textarea>
          <div class="card-actions">
            <button type="button" data-te-acao="copiar" data-factory-prompt-copy="${ID}">Copiar prompt completo</button>
            <button type="button" class="secondary-button" data-te-acao="copiar-roteador">Copiar prompt roteador</button>
          </div>
          <textarea readonly hidden data-factory-router-text="${ID}"></textarea>
        </div>
      </div>`;
    posicionar(painel);

    const campo = (nome) => painel.querySelector(`[data-te="${nome}"]`);
    const info = campo("pasta-info");
    let pastaAutomatica = "";
    const atualizarInfoPasta = () => {
      const valor = texto(campo("pasta").value);
      info.textContent = !valor ? "Sem pasta: o prompt sai sem indicação de onde salvar."
        : valor === pastaAutomatica ? "Pasta da disciplina."
        : ehLinkDoDrive(valor) ? "Pasta escolhida por você." : "Isso não parece um link de pasta do Google Drive.";
    };
    const usarPastaDaDisciplina = () => {
      pastaAutomatica = pastaDaDisciplina(campo("disciplina").value);
      campo("pasta").value = pastaAutomatica;
      atualizarInfoPasta();
    };
    painel.addEventListener("toggle", () => {
      // A lista de disciplinas é lida ao abrir (a Fábrica pode ter mudado).
      if (!painel.open) return;
      const select = campo("disciplina");
      const atual = select.value;
      select.innerHTML = `<option value="">Selecione</option>${disciplinas().map((d) => `<option>${esc(d)}</option>`).join("")}`;
      select.value = atual;
    });
    campo("disciplina").addEventListener("change", () => {
      // Troca de disciplina: só substitui a pasta se ela era a automática (ou vazia).
      const valor = texto(campo("pasta").value);
      if (!valor || valor === pastaAutomatica) usarPastaDaDisciplina();
      else { pastaAutomatica = pastaDaDisciplina(campo("disciplina").value); atualizarInfoPasta(); }
    });
    campo("pasta").addEventListener("input", atualizarInfoPasta);
    painel.addEventListener("click", aoClicar);
    atualizarInfoPasta();
    return true;
  }

  // Bloco próprio no topo da Fábrica, ao lado do outro gerador avulso (Simulado
  // discursivo). A V163 reorganiza o topo depois de carregar; por isso a posição é
  // conferida de novo a cada instalação.
  function posicionar(painel = byId(PAINEL)) {
    const view = byId("view-fabrica-resumos");
    if (!view || !painel) return;
    const antes = byId("factorySimuladoDiscursivoV619") || byId("factoryInfoPanelV163");
    if (antes && antes.parentNode === view) {
      if (painel.nextElementSibling !== antes || painel.parentNode !== view) view.insertBefore(painel, antes);
    } else if (painel.parentNode !== view) {
      view.appendChild(painel);
    }
  }

  function mensagem(t) {
    const el = document.querySelector(`#${PAINEL} [data-factory-prompt-message="${ID}"]`);
    if (el) el.textContent = t;
  }

  // Tema avulso, só em memória. factoryPromptText lê disciplina, tema e a pasta.
  function temaAvulso(disciplina, tema, pasta) {
    return { id: ID, disciplina, tema, factoryDestinationFolder: pasta, pastaDestinoWordPdf: pasta, destinationFolder: pasta };
  }

  function gerar(tipo) {
    const painel = byId(PAINEL);
    const campo = (nome) => painel.querySelector(`[data-te="${nome}"]`);
    const disciplina = texto(campo("disciplina").value);
    const tema = texto(campo("tema").value);
    const recorte = texto(campo("recorte").value);
    const pasta = texto(campo("pasta").value);
    if (!disciplina) { mensagem("Escolha a disciplina."); campo("disciplina").focus(); return false; }
    if (!tema) { mensagem("Escreva o tema específico."); campo("tema").focus(); return false; }
    if (pasta && !ehLinkDoDrive(pasta)) { mensagem("A pasta precisa ser um link do Google Drive (https://drive.google.com/…)."); campo("pasta").focus(); return false; }
    if (typeof factoryPromptText !== "function") { mensagem("O gerador de prompts da Fábrica ainda não carregou. Aguarde e tente de novo."); return false; }
    const item = temaAvulso(disciplina, tema, pasta);
    let completo = factoryPromptText(tipo, item, "full");
    let roteador = factoryPromptText(tipo, item, "router");
    if (recorte) {
      const comRecorte = (t) => String(t).replace(/^(Tema:.*)$/mi, `$1\nRecorte pedido: ${recorte}`);
      completo = comRecorte(completo);
      roteador = comRecorte(roteador);
    }
    // Síncrono: o bridge lê a linha "Tema:" deste campo num microtask depois do clique.
    painel.querySelector(`[data-factory-prompt-text="${ID}"]`).value = completo;
    painel.querySelector(`[data-factory-router-text="${ID}"]`).value = roteador;
    campo("saida").hidden = false;
    const nome = (TIPOS.find(([t]) => t === tipo) || [tipo, tipo])[1];
    campo("titulo").textContent = `Prompt — ${nome} — ${disciplina} — ${tema}`;
    mensagem(pasta ? `Prompt gerado para: ${tema}. Pasta de destino incluída.` : `Prompt gerado para: ${tema}, sem pasta de destino.`);
    return true;
  }

  async function copiar(roteador) {
    const alvo = document.querySelector(`#${PAINEL} [${roteador ? "data-factory-router-text" : "data-factory-prompt-text"}="${ID}"]`);
    if (!alvo?.value) return;
    try { await navigator.clipboard.writeText(alvo.value); }
    catch { alvo.hidden = false; alvo.select(); document.execCommand("copy"); if (roteador) alvo.hidden = true; }
    mensagem(roteador ? "Prompt roteador copiado." : "Prompt completo copiado.");
  }

  function aoClicar(evento) {
    const botao = evento.target?.closest?.("button");
    if (!botao) return;
    const prompt = botao.dataset.factoryPrompt;
    if (prompt && prompt.startsWith(`${ID}|`)) {
      evento.preventDefault();
      // Sem stopPropagation: as extensões do bridge ouvem este mesmo clique no document.
      if (!gerar(prompt.split("|")[1])) evento.stopImmediatePropagation?.();
      return;
    }
    if (botao.dataset.teAcao === "copiar") { evento.preventDefault(); copiar(false); }
    if (botao.dataset.teAcao === "copiar-roteador") { evento.preventDefault(); copiar(true); }
    if (botao.dataset.teAcao === "pasta-disciplina") {
      evento.preventDefault();
      const painel = byId(PAINEL);
      const campo = (nome) => painel.querySelector(`[data-te="${nome}"]`);
      campo("pasta").value = pastaDaDisciplina(campo("disciplina").value);
      campo("pasta").dispatchEvent(new Event("input"));
    }
  }

  function instalar() {
    if (typeof document === "undefined") return false;
    const ok = montar();
    posicionar();
    return ok;
  }

  const api = Object.freeze({ version: VERSION, id: ID, tipos: TIPOS, instalar, gerar, temaAvulso, pastaDaDisciplina });
  globalThis[KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") {
    for (const nome of ["load", "aldus:bootstrap-ready", "aldus:post-bootstrap-maintenance-complete", "hashchange"]) window.addEventListener(nome, instalar);
    if (typeof document !== "undefined" && document.readyState !== "loading") instalar();
    else if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", instalar, { once: true });
    for (const ms of [800, 2500, 6000]) setTimeout(instalar, ms);
  }
})();
