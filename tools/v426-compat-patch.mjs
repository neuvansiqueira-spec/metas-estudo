import fs from 'node:fs';

for (const name of ['script.js', 'docs/script.js']) {
  let text = fs.readFileSync(name, 'utf8');
  const helperMarker = 'function factorySyncLinkTokens(item = {}) {';
  const syncMarker = 'function syncFactoryWithActiveEdital() {';

  let syncStart = text.indexOf(syncMarker);
  if (syncStart < 0) throw new Error(`sync block missing: ${name}`);

  // Tentativas anteriores podem ter deixado o bloco auxiliar repetido. Mantém apenas a última cópia antes do sync.
  while (true) {
    const first = text.indexOf(helperMarker);
    if (first < 0 || first >= syncStart) throw new Error(`helper block missing: ${name}`);
    const second = text.indexOf(helperMarker, first + helperMarker.length);
    if (second < 0 || second >= syncStart) break;
    text = text.slice(0, first) + text.slice(second);
    syncStart = text.indexOf(syncMarker);
  }

  const oldLookup = `  const findExisting = (group) => {\n    const exact = byKey.get(group.key);\n    if (exact) return exact;\n`;
  const newLookup = `  const findExisting = (group) => {\n    const existing = byKey.get(group.key);\n    if (existing) return existing;\n`;
  if (text.includes(oldLookup)) text = text.replace(oldLookup, newLookup);
  if (!text.includes(newLookup)) throw new Error(`groupKey compatibility block missing: ${name}`);

  const oldCreate = `    const createdItem = normalizeFactoryItem({\n      id: createId(), disciplina: group.discipline, tema: group.subject, prioridade: "Média", status: "Não iniciado",\n      observacao: recorte, createdAt: now, updatedAt: now,\n      editalLink: { groupKey: group.key, itemIds: group.itemIds, itemKeys: group.itemKeys, discipline: group.discipline, subject: group.subject, references: group.references, topics: group.topics },\n      editalSubtemas: group.subtopics, editalActive: true\n    });\n    agenda.push(createdItem);\n    indexItem(createdItem);\n`;
  const newCreate = `    agenda.push(normalizeFactoryItem({\n      id: createId(), disciplina: group.discipline, tema: group.subject, prioridade: "Média", status: "Não iniciado",\n      observacao: recorte, createdAt: now, updatedAt: now,\n      editalLink: { groupKey: group.key, itemIds: group.itemIds, itemKeys: group.itemKeys, discipline: group.discipline, subject: group.subject, references: group.references, topics: group.topics },\n      editalSubtemas: group.subtopics, editalActive: true\n    }));\n    const createdItem = agenda[agenda.length - 1];\n    indexItem(createdItem);\n`;
  if (text.includes(oldCreate)) text = text.replace(oldCreate, newCreate);
  if (!text.includes(newCreate)) throw new Error(`creation compatibility block missing: ${name}`);

  const helpers = text.match(/function factorySyncLinkTokens\(item = \{\}\) \{/g) || [];
  if (helpers.length !== 1) throw new Error(`expected exactly one helper block in ${name}, got ${helpers.length}`);

  fs.writeFileSync(name, text);
}
