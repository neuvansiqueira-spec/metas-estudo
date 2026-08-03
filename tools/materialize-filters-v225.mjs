import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();

function materialize(sourceRelativePath, outputRelativePath) {
  const sourcePath = path.join(root, sourceRelativePath);
  const outputPath = path.join(root, outputRelativePath);
  const encoded = fs.readFileSync(sourcePath, "utf8").trim();
  const content = zlib.gunzipSync(Buffer.from(encoded, "base64"));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content);
  console.log(`Materializado: ${outputRelativePath}`);
}

materialize("tools/question-bank-filters-v225.js.gz.b64", "question-bank-filters-v225.js");
materialize("tools/question-bank-filters-v225.test.js.gz.b64", "tests/question-bank-filters-v225.test.js");
