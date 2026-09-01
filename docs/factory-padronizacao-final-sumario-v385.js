(() => {
  "use strict";

  const VERSION = "20260901-factory-padronizacao-final-sumario-v422";
  const TYPE_KEY = "padronizacaoFinalSumario";
  const TYPE_LABEL = "Gerar prompt Padronização Final + Sumário";
  const MIGRATION_ID = "factoryPadronizacaoFinalSumarioV422";
  const API_MARKER = "__aldusFactoryPadronizacaoFinalSumarioV385";
  const INSTALL_FLAG = "aldusFactoryPadronizacaoFinalSumarioV385";

  const BASE_PROMPT = `REALIZE SOMENTE A PADRONIZAÇÃO FINAL E A CRIAÇÃO/ATUALIZAÇÃO DO SUMÁRIO DO DOCUMENTO INDICADO.

ESTE MODO É EXCLUSIVAMENTE ESTRUTURAL E VISUAL.
O CONTEÚDO MATERIAL DO DOCUMENTO ESTÁ BLOQUEADO.

==============================
1. CONTEÚDO BLOQUEADO — REGRA ABSOLUTA
==============================

NÃO acrescente, exclua, resuma, corrija, atualize, complemente, substitua, reordene materialmente ou reformule qualquer informação jurídica, doutrinária, legal, jurisprudencial ou prática.

NÃO faça nova aula.
NÃO pesquise jurisprudência.
NÃO consulte legislação para corrigir o texto.
NÃO complete lacunas.
NÃO use memória do modelo para alterar o mérito.
NÃO use internet nem outras fontes para ampliar o documento.
NÃO transforme um tipo de material em outro.

O texto recebido é a versão material definitiva para esta etapa.

É permitido apenas:
- organizar tecnicamente a estrutura do Word;
- aplicar estilos estruturais de título sem mudar a aparência visual pretendida;
- corrigir defeitos puramente formais de formatação;
- criar ou atualizar o sumário;
- criar navegação interna e hiperlinks obrigatórios em todas as entradas do sumário;
- somente se a ferramenta comprovadamente não suportar hiperlink interno, registrar essa limitação de forma explícita na entrega e preservar os estilos estruturais dos títulos para manter o Painel de Navegação do Word;
- preservar e estabilizar a apresentação já escolhida pelo usuário.

==============================
2. FONTE EXCLUSIVA DESTA ETAPA
==============================

A fonte deste modo é SOMENTE o DOCX alterado pelo usuário.

A pasta geral de PDFs, aulas, livros, legislação, jurisprudência ou materiais brutos do tema NÃO é fonte para esta etapa e NÃO deve ser examinada para modificar o conteúdo.

FORMAS VÁLIDAS DE FONTE:
1. link direto para o DOCX alterado; ou
2. pasta do Google Drive que contenha esse DOCX alterado.

Se o DOCX alterado estiver na própria pasta de destino do tema, essa pasta pode funcionar como pasta-fonte desta etapa.

SE FOR FORNECIDA APENAS UMA PASTA:
- examine somente os arquivos necessários para identificar o DOCX alterado;
- se houver um único candidato inequívoco, use-o;
- se houver dois ou mais candidatos plausíveis, NÃO escolha pelo nome mais parecido, pela data mais recente ou por suposição;
- interrompa e solicite a indicação do arquivo exato.

Se não houver link do DOCX alterado nem pasta que permita identificá-lo com segurança, interrompa a tarefa e solicite a fonte exata.

==============================
3. PRESERVAÇÃO DAS ALTERAÇÕES MANUAIS DO USUÁRIO
==============================

AS ALTERAÇÕES MANUAIS DE FORMATAÇÃO FEITAS PELO USUÁRIO TÊM PRIORIDADE E DEVEM SER PRESERVADAS.

Isso inclui expressamente, quando já aplicados no documento:
- parágrafos JUSTIFICADOS;
- espaçamento entre linhas de 1,5;
- tamanho de fonte 14;
- fonte utilizada;
- negrito, itálico, sublinhado e realces;
- recuos e indentações;
- espaçamento antes/depois de parágrafos;
- quebras de página e de seção;
- listas e numerações;
- tabelas;
- emojis e marcadores;
- demais escolhas visuais intencionais já existentes.

NÃO normalize o documento para Arial 11, espaçamento simples ou qualquer outro padrão apenas porque esse padrão exista em outros módulos da Fábrica.

NÃO remova o alinhamento JUSTIFICADO do corpo quando ele tiver sido aplicado pelo usuário.
NÃO substitua espaçamento 1,5 por 1,0 ou 1,15.
NÃO reduza tamanho 14 para tamanho 11.

Se houver formatação mista, preserve a formatação de cada trecho conforme ela já estiver no arquivo, salvo defeito técnico evidente e puramente acidental.

==============================
4. IDENTIFICAÇÃO DA GRAMÁTICA VISUAL EXISTENTE
==============================

Antes de formatar, examine o próprio documento e reconheça a gramática visual que ele já utiliza.

O arquivo pode ter origem em:
- RESUMO/AULA;
- RESUMO/AULA + JURISPRUDÊNCIA;
- LEI;
- LEI + JURISPRUDÊNCIA;
- JURISPRUDÊNCIA;
- PEÇA;
- CONSOLIDAÇÃO FINAL;
- material antigo ou externo à Fábrica.

Essa identificação serve SOMENTE para preservar coerência visual e estrutural.
NÃO reclassifique o conteúdo.
NÃO transforme a aparência de um módulo na de outro.

Quando o documento tiver padrões próprios criados pelo usuário, preserve-os mesmo que não coincidam com os padrões canônicos da Fábrica.

==============================
5. ESTILOS ESTRUTURAIS DO WORD
==============================

Aplique estilos estruturais equivalentes a Título 1, Título 2 e, quando necessário, Título 3 nos cabeçalhos que já funcionam materialmente como títulos e subtítulos.

REGRA ESSENCIAL:
A aplicação do estilo estrutural NÃO deve alterar a aparência visual escolhida pelo usuário.

Preserve, no título correspondente:
- fonte;
- tamanho;
- cor;
- negrito;
- emoji;
- recuo;
- espaçamento;
- alinhamento;
- demais propriedades visuais já existentes.

Use o estilo estrutural para permitir:
- Painel de Navegação do Word;
- criação de sumário;
- hiperlinks internos obrigatórios em todas as entradas do sumário;
- navegação por títulos.

NÃO transforme rótulos como REGRA, EXCEÇÃO, PRAZO, COMPETÊNCIA, TESE, PROVA ou PONTO DE PROVA em títulos do sumário quando eles forem apenas elementos internos de um tópico.

==============================
6. SUMÁRIO DIDÁTICO
==============================

Crie no início do documento, depois do título/identificação inicial e antes do desenvolvimento material:

♦️ **📑 SUMÁRIO**

O sumário deve reproduzir a MESMA DIDÁTICA VISUAL E HIERÁRQUICA DO DOCUMENTO.

NÃO crie uma lista administrativa genérica quando o corpo utilizar emojis, marcadores, hierarquia e gramática visual própria.

Exemplos de preservação estrutural, somente quando já corresponderem ao corpo:
- AULA: ♦️ grandes eixos e ▶️📚 subtópicos;
- LEI: 🔷 TÍTULO, ♦️ CAPÍTULO, ▶️ SEÇÃO e ✅ ARTIGO;
- PEÇA: seções e subdivisões próprias da peça;
- JURISPRUDÊNCIA: eixos e agrupamentos relevantes, sem criar entrada para cada tese individual;
- documento personalizado: reproduza a hierarquia visual que efetivamente existir nele.

O sumário deve ser compacto o suficiente para navegação, mas detalhado o suficiente para localizar os assuntos relevantes.

==============================
7. ALINHAMENTO DO SUMÁRIO X ALINHAMENTO DO CORPO
==============================

OS PARÁGRAFOS DO SUMÁRIO DEVEM FICAR ALINHADOS À ESQUERDA, NUNCA JUSTIFICADOS, para evitar espaços artificiais entre palavras.

ESSA REGRA VALE SOMENTE PARA O SUMÁRIO.

Ela NÃO autoriza retirar o alinhamento JUSTIFICADO do corpo do documento.
Se o usuário justificou o corpo, preserve o corpo justificado.

Use recuos progressivos reais para representar os níveis do sumário.
Permita quebra natural de títulos longos.
NÃO distribua artificialmente espaços entre palavras.

==============================
8. SUMÁRIO AUTOMÁTICO E FALLBACK
==============================

Quando a ferramenta de DOCX suportar um campo automático real de sumário do Word:
- prefira o sumário automático;
- baseie-o nos estilos estruturais aplicados ao corpo;
- habilite hiperlinks internos obrigatórios em todas as entradas do sumário;
- use números de página alinhados à direita com líder pontilhado somente quando a paginação estiver final e confiável;
- personalize os estilos TOC para refletir a gramática visual do documento;
- preserve as escolhas manuais do corpo;
- atualize o campo após a paginação final quando tecnicamente possível.

Se não for possível criar ou atualizar com segurança um sumário automático real:
- crie SUMÁRIO MANUAL DIDÁTICO;
- reproduza fielmente a hierarquia dos títulos;
- crie hiperlinks internos obrigatórios em todas as entradas do sumário, apontando para o cabeçalho correspondente;
- somente se a ferramenta comprovadamente não suportar hiperlink interno, registre essa limitação de forma explícita na entrega e preserve os estilos estruturais dos títulos;
- NÃO invente, estime nem suponha números de página.

==============================
9. O QUE PODE SER CORRIGIDO
==============================

Corrija somente defeitos formais inequívocos, por exemplo:
- desalinhamento acidental;
- recuo quebrado por colagem;
- espaçamento acidentalmente diferente dentro de uma sequência que claramente deveria ser igual;
- título visualmente solto por erro de estilo;
- quebra de linha ou página claramente defeituosa;
- inconsistência técnica de estilo que prejudique o sumário ou Painel de Navegação.

NÃO trate uma escolha manual do usuário como defeito apenas porque ela diverge do padrão original.

Em caso de dúvida entre “erro de formatação” e “escolha intencional”, PRESERVE.

==============================
10. ARQUIVO DE SAÍDA
==============================

NUNCA sobrescreva, exclua ou substitua o DOCX fonte.

Gere um NOVO DOCX editável.

Nome preferencial:
[NOME_ORIGINAL]_PADRONIZADO_COM_SUMARIO.docx

Se houver pasta de destino preenchida e ferramenta autorizada para gravação, salve o novo arquivo nela.
A pasta de destino pode coincidir com a pasta-fonte, desde que o arquivo original seja preservado e o novo arquivo tenha nome distinto.

Se não houver ferramenta autorizada para salvar, gere o arquivo para download e informe objetivamente que o upload será manual.

NÃO gere PDF nesta etapa, salvo solicitação expressa do usuário.

==============================
11. CHECKLIST FINAL OBRIGATÓRIO
==============================

Antes de entregar, confirme:
- o conteúdo material permaneceu inalterado;
- nenhum dado jurídico foi acrescentado ou removido;
- nenhuma pesquisa externa foi usada;
- o DOCX fonte foi preservado;
- parágrafos justificados aplicados pelo usuário foram preservados no corpo;
- espaçamento 1,5 aplicado pelo usuário foi preservado;
- tamanho 14 aplicado pelo usuário foi preservado;
- demais escolhas manuais relevantes foram preservadas;
- títulos estruturais aparecem no Painel de Navegação quando tecnicamente possível;
- o sumário espelha a didática visual do documento;
- o sumário está alinhado à esquerda;
- números de página não foram inventados;
- o novo arquivo é editável e distinto do original.

ENTREGA:
- gere somente o novo DOCX padronizado com sumário;
- informe de forma breve que o conteúdo foi preservado;
- informe qual arquivo foi usado como fonte;
- informe o nome do novo arquivo e, se salvo, o link exato.`;

  function migratePromptV422(prompt) {
    const raw = String(prompt || "").trim();
    if (!raw) return BASE_PROMPT;
    return raw
      .replace(
        "- criar navegação interna e hiperlinks quando tecnicamente suportados;",
        "- criar navegação interna e hiperlinks obrigatórios em todas as entradas do sumário;\n- somente se a ferramenta comprovadamente não suportar hiperlink interno, registrar essa limitação de forma explícita na entrega e preservar os estilos estruturais dos títulos para manter o Painel de Navegação do Word;"
      )
      .replace(
        "- hiperlinks internos;",
        "- hiperlinks internos obrigatórios em todas as entradas do sumário;"
      )
      .replace(
        "- habilite hiperlinks internos quando suportados;",
        "- habilite hiperlinks internos obrigatórios em todas as entradas do sumário;"
      )
      .replace(
        "- use hiperlinks internos quando suportados;",
        "- crie hiperlinks internos obrigatórios em todas as entradas do sumário, apontando para o cabeçalho correspondente;\n- somente se a ferramenta comprovadamente não suportar hiperlink interno, registre essa limitação de forma explícita na entrega e preserve os estilos estruturais dos títulos;"
      );
  }

  function ensurePromptType() {
    try {
      if (!Array.isArray(FACTORY_PROMPT_TYPES)) return false;
      const existing = FACTORY_PROMPT_TYPES.find((entry) => entry?.key === TYPE_KEY);
      if (existing) {
        existing.label = TYPE_LABEL;
        return true;
      }
      const finalIndex = FACTORY_PROMPT_TYPES.findIndex((entry) => entry?.key === "consolidacao");
      FACTORY_PROMPT_TYPES.splice(finalIndex >= 0 ? finalIndex + 1 : FACTORY_PROMPT_TYPES.length, 0, {
        key: TYPE_KEY,
        label: TYPE_LABEL
      });
      return true;
    } catch {
      return false;
    }
  }

  function ensurePromptLibrary() {
    try {
      defaultFactoryPromptLibrary[TYPE_KEY] = BASE_PROMPT;
    } catch {
      return { installed: false, changed: false, reason: "default-library-unavailable" };
    }

    try {
      if (!state || typeof state !== "object") return { installed: false, changed: false, reason: "state-unavailable" };
      state.factoryPromptLibrary ||= {};
      state.migrations ||= {};
      const alreadyMigrated = Boolean(state.migrations[MIGRATION_ID]);
      const current = String(state.factoryPromptLibrary[TYPE_KEY] || "").trim();
      const hasPrompt = Boolean(current);
      const next = !hasPrompt ? BASE_PROMPT : (!alreadyMigrated ? migratePromptV422(current) : current);
      const changed = !alreadyMigrated || next !== current;
      if (next !== current) state.factoryPromptLibrary[TYPE_KEY] = next;
      if (!alreadyMigrated) state.migrations[MIGRATION_ID] = new Date().toISOString();
      if (changed && typeof saveData === "function") saveData();
      return { installed: true, changed };
    } catch {
      return { installed: false, changed: false, reason: "state-write-failed" };
    }
  }

  function installPromptBase() {
    try {
      if (typeof factoryPromptBase !== "function") return false;
      if (factoryPromptBase?.[API_MARKER] === VERSION) return true;
      const previous = factoryPromptBase;
      const wrapped = function(type) {
        if (type !== TYPE_KEY) return previous(type);
        const configured = String(state?.factoryPromptLibrary?.[TYPE_KEY] || "").trim();
        return configured || BASE_PROMPT;
      };
      Object.defineProperty(wrapped, API_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, "__aldusFactoryPadronizacaoFinalSumarioOriginal", { value: previous });
      factoryPromptBase = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  function relabelGeneralSource(common) {
    return String(common || "").replace(
      "PASTA DAS FONTES NO GOOGLE DRIVE:",
      "PASTA GERAL DE FONTES DO TEMA (NÃO USAR COMO FONTE DE CONTEÚDO NESTA ETAPA):"
    );
  }

  function installRouter() {
    try {
      if (typeof factoryRouterText !== "function") return false;
      if (factoryRouterText?.[API_MARKER] === VERSION) return true;
      const previous = factoryRouterText;
      const wrapped = function(type, item = {}) {
        if (type !== TYPE_KEY) return previous(type, item);
        const baseRouter = String(previous("resumoAula", item) || "");
        const moduleIndex = baseRouter.indexOf("\nMÓDULO:");
        const commonRaw = moduleIndex >= 0 ? baseRouter.slice(0, moduleIndex).trimEnd() : baseRouter.trimEnd();
        const common = relabelGeneralSource(commonRaw);
        return `${common}\n\nFONTE EXCLUSIVA PARA PADRONIZAÇÃO FINAL:\n- use SOMENTE o DOCX alterado pelo usuário ou a pasta que contenha esse DOCX;\n- a pasta geral de fontes do tema acima NÃO deve ser usada para corrigir, completar ou alterar conteúdo;\n- se o DOCX alterado estiver na pasta de destino do tema, essa mesma pasta pode ser usada como pasta-fonte desta etapa;\n- se houver mais de um DOCX plausível e o arquivo exato não estiver identificado, interrompa e solicite o link/arquivo exato; não escolha por data, nome ou suposição.\n\nMÓDULO: PADRONIZAÇÃO FINAL + SUMÁRIO.\n\nENTREGA OBRIGATÓRIA DESTA ETAPA:\n- trabalhar somente sobre o DOCX alterado indicado;\n- preservar integralmente o conteúdo material;\n- preservar as alterações manuais do usuário, inclusive corpo justificado, espaçamento 1,5 e tamanho 14 quando já aplicados;\n- criar/atualizar estilos estruturais sem mudar a aparência visual intencional;\n- criar sumário didático com a mesma gramática visual do documento;\n- manter os parágrafos do SUMÁRIO alinhados à esquerda, sem retirar a justificação do CORPO;\n- gerar novo DOCX editável, sem sobrescrever o original;\n- não gerar PDF salvo pedido expresso;\n- salvar na pasta de destino apenas quando a gravação for efetivamente possível.`;
      };
      Object.defineProperty(wrapped, API_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, "__aldusFactoryPadronizacaoFinalSumarioRouterOriginal", { value: previous });
      factoryRouterText = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  function isFactoryRoute() {
    if (typeof location === "undefined") return false;
    return String(location.hash || "").replace(/^#/, "").split(/[?&]/)[0] === "fabrica-resumos";
  }

  function refreshFactoryUi() {
    if (!isFactoryRoute()) return;
    try {
      if (typeof renderFactoryPromptLibrary === "function") renderFactoryPromptLibrary();
    } catch {}
    try {
      if (typeof renderFactory === "function" && typeof elements !== "undefined" && elements?.factoryList) renderFactory();
    } catch {}
  }

  function install() {
    if (typeof document !== "undefined" && document.documentElement?.dataset?.[INSTALL_FLAG] === "true") {
      return { installed: true, repeated: true };
    }

    const promptType = ensurePromptType();
    const library = ensurePromptLibrary();
    const promptBase = installPromptBase();
    const router = installRouter();

    if (!promptType || !library.installed || !promptBase || !router) {
      return { installed: false, promptType, library, promptBase, router };
    }

    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset[INSTALL_FLAG] = "true";
    }
    refreshFactoryUi();
    return { installed: true, changed: library.changed };
  }

  const api = Object.freeze({
    version: VERSION,
    typeKey: TYPE_KEY,
    prompt: BASE_PROMPT,
    migratePromptV422,
    relabelGeneralSource,
    install
  });

  globalThis[API_MARKER] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", install, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", install, { once: true });
    window.addEventListener("load", install, { once: true });
  }
})();
