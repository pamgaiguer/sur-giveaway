import { mkdir, copyFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const target = new URL("../public/ocr/", import.meta.url).pathname;
await mkdir(join(target, "core"), { recursive: true });
await mkdir(join(target, "lang"), { recursive: true });
const tesseract = dirname(require.resolve("tesseract.js/package.json"));
const core = dirname(require.resolve("tesseract.js-core/package.json"));
const lang = dirname(require.resolve("@tesseract.js-data/eng/package.json"));
await copyFile(
  join(tesseract, "dist/worker.min.js"),
  join(target, "worker.min.js"),
);
for (const name of await readdir(core))
  if (/\.wasm(?:\.js)?$/.test(name))
    await copyFile(join(core, name), join(target, "core", name));
await copyFile(
  join(lang, "4.0.0_best_int/eng.traineddata.gz"),
  join(target, "lang/eng.traineddata.gz"),
);
console.log("OCR local preparado.");
