const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('V661: "Com detalhes" tem a caixinha e o campo de tema específico fora do edital', () => {
  for (const file of ['index.html', 'docs/index.html']) {
    const html = read(file);
    const form = html.slice(html.indexOf('<form id="goalForm"'), html.indexOf('</form>', html.indexOf('<form id="goalForm"')));
    assert.match(form, /<input id="goalFreeTheme" type="checkbox"/, file);
    assert.match(form, /id="goalSyllabusItemField"[^>]*>Assunto<select id="goalSyllabusItem" required>/, file);
    assert.match(form, /id="goalFreeThemeField" hidden>Tema específico<input id="goalFreeThemeText" type="text"/, file);
  }
});

test('V661: meta de tema específico não se vincula a assunto do edital', () => {
  for (const file of ['script.js', 'app-v424.js']) {
    const script = read(file);
    assert.match(script, /function isGoalFreeThemeModeV661\(\)/, file);
    assert.match(script, /syllabusItemId: \(operationalSimulado \|\| freeTheme\) \? "" : item\.id/, file);
    assert.match(script, /baseSubject: operationalSimulado \? SIMULADOS_OPERATIONAL\.SUBJECT : freeTheme \? freeThemeText : item\.subject/, file);
    assert.match(script, /referencia_edital: \(operationalSimulado \|\| freeTheme\) \? "" :/, file);
    assert.match(script, /temaForaDoEdital: freeTheme,/, file);
    assert.match(script, /if \(freeTheme && !freeThemeText\) return alert\("Escreva o tema específico\."\);/, file);
    // Editar reabre a meta no modo de tema específico; o reset volta ao modo do edital.
    assert.match(script, /const freeThemeGoal = isFreeThemeGoalV661\(goal\);/, file);
    assert.match(script, /if \(elements\.cancelGoalEdit\) elements\.cancelGoalEdit\.hidden = true;\s*syncGoalFreeThemeFieldsV661\(\);/, file);
  }
});

test('V661.1: a Fábrica cria a mesma meta de tema específico, sem duplicar no mesmo dia', () => {
  for (const file of ['script.js', 'app-v424.js']) {
    const script = read(file);
    const start = script.indexOf('function addFreeThemeGoalV661(');
    assert.ok(start > 0, file);
    const body = script.slice(start, script.indexOf('globalThis.addFreeThemeGoalV661 = addFreeThemeGoalV661;', start));
    assert.match(body, /syllabusItemId: "", subject: theme, assunto: theme, baseSubject: theme, referencia_edital: "",/, file);
    assert.match(body, /temaForaDoEdital: true,/, file);
    assert.match(body, /origin: "manual", origem: "manual"/, file);
    assert.match(body, /const duplicate = findSemanticDuplicateGoalV641\(state, goal, null\);\s*if \(duplicate\) return \{ ok: false, code: "duplicate"/, file);
    assert.match(body, /appendGoalHistory\(goal, `Meta manual criada/, file);
  }
});
