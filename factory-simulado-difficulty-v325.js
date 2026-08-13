(() => {
  "use strict";

  const VERSION = "20260813-fgv-alternativas-avancadas-v325";
  const MARKER = "CONTROLE DE DIFICULDADE DAS ALTERNATIVAS — FGV AVANÇADA";
  const RULES = `${MARKER}
ATENÇÃO: preserve o padrão de enunciado já definido acima. Esta seção deve aumentar EXCLUSIVAMENTE a dificuldade e a qualidade das alternativas; não torne o enunciado artificialmente mais longo, obscuro ou rebuscado.

1. Antes de redigir A a E, formule internamente a resposta correta completa e identifique o ponto jurídico exato que decide a questão.
2. Construa os quatro distratores A PARTIR DA RESPOSTA CORRETA, por alterações técnicas controladas. Não crie alternativas erradas independentes ou desconectadas do mesmo núcleo jurídico.
3. É proibido usar alternativa de sacrifício. As quatro incorretas devem ser plausíveis à primeira leitura para candidato com preparação intermediária.
4. Pelo menos três distratores devem permanecer no MESMO CAMPO SEMÂNTICO da correta e compartilhar aproximadamente 80% a 95% de sua estrutura, premissas ou fundamentos, divergindo preferencialmente em apenas UM microelemento juridicamente decisivo.
5. O quarto distrator também deve ser forte: use, preferencialmente, regra verdadeira aplicada à hipótese errada, instituto limítrofe, exceção deslocada, fundamento correto com consequência incorreta ou conclusão aparentemente correta fundada em premissa inadequada.
6. Priorize microdiferenças sobre: requisito; condição necessária ou suficiente; cumulatividade ou alternatividade; regra e exceção; competência; legitimidade; sujeito; prazo; fração; momento; alcance; efeito jurídico; natureza; classificação; pressuposto; consequência; instituto semelhante; fundamento legal ou jurisprudencial efetivamente confirmado nas fontes.
7. Evite distratores com vários erros. Para cada alternativa incorreta, deve existir um PONTO DE RUPTURA técnico principal, pequeno e objetivo, capaz de explicar por que ela está errada.
8. Mantenha A a E com extensão, densidade técnica, nível de ressalvas e estrutura sintática semelhantes. A correta não pode ser identificável por ser mais longa, mais detalhada, mais cautelosa ou mais técnica.
9. Não use como atalho de erro expressões caricatas como “sempre”, “nunca”, “em qualquer hipótese”, “em nenhuma hipótese”, “exclusivamente” ou “necessariamente”, salvo quando forem naturais e indispensáveis ao conteúdo efetivamente cobrado.
10. Não facilite por eliminação: um candidato intermediário NÃO deve conseguir eliminar mais de uma alternativa com segurança na primeira leitura apenas por lógica geral, vocabulário ou conhecimento superficial. Ele deve permanecer seriamente em dúvida entre pelo menos três opções até analisar a distinção jurídica específica.
11. TESTE ADVERSARIAL OBRIGATÓRIO: compare cada distrator individualmente com a correta e pergunte internamente: “um candidato bem preparado poderia considerar esta opção correta antes de perceber a microdiferença técnica?”. Se a resposta for NÃO, REESCREVA o distrator.
12. Se dois ou mais distratores puderem ser descartados sem domínio específico do recorte cobrado, REESCREVA TODAS AS ALTERNATIVAS da questão antes de entregá-la.
13. A dificuldade deve decorrer da proximidade entre teses juridicamente plausíveis, nunca de informação fora das fontes, ambiguidade real, redação confusa ou detalhe irrelevante.
14. Preserve uma única resposta objetivamente correta. “Plausível à primeira leitura” não significa “juridicamente defensável ao final”: cada distrator precisa conter erro técnico verificável e explicável na justificativa.
15. Na justificativa, identifique precisamente o microerro de cada distrator. Se a explicação exigir apontar vários erros grosseiros na mesma alternativa, considere o distrator fraco e REESCREVA-O antes da entrega.

CRITÉRIO DE APROVAÇÃO DA QUESTÃO: somente entregue a questão se as cinco alternativas parecerem pertencer à mesma disputa jurídica e se, após leitura superficial, pelo menos quatro delas ainda exigirem análise técnica para serem confirmadas ou descartadas.`;

  function isTargetPrompt(value) {
    const prompt = String(value || "");
    return prompt.includes("- Banca simulada: FGV")
      && prompt.includes("- Dificuldade: Avançada");
  }

  function enhancePrompt(value) {
    const prompt = String(value || "");
    if (!isTargetPrompt(prompt) || prompt.includes(MARKER)) return prompt;
    const anchor = "\n\nREGRAS DE CONTEÚDO E SEGURANÇA JURÍDICA";
    if (prompt.includes(anchor)) return prompt.replace(anchor, `\n\n${RULES}${anchor}`);
    return `${prompt}\n\n${RULES}`;
  }

  function outputArea() {
    return document.querySelector("[data-factory-simulado-output]");
  }

  function enhanceVisiblePrompt() {
    const area = outputArea();
    if (!area) return false;
    const enhanced = enhancePrompt(area.value);
    if (enhanced === area.value) return false;
    area.value = enhanced;
    area.textContent = enhanced;
    area.dataset.aldusDifficultyEnhanced = VERSION;
    return true;
  }

  async function copyEnhancedPrompt(event) {
    const button = event.target.closest?.("[data-factory-simulado-copy]");
    if (!button) return false;
    const area = outputArea();
    if (!area || !isTargetPrompt(area.value)) return false;

    event.preventDefault();
    event.stopImmediatePropagation();
    enhanceVisiblePrompt();

    const message = document.querySelector("[data-factory-simulado-message]");
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(area.value);
      else {
        area.focus();
        area.select();
        if (!document.execCommand("copy")) throw new Error("copy indisponível");
      }
      if (message) message.textContent = "Prompt copiado.";
    } catch (_error) {
      if (message) message.textContent = "Não foi possível copiar automaticamente. Selecione o texto acima.";
    }
    return true;
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest?.("[data-factory-simulado-copy]")) {
      void copyEnhancedPrompt(event);
      return;
    }
    if (event.target.closest?.("[data-factory-simulado-generate]")) {
      queueMicrotask(enhanceVisiblePrompt);
    }
  }, true);

  const observer = new MutationObserver(() => enhanceVisiblePrompt());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceVisiblePrompt, { once: true });
  } else {
    enhanceVisiblePrompt();
  }

  globalThis.__ALDUS_FACTORY_SIMULADO_DIFFICULTY_V325__ = Object.freeze({
    version: VERSION,
    marker: MARKER,
    enhancePrompt
  });
})();
