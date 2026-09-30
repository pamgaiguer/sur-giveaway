import type { DrawResult } from "./types";
export function resultText(result: DrawResult): string {
  return [
    "SUR GIVEAWAY",
    result.mode === "random"
      ? "SORTEIO ALEATÓRIO"
      : "CURADORIA / SIMULAÇÃO — seleção manual",
    ...result.winners.map(
      (w, i) =>
        `${result.mode === "random" ? "Vencedor" : "Selecionado"} ${i + 1}: @${w.username}\n${w.comment.source === "images" ? "Origem: lista revisada de imagens" : `Comentário: ${w.comment.text}`}`,
    ),
    ...result.alternates.map((w, i) => `Suplente ${i + 1}: @${w.username}`),
    result.createdAt,
  ].join("\n\n");
}
export function downloadJSON(value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "sur-giveaway-resultado.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
