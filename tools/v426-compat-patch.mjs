import fs from 'node:fs';

for (const name of ['script.js', 'docs/script.js']) {
  let text = fs.readFileSync(name, 'utf8').replace(/\r\n/g, '\n');
  const helperMarker = 'function factorySyncLinkTokens(item = {}) {';
  const syncMarker = 'function syncFactoryWithActiveEdital() {';

  const syncStartInitial = text.indexOf(syncMarker);
  if (syncStartInitial < 0) throw new Error(`sync block missing: ${name}`);

  const helperPositions = [];
  for (let pos = text.indexOf(helperMarker); pos >= 0 && pos < syncStartInitial; pos = text.indexOf(helperMarker, pos + helperMarker.length)) {
    helperPositions.push(pos);
  }
  if (!helperPositions.length) throw new Error(`helper block missing: ${name}`);
  if (helperPositions.length > 1) {
    text = text.slice(0, helperPositions[0]) + text.slice(helperPositions[helperPositions.length - 1]);
  }

  text = text.replace(
    /(const\s+findExisting\s*=\s*\(group\)\s*=>\s*\{\s*)const\s+exact\s*=\s*byKey\.get\(group\.key\);\s*if\s*\(exact\)\s*return\s+exact;/,
    '$1const existing = byKey.get(group.key);\n    if (existing) return existing;'
  );
  if (!/const\s+existing\s*=\s*byKey\.get\(group\.key\);\s*if\s*\(existing\)\s*return\s+existing;/.test(text)) {
    throw new Error(`groupKey compatibility block missing: ${name}`);
  }

  const createPattern = /const\s+createdItem\s*=\s*normalizeFactoryItem\(\{([\s\S]*?editalSubtemas:\s*group\.subtopics,\s*editalActive:\s*true[\s\S]*?)\}\);\s*agenda\.push\(createdItem\);\s*indexItem\(createdItem\);/;
  if (createPattern.test(text)) {
    text = text.replace(createPattern, (_match, body) => `agenda.push(normalizeFactoryItem({${body}}));\n    const createdItem = agenda[agenda.length - 1];\n    indexItem(createdItem);`);
  }
  if (!/agenda\.push\(normalizeFactoryItem\(\{[\s\S]*?editalSubtemas:\s*group\.subtopics,\s*editalActive:\s*true[\s\S]*?\}\)\);\s*const\s+createdItem\s*=\s*agenda\[agenda\.length\s*-\s*1\];\s*indexItem\(createdItem\);/.test(text)) {
    throw new Error(`creation compatibility block missing: ${name}`);
  }

  const helpers = text.match(/function factorySyncLinkTokens\(item = \{\}\) \{/g) || [];
  if (helpers.length !== 1) throw new Error(`expected exactly one helper block in ${name}, got ${helpers.length}`);

  fs.writeFileSync(name, text);
}
