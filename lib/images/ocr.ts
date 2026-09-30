import type { Worker } from "tesseract.js";
import { validateImages } from "./participants";
export async function readImages(
  files: File[],
  progress: (message: string) => void,
  signal: AbortSignal,
): Promise<string[]> {
  validateImages(files);
  const { createWorker } = await import("tesseract.js");
  signal.throwIfAborted();
  let worker: Worker | undefined;
  let pendingWorker: Promise<Worker> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectAbort: (error: Error) => void = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const abort = () => rejectAbort(new Error("Leitura cancelada."));
  signal.addEventListener("abort", abort, { once: true });
  let current = 0;
  try {
    timer = setTimeout(
      () =>
        rejectAbort(
          new Error("A leitura demorou demais. Tente imagens menores."),
        ),
      180000,
    );
    pendingWorker = createWorker("eng", 1, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
      workerBlobURL: false,
      cacheMethod: "none",
      logger: (m) =>
        progress(
          m.status === "recognizing text"
            ? `Imagem ${current + 1} de ${files.length} · ${Math.round(m.progress * 100)}%`
            : "Preparando leitura…",
        ),
    });
    worker = await Promise.race([pendingWorker, interrupted]);
    const result: string[] = [];
    for (current = 0; current < files.length; current++) {
      signal.throwIfAborted();
      const bitmap = await createImageBitmap(files[current]);
      try {
        if (bitmap.width * bitmap.height > 25_000_000)
          throw new Error(
            "Imagem muito grande. Recorte o print para até 25 megapixels.",
          );
        const canvas = document.createElement("canvas");
        const scale = Math.min(2, 2400 / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Não foi possível preparar a imagem.");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const response = await Promise.race([
          worker.recognize(canvas),
          interrupted,
        ]);
        result.push(response.data.text);
      } finally {
        bitmap.close();
      }
    }
    return result;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    if (worker) await worker.terminate();
    else if (pendingWorker)
      void pendingWorker.then((w) => w.terminate()).catch(() => {});
  }
}
