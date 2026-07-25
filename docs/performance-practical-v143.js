(() => {
  "use strict";

  const VERSION = "20260725-analise-didatica-pratica-v143";
  const root = typeof window !== "undefined" ? window : null;

  const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, num(value)));
  const escapeXml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const formatPercent = (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(num(value));

  function formatDuration(minutes) {
    const total = Math.max(0, Math.round(num(minutes)));
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    if (hours && rest) return `${hours}h ${rest}min`;
    if (hours) return `${hours}h`;
    return `${rest} min`;
  }

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || "");
  }

  function questionCount(row = {}) {
    const explicit = num(row.questions);
    return explicit > 0 ? explicit : Math.max(0, num(row.correct) + num(row.wrong) + num(row.blank));
  }

  function accuracyOf(row = {}) {
    const total = questionCount(row);
    if (!total) return 0;
    return Number.isFinite(Number(row.accuracyPct)) ? clamp(row.accuracyPct, 0, 100) : clamp(num(row.correct) / total * 100, 0, 100);
  }

  function balanceOf(row = {}) {
    return num(row.correct) - num(row.wrong);
  }

  function sampleLabel(total) {
    const size = Math.max(0, Math.round(num(total)));
    if (!size) return "Sem amostra";
    if (size < 20) return "Amostra inicial";
    if (size < 50) return "Amostra em formação";
    return "Amostra mais consistente";
  }

  function actionFor(row = {}) {
    const total = questionCount(row);
    const accuracy = accuracyOf(row);
    if (!total) return "Criar amostra com questões após a próxima revisão.";
    if (total < 20) return "Ampliar a amostra antes de concluir sobre o desempenho.";
    if (accuracy < 70) return "Revisar teoria e refazer as questões erradas.";
    if (accuracy < 85) return "Consolidar com treino e revisão dos pontos de erro.";
    return "Manter revisão periódica e variar o nível das questões.";
  }

  function plannedTotals(payload = {}) {
    return (payload.plannedVsActual || []).reduce((sum, row) => {
      sum.planned += Math.max(0, num(row.plannedMinutes));
      sum.actual += Math.max(0, num(row.actualMinutes));
      return sum;
    }, { planned: 0, actual: 0 });
  }

  function buildPracticalDiagnosis(payload = {}) {
    const disciplines = (payload.disciplines || []).map((row) => ({
      ...row,
      questionsValue: questionCount(row),
      accuracyValue: accuracyOf(row),
      minutesValue: Math.max(0, num(row.minutes))
    }));
    const reliable = disciplines.filter((row) => row.questionsValue >= 20);
    const withQuestions = disciplines.filter((row) => row.questionsValue > 0);
    const strongest = (reliable.length ? reliable : withQuestions).slice().sort((a, b) => b.accuracyValue - a.accuracyValue || b.questionsValue - a.questionsValue)[0]
      || disciplines.slice().sort((a, b) => b.minutesValue - a.minutesValue)[0]
      || null;
    const weakest = (reliable.length ? reliable : withQuestions).slice().sort((a, b) => a.accuracyValue - b.accuracyValue || b.questionsValue - a.questionsValue)[0] || null;
    const questionTotal = questionCount(payload.questions || {}) || num(payload.summary?.questions);
    const plans = plannedTotals(payload);
    const executionPct = plans.planned ? plans.actual / plans.planned * 100 : null;
    const mocksCount = (payload.mockExams || []).length;

    let advance = "A base ainda está em construção; mantenha registros regulares para comparar períodos.";
    if (strongest?.questionsValue >= 20) advance = `${strongest.discipline} apresenta o melhor resultado atual: ${formatPercent(strongest.accuracyValue)}% em ${strongest.questionsValue} questões.`;
    else if (strongest?.questionsValue > 0) advance = `${strongest.discipline} tem o melhor resultado inicial, mas a amostra de ${strongest.questionsValue} questões ainda é pequena.`;
    else if (strongest?.minutesValue > 0) advance = `${strongest.discipline} concentrou o maior tempo registrado: ${formatDuration(strongest.minutesValue)}.`;

    let attention = "Ainda não há uma fragilidade confirmada; amplie as amostras antes de tirar conclusões.";
    if (weakest?.questionsValue >= 20 && weakest.accuracyValue < 70) attention = `${weakest.discipline} merece prioridade: ${formatPercent(weakest.accuracyValue)}% em ${weakest.questionsValue} questões.`;
    else if (executionPct !== null && executionPct < 70) attention = `A execução alcançou ${formatPercent(executionPct)}% do tempo planejado; o volume previsto está acima do ritmo realizado.`;
    else if (weakest?.questionsValue > 0 && weakest.questionsValue < 20) attention = `${weakest.discipline} possui somente ${weakest.questionsValue} questões; a amostra ainda não permite diagnóstico firme.`;

    let nextAction = "Continue registrando tempo e questões para tornar as comparações mais confiáveis.";
    if (weakest?.questionsValue >= 20 && weakest.accuracyValue < 70) nextAction = `Faça uma revisão em ${weakest.discipline} e depois resolva de 10 a 20 questões focadas nos erros.`;
    else if (questionTotal < 20) nextAction = "Complete uma amostra inicial de pelo menos 20 questões no conteúdo prioritário.";
    else if (executionPct !== null && executionPct < 70) nextAction = "Redimensione a próxima meta e proteja um bloco curto que possa ser cumprido integralmente.";
    else if (!mocksCount) nextAction = "Inclua um simulado para medir integração, ritmo e estratégia de prova.";

    return {
      advance,
      attention,
      nextAction,
      today: weakest ? `${weakest.discipline}: revisão curta e questões focadas antes de ampliar o conteúdo.` : "Faça um bloco curto e registre o resultado para iniciar uma linha de comparação.",
      week: !mocksCount ? "Agende um simulado e mantenha dois treinos de questões em dias diferentes." : executionPct !== null && executionPct < 80 ? "Ajuste a carga planejada ao ritmo real e compare novamente no fim da semana." : "Repita a medição das disciplinas prioritárias e compare com este período.",
      maintain: strongest ? `${strongest.discipline}: mantenha no ciclo de revisões sem retirar tempo das prioridades.` : "Mantenha constância de registro para permitir a identificação de tendências.",
      strongest,
      weakest,
      questionTotal,
      plans,
      executionPct,
      mocksCount
    };
  }

  function wrapText(value, maxChars = 48, maxLines = 4) {
    const words = String(value || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = `${line} ${word}`.trim();
      if (line && next.length > maxChars) {
        lines.push(line);
        line = word;
        if (lines.length >= maxLines) break;
      } else line = next;
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (words.join(" ").length > lines.join(" ").length && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.…]+$/, "")}…`;
    return lines.length ? lines : [""];
  }

  function svgText(value, x, y, cls = "note", maxChars = 48, lineHeight = 24, maxLines = 4) {
    return wrapText(value, maxChars, maxLines).map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" class="${cls}">${escapeXml(line)}</text>`).join("");
  }

  function buildPracticalReportSvg(payload = {}, metadata = {}) {
    const W = 1600;
    const margin = 64;
    const contentW = W - margin * 2;
    const summary = payload.summary || {};
    const questions = payload.questions || {};
    const diagnosis = buildPracticalDiagnosis(payload);
    const timeRows = (payload.disciplines || []).slice().sort((a, b) => num(b.minutes) - num(a.minutes)).slice(0, 8);
    const resultRows = (payload.disciplines || []).slice().sort((a, b) => questionCount(b) - questionCount(a) || accuracyOf(a) - accuracyOf(b)).slice(0, 6);
    const daily = (payload.daily || []).slice(-10);
    const mocks = (payload.mockExams || []).slice(-4);
    const generated = new Date(metadata.generatedAt || payload.generatedAt || new Date().toISOString()).toLocaleString("pt-BR");
    const period = metadata.period || payload.filters?.periodLabel || payload.filters?.mode || "Período selecionado";
    const discipline = payload.filters?.discipline && payload.filters.discipline !== "all" ? payload.filters.discipline : "Todas as disciplinas";
    const totalQuestions = questionCount(questions);
    const accuracy = accuracyOf(questions);
    const balance = balanceOf(questions);
    const maxTime = Math.max(1, ...timeRows.map((row) => num(row.minutes)));
    const maxDaily = Math.max(1, ...daily.map((row) => num(row.minutes)));
    let y = 210;
    let body = "";

    const section = (title, subtitle = "") => {
      body += `<rect x="${margin}" y="${y}" width="${contentW}" height="58" rx="17" fill="#eff6ff"/><rect x="${margin}" y="${y}" width="10" height="58" rx="5" fill="#2563eb"/><text x="${margin + 30}" y="${y + 28}" class="section">${escapeXml(title)}</text><text x="${margin + 30}" y="${y + 48}" class="hint">${escapeXml(subtitle)}</text>`;
      y += 76;
    };

    section("Diagnóstico em 30 segundos", "O que avançou, o que exige atenção e qual é o próximo passo");
    [["Principal avanço", diagnosis.advance, "#16a34a", "#ecfdf5"], ["Principal atenção", diagnosis.attention, "#d97706", "#fffbeb"], ["Próxima ação", diagnosis.nextAction, "#2563eb", "#eff6ff"]].forEach((item, index) => {
      const x = margin + index * 500;
      body += `<rect x="${x}" y="${y}" width="468" height="158" rx="22" fill="${item[3]}" stroke="${item[2]}" stroke-opacity=".28"/><circle cx="${x + 32}" cy="${y + 34}" r="11" fill="${item[2]}"/><text x="${x + 55}" y="${y + 41}" class="cardLabel">${escapeXml(item[0])}</text>${svgText(item[1], x + 24, y + 78, "note", 40, 25, 4)}`;
    });
    y += 184;

    section("Resumo essencial", "Indicadores principais sem repetição");
    const metrics = [
      ["Tempo estudado", summary.timeLabel || formatDuration(summary.minutes), "#2563eb", "#dbeafe"],
      ["Dias ativos", summary.activeDays || 0, "#7c3aed", "#ede9fe"],
      ["Sessões", summary.sessions || 0, "#0891b2", "#cffafe"],
      ["Questões", summary.questions ?? totalQuestions, "#d97706", "#fef3c7"],
      ["Saldo A−E", `${balance > 0 ? "+" : ""}${balance}`, "#16a34a", "#dcfce7"],
      ["Metas concluídas", summary.goalsCompleted || 0, "#db2777", "#fce7f3"]
    ];
    metrics.forEach((metric, index) => {
      const x = margin + (index % 3) * 500;
      const cy = y + Math.floor(index / 3) * 96;
      body += `<rect x="${x}" y="${cy}" width="468" height="78" rx="18" fill="${metric[3]}"/><circle cx="${x + 31}" cy="${cy + 29}" r="12" fill="${metric[2]}"/><text x="${x + 53}" y="${cy + 34}" class="cardLabel">${escapeXml(metric[0])}</text><text x="${x + 24}" y="${cy + 65}" class="cardValue" fill="${metric[2]}">${escapeXml(metric[1])}</text>`;
    });
    y += 210;

    section("Questões e execução", "Desempenho e capacidade real de cumprir o plano");
    const leftX = margin;
    const rightX = margin + 750;
    const trackW = 672;
    body += `<rect x="${leftX}" y="${y}" width="720" height="224" rx="22" fill="#fff" stroke="#cbd5e1"/><text x="${leftX + 24}" y="${y + 36}" class="cardLabel">Questões e saldo comparativo</text><text x="${leftX + 24}" y="${y + 72}" class="bigValue">${formatPercent(accuracy)}%</text><text x="${leftX + 180}" y="${y + 68}" class="note">${escapeXml(sampleLabel(totalQuestions))} • ${totalQuestions} questões</text>`;
    let segmentX = leftX + 24;
    [[num(questions.correct), "#16a34a"], [num(questions.wrong), "#dc2626"], [num(questions.blank), "#94a3b8"]].forEach(([value, color]) => {
      const width = totalQuestions ? value / totalQuestions * trackW : 0;
      if (width > 0) body += `<rect x="${segmentX}" y="${y + 94}" width="${Math.max(5, width)}" height="34" fill="${color}"/>`;
      segmentX += width;
    });
    body += `<text x="${leftX + 24}" y="${y + 158}" class="note">${num(questions.correct)} acertos • ${num(questions.wrong)} erros • ${num(questions.blank)} brancos • saldo ${balance > 0 ? "+" : ""}${balance}</text>${svgText("Saldo A−E é comparativo. A pontuação oficial depende do edital e do modelo de correção.", leftX + 24, y + 191, "hint", 76, 21, 2)}`;

    const plans = diagnosis.plans;
    const planMax = Math.max(1, plans.planned, plans.actual);
    const executionLabel = diagnosis.executionPct === null ? "Sem planejamento" : `${formatPercent(diagnosis.executionPct)}% cumprido`;
    const gap = plans.actual - plans.planned;
    body += `<rect x="${rightX}" y="${y}" width="720" height="224" rx="22" fill="#fff" stroke="#cbd5e1"/><text x="${rightX + 24}" y="${y + 36}" class="cardLabel">Planejado x realizado</text><text x="${rightX + 24}" y="${y + 72}" class="bigValue">${escapeXml(executionLabel)}</text><text x="${rightX + 24}" y="${y + 108}" class="hint">Planejado: ${escapeXml(formatDuration(plans.planned))}</text><rect x="${rightX + 180}" y="${y + 89}" width="${plans.planned / planMax * 500}" height="22" rx="9" fill="#94a3b8"/><text x="${rightX + 24}" y="${y + 146}" class="hint">Realizado: ${escapeXml(formatDuration(plans.actual))}</text><rect x="${rightX + 180}" y="${y + 127}" width="${plans.actual / planMax * 500}" height="22" rx="9" fill="#2563eb"/><text x="${rightX + 24}" y="${y + 183}" class="note">Diferença: ${gap >= 0 ? "+" : "−"}${escapeXml(formatDuration(Math.abs(gap)))}</text>${svgText(diagnosis.executionPct !== null && diagnosis.executionPct < 70 ? "Ajuste o volume planejado ao ritmo real antes de aumentar a carga." : "Use esta relação para calibrar a próxima semana.", rightX + 24, y + 211, "hint", 70, 20, 1)}`;
    y += 250;

    section("Tempo por disciplina", "Onde o esforço foi concentrado");
    if (timeRows.length) {
      timeRows.forEach((row, index) => {
        const rowY = y + index * 47;
        const width = Math.max(7, num(row.minutes) / maxTime * 720);
        body += `<text x="${margin}" y="${rowY + 22}" class="label">${escapeXml(String(row.discipline || "Sem disciplina").slice(0, 44))}</text><rect x="670" y="${rowY + 2}" width="${width}" height="26" rx="9" fill="${index % 2 ? "#0ea5e9" : "#2563eb"}"/><text x="${Math.min(1480, 690 + width)}" y="${rowY + 23}" class="barValue">${escapeXml(formatDuration(row.minutes))}</text>`;
      });
      y += timeRows.length * 47 + 18;
    } else {
      body += `<text x="${margin}" y="${y + 32}" class="empty">Sem tempo por disciplina neste período.</text>`;
      y += 70;
    }

    section("Resultado por disciplina", "Amostra, resultado e ação prática; os níveis são orientativos");
    if (resultRows.length) {
      resultRows.forEach((row, index) => {
        const rowY = y + index * 74;
        const total = questionCount(row);
        const rowAccuracy = accuracyOf(row);
        const fill = !total ? "#f1f5f9" : total < 20 ? "#fffbeb" : rowAccuracy < 70 ? "#fef2f2" : rowAccuracy < 85 ? "#eff6ff" : "#ecfdf5";
        body += `<rect x="${margin}" y="${rowY}" width="${contentW}" height="62" rx="16" fill="${fill}"/><text x="${margin + 20}" y="${rowY + 25}" class="label">${escapeXml(String(row.discipline || "Sem disciplina").slice(0, 44))}</text><text x="${margin + 20}" y="${rowY + 49}" class="hint">${total} questões • ${formatPercent(rowAccuracy)}% • saldo ${balanceOf(row) > 0 ? "+" : ""}${balanceOf(row)} • ${escapeXml(sampleLabel(total))}</text><text x="${margin + 840}" y="${rowY + 37}" class="action">${escapeXml(actionFor(row).slice(0, 75))}</text>`;
      });
      y += resultRows.length * 74 + 15;
    } else {
      body += `<text x="${margin}" y="${y + 32}" class="empty">Sem resultados por disciplina.</text>`;
      y += 70;
    }

    section("Evolução diária", "Compare tendência e constância, não apenas o maior pico");
    if (daily.length) {
      daily.forEach((row, index) => {
        const slot = contentW / daily.length;
        const x = margin + index * slot;
        const width = Math.max(24, slot - 14);
        const height = Math.max(5, num(row.minutes) / maxDaily * 135);
        body += `<rect x="${x}" y="${y + 145 - height}" width="${width}" height="${height}" rx="8" fill="url(#blueBar)"/><text x="${x}" y="${y + 171}" class="axis">${escapeXml(formatDate(row.date).slice(0, 5))}</text><text x="${x}" y="${y + 137 - height}" class="tinyValue">${escapeXml(formatDuration(row.minutes))}</text>`;
      });
      y += 200;
    } else {
      body += `<text x="${margin}" y="${y + 32}" class="empty">Ainda não há registros diários neste período.</text>`;
      y += 70;
    }

    section("Plano prático", "Ações pequenas e verificáveis");
    [["Hoje", diagnosis.today, "#eff6ff"], ["Nesta semana", diagnosis.week, "#f5f3ff"], ["Manter", diagnosis.maintain, "#ecfdf5"]].forEach((item, index) => {
      const x = margin + index * 500;
      body += `<rect x="${x}" y="${y}" width="468" height="154" rx="22" fill="${item[2]}"/><text x="${x + 24}" y="${y + 38}" class="cardLabel">${escapeXml(item[0])}</text>${svgText(item[1], x + 24, y + 76, "note", 41, 25, 3)}`;
    });
    y += 180;

    section("Simulados", `${mocks.length} registro(s) no período`);
    if (mocks.length) {
      mocks.forEach((mock, index) => {
        const rowY = y + index * 36;
        body += `<text x="${margin}" y="${rowY + 23}" class="label">${escapeXml(formatDate(mock.date))} — ${escapeXml(mock.name || "Simulado")}</text><text x="${margin + 1130}" y="${rowY + 23}" class="value">Resultado ${escapeXml(mock.net ?? balanceOf(mock))}</text>`;
      });
      y += mocks.length * 36 + 12;
    } else {
      body += `<rect x="${margin}" y="${y}" width="${contentW}" height="64" rx="16" fill="#f1f5f9"/><text x="${margin + 22}" y="${y + 27}" class="label">Nenhum simulado registrado.</text><text x="${margin + 22}" y="${y + 50}" class="hint">Ação sugerida: agende um simulado para medir integração, tempo e estratégia.</text>`;
      y += 82;
    }

    section("Como interpretar", "Critérios transparentes desta leitura");
    body += `${svgText("Amostra: 0 = sem amostra; 1–19 = inicial; 20–49 = em formação; 50 ou mais = mais consistente. Limites didáticos, não certificação estatística.", margin, y + 4, "note", 118, 24, 2)}${svgText("Saldo A−E = acertos menos erros, usado para comparação histórica. A nota oficial depende do edital, dos pesos, das anulações e do modelo de correção.", margin, y + 62, "note", 118, 24, 2)}`;
    y += 125;

    const H = Math.max(1200, y + 70);
    return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img"><title>Relatório didático e prático de desempenho</title><defs><linearGradient id="headerV143" x1="0" x2="1"><stop stop-color="#172554"/><stop offset=".55" stop-color="#1d4ed8"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient><linearGradient id="blueBar" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#2563eb"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs><style>text{font-family:Arial,Helvetica,sans-serif}.heroTitle{font-size:46px;font-weight:900;fill:#fff}.heroMeta{font-size:21px;fill:#dbeafe}.section{font-size:25px;font-weight:900;fill:#172554}.hint{font-size:16px;fill:#64748b}.cardLabel{font-size:20px;font-weight:800;fill:#334155}.cardValue{font-size:27px;font-weight:900}.bigValue{font-size:34px;font-weight:900;fill:#1d4ed8}.label{font-size:18px;font-weight:800;fill:#0f172a}.value,.barValue{font-size:18px;font-weight:800;fill:#334155}.note{font-size:18px;fill:#475569}.action{font-size:16px;font-weight:800;fill:#334155}.axis{font-size:15px;fill:#64748b}.tinyValue{font-size:14px;font-weight:800;fill:#334155}.empty{font-size:19px;font-weight:700;fill:#64748b}</style><rect width="100%" height="100%" fill="#f8fafc"/><rect width="100%" height="190" fill="url(#headerV143)"/><text x="${margin}" y="70" class="heroTitle">Painel didático de desempenho</text><text x="${margin}" y="113" class="heroMeta">Período: ${escapeXml(period)} • ${escapeXml(discipline)}</text><text x="${margin}" y="151" class="heroMeta">Gerado em ${escapeXml(generated)} • leitura prática, critérios transparentes e dados processados localmente</text>${body}<text x="${margin}" y="${H - 30}" class="hint">Relatório gerado com dados locais. Nenhum registro foi alterado durante a análise.</text></svg>`;
  }

  function saferLabels(value) {
    return String(value || "")
      .replace(/QUESTÕES E LÍQUIDO CEBRASPE/gi, "QUESTÕES E SALDO A-E (COMPARATIVO)")
      .replace(/Questões e desempenho Cebraspe/gi, "Questões e desempenho")
      .replace(/Questões e líquido Cebraspe/gi, "Questões e saldo A−E")
      .replace(/Resultado Cebraspe/gi, "Resultado comparativo A−E")
      .replace(/Líquido por disciplina/gi, "Saldo A−E por disciplina")
      .replace(/Líquido Cebraspe/gi, "Saldo A−E (comparativo)")
      .replace(/líquido Cebraspe/gi, "saldo A−E comparativo");
  }

  function enhanceCsv(csv) {
    const source = saferLabels(csv).replace(/;Líquido;/g, ";Saldo A-E (comparativo);");
    const note = "\n\nMETODOLOGIA\nSaldo A-E = acertos menos erros; indicador comparativo. A pontuação oficial depende do edital e do modelo de correção.";
    return source.includes("Saldo A-E = acertos menos erros") ? source : `${source}${note}`;
  }

  function ensureStyles() {
    if (!root?.document || document.getElementById("performancePracticalStylesV143")) return;
    const style = document.createElement("style");
    style.id = "performancePracticalStylesV143";
    style.textContent = `
      #analyticsPracticalReadingV143{display:grid;gap:14px;margin:0 0 20px;padding:18px;border:1px solid var(--border,#dbe4f0);border-radius:20px;background:var(--surface,#fff)}
      #analyticsPracticalReadingV143 .practical-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
      #analyticsPracticalReadingV143 .practical-head small{display:block;margin-bottom:4px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#64748b)}
      #analyticsPracticalReadingV143 .practical-grid,#analyticsPracticalReadingV143 .practical-plan{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      #analyticsPracticalReadingV143 article{padding:14px;border:1px solid var(--border,#dbe4f0);border-radius:15px;background:rgba(37,99,235,.05)}
      #analyticsPracticalReadingV143 article strong{display:block;margin-bottom:7px}
      #analyticsPracticalReadingV143 article p{margin:0;line-height:1.5}
      #analyticsPracticalReadingV143 .practical-plan span{padding:11px 12px;border-radius:13px;background:rgba(124,58,237,.07);line-height:1.45}
      #analyticsPracticalReadingV143 .practical-method{margin:0;color:var(--muted,#64748b);font-size:.82rem}
      html[data-aldus-theme="premium-stable"] #analyticsPracticalReadingV143{border-color:rgba(104,173,220,.44);background:rgba(7,39,64,.82)}
      html[data-aldus-theme="premium-stable"] #analyticsPracticalReadingV143 article{border-color:rgba(104,173,220,.32);background:rgba(10,54,86,.72)}
      html[data-aldus-theme="premium-stable"] #analyticsPracticalReadingV143 .practical-plan span{background:rgba(37,99,235,.18)}
      @media(max-width:820px){#analyticsPracticalReadingV143 .practical-grid,#analyticsPracticalReadingV143 .practical-plan{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  let renderingPanel = false;
  function renderLivePanel(payload) {
    if (!root?.document || !payload || renderingPanel) return;
    const host = document.getElementById("analyticsContent");
    if (!host) return;
    renderingPanel = true;
    try {
      ensureStyles();
      const diagnosis = buildPracticalDiagnosis(payload);
      let panel = document.getElementById("analyticsPracticalReadingV143");
      if (!panel) {
        panel = document.createElement("section");
        panel.id = "analyticsPracticalReadingV143";
        panel.dataset.performancePracticalVersion = VERSION;
        host.prepend(panel);
      }
      const markup = `<div class="practical-head"><div><small>LEITURA PRÁTICA</small><strong>Diagnóstico em 30 segundos</strong></div><span>${escapeXml(sampleLabel(diagnosis.questionTotal))}</span></div><div class="practical-grid"><article><strong>Principal avanço</strong><p>${escapeXml(diagnosis.advance)}</p></article><article><strong>Principal atenção</strong><p>${escapeXml(diagnosis.attention)}</p></article><article><strong>Próxima ação</strong><p>${escapeXml(diagnosis.nextAction)}</p></article></div><div class="practical-plan"><span><strong>Hoje:</strong> ${escapeXml(diagnosis.today)}</span><span><strong>Nesta semana:</strong> ${escapeXml(diagnosis.week)}</span><span><strong>Manter:</strong> ${escapeXml(diagnosis.maintain)}</span></div><p class="practical-method">Saldo A−E é comparativo. A pontuação oficial depende do edital. Os níveis de amostra são referências didáticas, não certificação estatística.</p>`;
      if (panel.innerHTML !== markup) panel.innerHTML = markup;
      relabelAnalytics(host);
    } finally {
      renderingPanel = false;
    }
  }

  let relabeling = false;
  function relabelAnalytics(scope = document.getElementById("view-analise-estrategica")) {
    if (!scope || relabeling || typeof document.createTreeWalker !== "function") return;
    relabeling = true;
    try {
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const source = node.textContent || "";
        const next = saferLabels(source)
          .replace(/Fórmula: acertos menos erros\. Questões em branco são neutras\./gi, "Indicador comparativo: acertos − erros. A pontuação oficial depende do edital.")
          .replace(/Metodologia: líquido Cebraspe = acertos - erros; brancos são neutros; filtros e período vêm da Análise Estratégica\./gi, "Metodologia: saldo A−E é comparativo; a pontuação oficial depende do edital e do modelo de correção.");
        if (next !== source) node.textContent = next;
      });
    } finally {
      relabeling = false;
    }
  }

  let latestPayload = null;
  let installed = false;
  const originals = {};

  function currentPayload() {
    try { if (typeof currentPerformanceExportPayload === "function") return currentPerformanceExportPayload(); } catch {}
    try { if (typeof latestPerformanceExportPayload !== "undefined") return latestPerformanceExportPayload; } catch {}
    return latestPayload;
  }

  function installOverrides() {
    if (!root || installed || typeof root.buildFullPerformanceReportSvg !== "function") return false;
    originals.buildFullPerformanceReportSvg = root.buildFullPerformanceReportSvg;
    root.buildFullPerformanceReportSvg = buildPracticalReportSvg;

    if (typeof root.buildPerformanceCsv === "function") {
      originals.buildPerformanceCsv = root.buildPerformanceCsv;
      root.buildPerformanceCsv = function (...args) { return enhanceCsv(originals.buildPerformanceCsv.apply(this, args)); };
    }
    if (typeof root.buildIndividualChartCsv === "function") {
      originals.buildIndividualChartCsv = root.buildIndividualChartCsv;
      root.buildIndividualChartCsv = function (...args) { return enhanceCsv(originals.buildIndividualChartCsv.apply(this, args)); };
    }
    if (typeof root.buildChartSvg === "function") {
      originals.buildChartSvg = root.buildChartSvg;
      root.buildChartSvg = function (type, data, metadata = {}) { return saferLabels(originals.buildChartSvg.call(this, type, data, { ...metadata, title: saferLabels(metadata.title) })); };
    }
    if (typeof root.setupPerformanceExportControls === "function") {
      originals.setupPerformanceExportControls = root.setupPerformanceExportControls;
      root.setupPerformanceExportControls = function (payload, ...rest) {
        latestPayload = payload;
        const result = originals.setupPerformanceExportControls.call(this, payload, ...rest);
        window.setTimeout(() => renderLivePanel(payload), 0);
        return result;
      };
    }
    if (typeof root.openChartPickerMenu === "function") {
      originals.openChartPickerMenu = root.openChartPickerMenu;
      root.openChartPickerMenu = function (...args) {
        const result = originals.openChartPickerMenu.apply(this, args);
        window.setTimeout(() => relabelAnalytics(document.getElementById("chartExportFormatMenu") || document.body), 0);
        return result;
      };
    }

    installed = true;
    root.__aldusPerformancePracticalV143 = true;
    const payload = currentPayload();
    if (payload) renderLivePanel(payload);
    else relabelAnalytics();
    return true;
  }

  const api = { VERSION, sampleLabel, actionFor, buildPracticalDiagnosis, buildPracticalReportSvg, saferLabels, enhanceCsv };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root?.document || root.__aldusPerformancePracticalV143) return;

  let attempts = 0;
  const retry = () => {
    attempts += 1;
    if (installOverrides() || attempts >= 40) return;
    window.setTimeout(retry, 250);
  };
  retry();

  document.addEventListener("click", (event) => {
    if (event.target.closest('[data-performance-export="methodology"], [data-performance-export="charts"], [data-chart-export]')) window.setTimeout(() => relabelAnalytics(), 0);
  }, true);
  window.addEventListener("hashchange", () => {
    const payload = currentPayload();
    if (payload) window.setTimeout(() => renderLivePanel(payload), 0);
  });
})();