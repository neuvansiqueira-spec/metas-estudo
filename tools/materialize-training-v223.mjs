import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const sourcePath = path.join(root, "tools", "question-bank-training-v223.js.gz.b64");
const outputPath = path.join(root, "question-bank-training-v223.js");
const encoded = fs.readFileSync(sourcePath, "utf8").trim();
const source = zlib.gunzipSync(Buffer.from(encoded, "base64"));
fs.writeFileSync(outputPath, source);
console.log(`Runtime materializado em ${outputPath}.`);
