import fs from "node:fs";

const path = "script.js";
const source = fs.readFileSync(path, "utf8");
const legacy = `.then((registration) => {
        registration.update();
        console.log("[Metas Estudo] Service worker registrado.");
      })`;
const direct = `.then(() => console.log("[Metas Estudo] Service worker registrado."))`;

if (source.includes(legacy)) {
  fs.writeFileSync(path, source.replace(legacy, direct));
} else if (!source.includes(direct)) {
  throw new Error("Bloco de registro do service worker não reconhecido.");
}
