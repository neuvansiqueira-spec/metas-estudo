import fs from 'node:fs';

for (const name of ['script.js', 'docs/script.js']) {
  let text = fs.readFileSync(name, 'utf8');

  const oldLookup = `            const findExisting = (group) => {\n              const exact = byKey.get(group.key);\n              if (exact) return exact;\n`;
  const newLookup = `            const findExisting = (group) => {\n              const existing = byKey.get(group.key);\n              if (existing) return existing;\n`;
  if (!text.includes(oldLookup)) throw new Error(`groupKey block missing: ${name}`);
  text = text.replace(oldLookup, newLookup);

  const oldCreate = `              const createdItem = normalizeFactoryItem({\n                id: createId(), disciplina: group.discipline, tema: group.subject, prioridade: "Média", status: "Não iniciado",\n                observacao: recorte, createdAt: now, updatedAt: now,\n                editalLink: { groupKey: group.key, itemIds: group.itemIds, itemKeys: group.itemKeys, discipline: group.discipline, subject: group.subject, references: group.references, topics: group.topics },\n                editalSubtemas: group.subtopics, editalActive: true\n              });\n              agenda.push(createdItem);\n              indexItem(createdItem);\n`;
  const newCreate = `              agenda.push(normalizeFactoryItem({\n                id: createId(), disciplina: group.discipline, tema: group.subject, prioridade: "Média", status: "Não iniciado",\n                observacao: recorte, createdAt: now, updatedAt: now,\n                editalLink: { groupKey: group.key, itemIds: group.itemIds, itemKeys: group.itemKeys, discipline: group.discipline, subject: group.subject, references: group.references, topics: group.topics },\n                editalSubtemas: group.subtopics, editalActive: true\n              }));\n              const createdItem = agenda[agenda.length - 1];\n              indexItem(createdItem);\n`;
  if (!text.includes(oldCreate)) throw new Error(`creation block missing: ${name}`);
  text = text.replace(oldCreate, newCreate);

  fs.writeFileSync(name, text);
}
