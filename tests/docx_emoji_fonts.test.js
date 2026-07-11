const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const zlib = require('node:zlib');

const modules = ['RESUMO/AULA', 'LEI', 'JURISPRUDÊNCIA', 'PEÇA', 'ATUALIZAÇÃO/COMPLEMENTO', 'CONSOLIDADO FINAL'];

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (~crc) >>> 0;
}

function zip(files, out) {
  const chunks = [];
  let offset = 0;
  const central = [];
  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name);
    const data = Buffer.from(content);
    const compressed = zlib.deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26);
    chunks.push(local, nameBuf, compressed);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0, 8); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(compressed.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nameBuf.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, nameBuf); offset += local.length + nameBuf.length + compressed.length;
  }
  const centralSize = central.reduce((sum, b) => sum + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(Object.keys(files).length, 8); eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(centralSize, 12); eocd.writeUInt32LE(offset, 16);
  fs.writeFileSync(out, Buffer.concat([...chunks, ...central, eocd]));
}

function unzipDocumentXml(docx) {
  const data = fs.readFileSync(docx);
  let pos = 0;
  while (pos < data.length && data.readUInt32LE(pos) === 0x04034b50) {
    const method = data.readUInt16LE(pos + 8);
    const compressedSize = data.readUInt32LE(pos + 18);
    const nameLength = data.readUInt16LE(pos + 26);
    const extraLength = data.readUInt16LE(pos + 28);
    const name = data.slice(pos + 30, pos + 30 + nameLength).toString();
    const start = pos + 30 + nameLength + extraLength;
    if (name === 'word/document.xml') return zlib.inflateRawSync(data.slice(start, start + compressedSize)).toString();
    pos = start + compressedSize;
  }
  throw new Error('word/document.xml not found');
}

function minimalDocxXml(moduleName) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:b/><w:sz w:val="24"/></w:rPr><w:t>${moduleName} 📚 1️⃣ ✅ ⚖️ texto</w:t></w:r></w:p></w:body></w:document>`;
}

test('normaliza fonte de emojis em DOCX de todos os módulos sem alterar fonte do texto', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-emoji-'));
  for (const moduleName of modules) {
    const docx = path.join(tmp, `${moduleName.replace(/[^a-z0-9]/gi, '-')}.docx`);
    zip({
      '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      'word/document.xml': minimalDocxXml(moduleName),
    }, docx);
    execFileSync('python3', ['scripts/docx_emoji_fonts.py', docx], { cwd: path.resolve(__dirname, '..') });
    const xml = unzipDocumentXml(docx);
    assert.match(xml, /<w:t>RESUMO\/AULA |<w:t>LEI |<w:t>JURISPRUDÊNCIA |<w:t>PEÇA |<w:t>ATUALIZAÇÃO\/COMPLEMENTO |<w:t>CONSOLIDADO FINAL /);
    assert.match(xml, /<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial" \/><w:b \/><w:sz w:val="24" \/><\/w:rPr><w:t>[^<]*texto<\/w:t>/);
    assert.match(xml, /<w:rFonts w:ascii="Segoe UI Emoji" w:hAnsi="Segoe UI Emoji" w:eastAsia="Segoe UI Emoji" w:cs="Segoe UI Emoji" \/>/);
    assert.match(xml, /<w:t>📚<\/w:t>/);
    assert.match(xml, /<w:t>1️⃣<\/w:t>/);
    assert.match(xml, /<w:t>✅<\/w:t>/);
    assert.match(xml, /<w:t>⚖️<\/w:t>/);
  }
});
