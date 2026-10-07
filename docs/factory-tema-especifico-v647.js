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
   igual, lendo a linha "Tema:".

   V647.5 (07/10/2026, pedido dele): opção de, ao gerar o prompt, colocar o tema também
   no Plano do Dia, com o dia e o tempo planejado escolhidos aqui. Desmarcada, nada é
   gravado, como antes. Marcada, a meta é criada pela função do site (V661.1), a mesma
   do "Tema específico, fora do edital" do Com detalhes. */
(() => {
  "use strict";
  const VERSION = "20261007-tema-especifico-plano-do-dia-v647-5";
  const KEY = "__ALDUS_FACTORY_TEMA_ESPECIFICO_V647__";
  const ID = "tema-especifico-avulso-v647";
  const PAINEL = "aldusTemaEspecificoV647";
  const STYLE_ID = "aldusTemaEspecificoEstiloV647";
  if (globalThis[KEY]) return;

  // 29/09/2026 (pedido dele): 01_FONTES_BRUTAS_POR_ORIGEM › 97_TEMAS_ESPECIFICOS › <disciplina> › <tema>.
  // Pastas criadas no Drive dele nessa data, com os mesmos nomes das disciplinas das fontes brutas.
  const PASTA_BASE = { nome: "97_TEMAS_ESPECIFICOS", url: "https://drive.google.com/drive/folders/19NMp9CcPTqq9lJ0D8Hh_iWP8sdU8sgjD" };
  const SUBPASTAS = [
    ["01_DIREITO_PENAL", "1E55bQAESLhp6bA4nQ3p7FyIEb7vMhBzP"],
    ["02_DIREITO_PROCESSUAL_PENAL", "1kGsOVfTVQEn-EzDrqPg9ooPf2hzDGKGC"],
    ["03_LEGISLACAO_PENAL_E_LEGISLACAO_PROCESSUAL_PENAL_EXTRAVAGANTE", "1fLjhP7USN4kPE6AqI-khEIy0ZHi2UV3u"],
    ["04_DIREITO_CONSTITUCIONAL", "12MEEYe8a6-cnDHCVJ1wFuNrFpuj8rKYd"],
    ["05_DIREITO_ADMINISTRATIVO_E_GESTAO_PUBLICA", "1wPuXFgRhgRb0qwdOp6tG7KlaRzMcZuoT"],
    ["06_LEGISLACAO_ESTADUAL_E_INSTITUCIONAL", "1VTNjY6zoTrAhrNMteaffGGz5QXzTE7-A"],
    ["07_DIREITOS_HUMANOS", "1R1T-lMi3gkQQ3JIqz33A5MqdHTdta_Cx"],
    ["08_CIENCIAS_FORENSES", "1h_t5asaoE5rRCd8me26X0Rk_Q7PPytL3"],
    ["09_DIREITO_DIGITAL", "1inV2DkEsBgldGmK_TOC9Wz_P2zAAV-ny"],
    ["10_DIREITO_CIVIL", "1xkvEElFGB4b4zSG4jnIpwCIG8udqvak9"],
    ["11_DIREITO_PROCESSUAL_CIVIL", "11zF7TeJdzR8VJYck5ShKl2hAXY8qp8vV"],
    ["12_DIREITO_AGRARIO", "1Wu9HZ_sDX-i1ZLM4KvPwiK4A1UzMV0MQ"],
    ["13_DIREITO_AMBIENTAL", "1EFduv1JTA0U32HE29bA2vayjl5XnZwHs"],
    ["14_DIREITO_ADMINISTRATIVO", "1RtEw2_3eMUTdlDQDcV-1xyqMGgiRjkPy"],
    ["15_MEDICINA_LEGAL", "19nAyRvicEIVoMLhAXII4xfNGmLQCujyX"],
    ["16_LEGISLACAO_PENAL_E_PROCESSUAL_PENAL_ESPECIAL", "1HghjkCJjpQTq0EbWOjP8-XJCopedLjUZ"],
    ["17_CRIMINOLOGIA", "1CQeC-xuTMBJpatu7z1d8YPZReEKGVisy"],
    ["90_PECA_PARA_DELEGADO_DE_POLICIA_CIVIL", "1o6xUbXu_UMRphIhR88kkSTJmGuqeJrtC"]
  ].map(([nome, id]) => ({ nome, url: `https://drive.google.com/drive/folders/${id}` }));

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

  const canonico = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  function subpastaDaDisciplina(disciplina) {
    const alvo = canonico(disciplina);
    return SUBPASTAS.find((s) => canonico(s.nome.replace(/^\d+_/, "")) === alvo) || null;
  }

  function regraOndeSalvar(disciplina, tema) {
    const sub = subpastaDaDisciplina(disciplina);
    const lista = SUBPASTAS.map((s) => `- ${s.nome}: ${s.url}`).join("\n");
    return `\n\n==============================\nREGRA FINAL — ONDE SALVAR (TEMAS ESPECÍFICOS)\n==============================\n\n`
      + `1. A PASTA-BASE DOS TEMAS ESPECÍFICOS É ${PASTA_BASE.nome}: ${PASTA_BASE.url}\n`
      + `2. DENTRO DELA HÁ UMA SUBPASTA POR DISCIPLINA:\n${lista}\n`
      + `3. A DISCIPLINA INFORMADA NO CABEÇALHO É “${disciplina}”.${sub ? ` ELA CORRESPONDE À SUBPASTA ${sub.nome}.` : " IDENTIFIQUE A SUBPASTA CORRESPONDENTE PELO CONTEÚDO DO RESUMO."}\n`
      + `4. DENTRO DA SUBPASTA DA DISCIPLINA, PROCURE UMA SUBPASTA COM O NOME DO TEMA ESPECÍFICO “${tema}”. SE ELA NÃO EXISTIR, CRIE-A COM ESSE NOME. SE A SUBPASTA DA DISCIPLINA NÃO EXISTIR, CRIE-A DENTRO DA PASTA-BASE, NO MESMO PADRÃO DE NOMES. SOMENTE DEPOIS DE A PASTA DO TEMA EXISTIR, SALVE O ARQUIVO NELA.\n`
      + `5. SE NÃO PUDER CONCLUIR COM SEGURANÇA A QUAL DISCIPLINA O RESUMO PERTENCE, ANTES DE CRIAR QUALQUER PASTA OU SALVAR, PERGUNTE AO USUÁRIO E AGUARDE A RESPOSTA.\n`
      + `6. SE A FERRAMENTA NÃO PERMITIR CRIAR PASTAS, NÃO SALVE EM OUTRO LUGAR: DISPONIBILIZE O ARQUIVO PARA DOWNLOAD E INFORME O CAMINHO EXATO (${PASTA_BASE.nome} › DISCIPLINA › TEMA) QUE O USUÁRIO DEVE CRIAR.\n`
      + `ESTA REGRA DEFINE O LOCAL DE GRAVAÇÃO E PREVALECE SOBRE A PASTA DE DESTINO E O FLUXO DE GRAVAÇÃO INFORMADOS ACIMA.`;
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
      #${PAINEL} .te-revisao span { display: flex; align-items: center; gap: 8px; }
      #${PAINEL} .te-revisao input { width: 18px !important; height: 18px; margin: 0; flex: none; }
      #${PAINEL} .te-revisao small { font-weight: 400; opacity: .8; }
      #${PAINEL} .te-plano { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
      #${PAINEL} .te-plano[hidden] { display: none; }
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
            <span class="te-pasta-acoes"><span data-te="pasta-info"></span><button type="button" class="secondary-button" data-te-acao="pasta-automatica">Usar a pasta automática (Temas específicos)</button> <button type="button" class="secondary-button" data-te-acao="pasta-disciplina">Usar a pasta da disciplina</button></span>
          </label>
          <label class="te-largo">Pasta das fontes no Google Drive (opcional)
            <input type="url" data-te="fontes" placeholder="em branco: as pastas de fontes de sempre (a de jurisprudência no prompt JURISPRUDÊNCIA)">
            <span class="te-pasta-acoes"><span data-te="fontes-info">Em branco: as pastas de fontes de sempre.</span></span>
          </label>
          <label class="te-largo te-revisao"><span><input type="checkbox" data-te="revisao"> Revisão com várias disciplinas e temas</span>
            <small>Usa todo o conteúdo da pasta de fontes e organiza por disciplina e assunto.</small>
          </label>
          <label class="te-largo te-revisao"><span><input type="checkbox" data-te="plano"> Colocar também no Plano do Dia</span>
            <small>Ao gerar o prompt, o tema entra como meta no dia escolhido (como "Tema específico, fora do edital"). Gerar outro prompt do mesmo tema no mesmo dia não cria outra meta.</small>
          </label>
          <div class="te-largo te-plano" data-te="plano-campos" hidden>
            <label>Dia no Plano<input type="date" data-te="plano-dia"></label>
            <label>Tempo planejado (min)<input type="number" min="1" step="1" value="50" data-te="plano-minutos"></label>
          </div>
        </div>
        <div class="te-botoes">${TIPOS.map(([tipo, nome]) => `<button type="button" class="secondary-button" data-factory-prompt="${ID}|${tipo}">${nome}</button>`).join("")}</div>
        <p class="te-aviso">Não altera a Fábrica. Só cria meta se "Colocar também no Plano do Dia" estiver marcado. O arquivo vai para a pasta indicada acima.</p>
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
        : valor === PASTA_BASE.url ? `Automática: ${PASTA_BASE.nome} › disciplina › tema (o agente cria a do tema).`
        : valor === pastaAutomatica ? "Pasta da disciplina."
        : ehLinkDoDrive(valor) ? "Pasta escolhida por você." : "Isso não parece um link de pasta do Google Drive.";
    };
    const usarPastaDaDisciplina = () => {
      pastaAutomatica = pastaDaDisciplina(campo("disciplina").value);
      atualizarInfoPasta();
    };
    campo("pasta").value = PASTA_BASE.url;
    painel.addEventListener("toggle", () => {
      // A lista de disciplinas é lida ao abrir (a Fábrica pode ter mudado).
      if (!painel.open) return;
      const select = campo("disciplina");
      const atual = select.value;
      select.innerHTML = `<option value="">Selecione</option>${disciplinas().map((d) => `<option>${esc(d)}</option>`).join("")}`;
      select.value = atual;
    });
    campo("disciplina").addEventListener("change", () => {
      // A pasta de destino automática (97_TEMAS_ESPECIFICOS) vale para qualquer disciplina.
      usarPastaDaDisciplina();
    });
    campo("pasta").addEventListener("input", atualizarInfoPasta);
    campo("fontes").addEventListener("input", () => {
      const valor = texto(campo("fontes").value);
      campo("fontes-info").textContent = !valor ? "Em branco: as pastas de fontes de sempre."
        : ehLinkDoDrive(valor) ? "As fontes serão lidas desta pasta, nos 7 prompts." : "Isso não parece um link de pasta do Google Drive.";
    });
    campo("plano").addEventListener("change", () => {
      const marcado = campo("plano").checked;
      campo("plano-campos").hidden = !marcado;
      if (marcado && !campo("plano-dia").value) campo("plano-dia").value = hojeISO();
    });
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

  // Pastas de fontes padrão do site (script.js). Com pasta própria, nenhuma delas pode sobrar
  // no prompt: a "REGRA FINAL E PREVALENTE" do módulo JURISPRUDÊNCIA citava o acervo padrão
  // e anulava a pasta escolhida (erro da V647.2, corrigido em 29/09/2026).
  function pastasPadrao() {
    const lista = [];
    try { if (typeof FACTORY_JURISPRUDENCIA_SOURCE_FOLDER === "string") lista.push(FACTORY_JURISPRUDENCIA_SOURCE_FOLDER); } catch {}
    try { if (typeof FACTORY_DEFAULT_SOURCE_FOLDER === "string") lista.push(FACTORY_DEFAULT_SOURCE_FOLDER); } catch {}
    return lista.filter(Boolean);
  }

  function regraFinalFontes(fontes) {
    return `\n\n==============================\nREGRA FINAL — PASTA DAS FONTES DESTA ETAPA (TEMA ESPECÍFICO)\n==============================\n\n`
      + `A PASTA DAS FONTES DESTA ETAPA É ${fontes}, COM TODAS AS SUAS SUBPASTAS. ELA SUBSTITUI QUALQUER OUTRA PASTA DE FONTES CITADA NESTE PROMPT, INCLUSIVE O ACERVO STF/STJ E A PASTA GERAL DA FÁBRICA. `
      + `SE AS SUBPASTAS “JULGADOS STF RESUMIDOS” E “JULGADOS STJ RESUMIDOS” NÃO EXISTIREM NELA, EXAMINE TODAS AS SUBPASTAS EXISTENTES. ESTA REGRA PREVALECE SOBRE QUALQUER INSTRUÇÃO ANTERIOR.`;
  }

  function regraRevisao() {
    return `\n\n==============================\nREVISÃO COM VÁRIAS DISCIPLINAS E TEMAS\n==============================\n\n`
      + `ESTA ETAPA É UMA REVISÃO QUE ABRANGE VÁRIAS DISCIPLINAS E TEMAS. O RECORTE É O CONTEÚDO INTEGRAL DA PASTA DE FONTES: EXTRAIA TODOS OS JULGADOS, SÚMULAS E TESES NELA CONTIDOS, SEM INTERROMPER POR RECORTE IMPRECISO. `
      + `ORGANIZE O DOCUMENTO POR DISCIPLINA (♦️) E, DENTRO DE CADA UMA, POR ASSUNTO (▶️), E REFLITA ESSA ORGANIZAÇÃO NO SUMÁRIO. `
      + `A DISCIPLINA E O TEMA INFORMADOS NO CABEÇALHO IDENTIFICAM A REVISÃO E NÃO LIMITAM A BUSCA. ESTA REGRA PREVALECE SOBRE QUALQUER INSTRUÇÃO ANTERIOR QUE EXIJA RECORTE ÚNICO.`;
  }

  // Troca o link logo abaixo de "PASTA DAS FONTES NO GOOGLE DRIVE:" (todas as ocorrências).
  function trocarFontes(t, fontes, padrao = pastasPadrao()) {
    let texto = String(t).replace(/(PASTA DAS FONTES NO GOOGLE DRIVE:[ \t]*\r?\n)[^\r\n]*/g, (_m, rotulo) => `${rotulo}${fontes}`);
    for (const url of padrao) texto = texto.split(url).join(fontes);
    return texto + regraFinalFontes(fontes);
  }

  function hojeISO() {
    try { if (typeof todayISO === "function") return todayISO(); } catch {}
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const dataBR = (iso) => String(iso || "").split("-").reverse().join("/");

  // V647.5: com a opção marcada, o tema entra no Plano do Dia pela função do site (V661.1).
  function colocarNoPlano(disciplina, tema, recorte) {
    const painel = byId(PAINEL);
    const campo = (nome) => painel.querySelector(`[data-te="${nome}"]`);
    if (!campo("plano")?.checked) return "";
    const criar = globalThis.addFreeThemeGoalV661;
    if (typeof criar !== "function") return " Plano do Dia: o site ainda não carregou; a meta não foi criada.";
    const dia = texto(campo("plano-dia").value) || hojeISO();
    const minutos = Number(campo("plano-minutos").value);
    if (!Number.isFinite(minutos) || minutos < 1) return " Plano do Dia: informe um tempo planejado válido; a meta não foi criada.";
    let r;
    try { r = criar({ date: dia, discipline: disciplina, subject: tema, minutes: minutos, notes: recorte ? `Recorte: ${recorte}` : "", source: "Fábrica — Tema específico" }); }
    catch (erro) { console.error("[Aldus V647.5] Falha ao criar a meta.", erro); return " Plano do Dia: falha ao criar a meta."; }
    if (r?.ok) return ` Meta colocada no Plano do Dia de ${dataBR(r.date)} (${Math.round(minutos)} min).`;
    if (r?.code === "duplicate") return ` O Plano do Dia de ${dataBR(r.date)} já tem meta deste tema; nenhuma meta nova.`;
    return " Plano do Dia: a meta não foi criada.";
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
    const fontes = texto(campo("fontes").value);
    const revisao = Boolean(campo("revisao")?.checked);
    if (!disciplina) { mensagem("Escolha a disciplina."); campo("disciplina").focus(); return false; }
    if (!tema) { mensagem("Escreva o tema específico."); campo("tema").focus(); return false; }
    if (pasta && !ehLinkDoDrive(pasta)) { mensagem("A pasta precisa ser um link do Google Drive (https://drive.google.com/…)."); campo("pasta").focus(); return false; }
    if (fontes && !ehLinkDoDrive(fontes)) { mensagem("A pasta das fontes precisa ser um link do Google Drive (https://drive.google.com/…)."); campo("fontes").focus(); return false; }
    if (typeof factoryPromptText !== "function") { mensagem("O gerador de prompts da Fábrica ainda não carregou. Aguarde e tente de novo."); return false; }
    const item = temaAvulso(disciplina, tema, pasta);
    let completo = factoryPromptText(tipo, item, "full");
    let roteador = factoryPromptText(tipo, item, "router");
    if (fontes) {
      completo = trocarFontes(completo, fontes);
      roteador = trocarFontes(roteador, fontes);
    }
    if (pasta === PASTA_BASE.url) {
      completo += regraOndeSalvar(disciplina, tema);
      roteador += regraOndeSalvar(disciplina, tema);
    }
    if (revisao) {
      completo += regraRevisao();
      roteador += regraRevisao();
    }
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
    mensagem(`${pasta ? `Prompt gerado para: ${tema}. Pasta de destino incluída.` : `Prompt gerado para: ${tema}, sem pasta de destino.`}${fontes ? " Fontes: só a pasta indicada (sem os pacotes do acervo padrão)." : ""}${revisao ? " Revisão com várias disciplinas e temas." : ""}` + colocarNoPlano(disciplina, tema, recorte));
    return fontes ? "fontes-proprias" : true;
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
      const resultado = gerar(prompt.split("|")[1]);
      if (!resultado || resultado === "fontes-proprias") { evento.stopImmediatePropagation?.(); evento.stopPropagation?.(); }
      return;
    }
    if (botao.dataset.teAcao === "copiar") { evento.preventDefault(); copiar(false); }
    if (botao.dataset.teAcao === "copiar-roteador") { evento.preventDefault(); copiar(true); }
    if (botao.dataset.teAcao === "pasta-automatica") {
      evento.preventDefault();
      const campoPasta = byId(PAINEL).querySelector('[data-te="pasta"]');
      campoPasta.value = PASTA_BASE.url;
      campoPasta.dispatchEvent(new Event("input"));
    }
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

  const api = Object.freeze({ version: VERSION, id: ID, tipos: TIPOS, instalar, gerar, temaAvulso, pastaDaDisciplina, trocarFontes, regraRevisao, regraOndeSalvar, subpastaDaDisciplina, pastaBase: PASTA_BASE, subpastas: SUBPASTAS });
  globalThis[KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") {
    for (const nome of ["load", "aldus:bootstrap-ready", "aldus:post-bootstrap-maintenance-complete", "hashchange"]) window.addEventListener(nome, instalar);
    if (typeof document !== "undefined" && document.readyState !== "loading") instalar();
    else if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", instalar, { once: true });
    for (const ms of [800, 2500, 6000]) setTimeout(instalar, ms);
  }
})();
