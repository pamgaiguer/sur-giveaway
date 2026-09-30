import type { DrawResult, Participant, Selection } from "./types";
export function secureInt(max: number): number {
  if (!Number.isSafeInteger(max) || max < 1 || max > 0x100000000)
    throw new Error("Quantidade de chances inválida.");
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}
export function randomDraw(
  participants: Participant[],
  winners: number,
  alternates: number,
): DrawResult {
  const pool = participants.filter((p) => p.eligible && p.entries > 0);
  if (
    !Number.isInteger(winners) ||
    winners < 1 ||
    !Number.isInteger(alternates) ||
    alternates < 0 ||
    winners + alternates > pool.length
  )
    throw new Error(
      "Não há participantes elegíveis suficientes para essa quantidade de vencedores e suplentes.",
    );
  if (new Set(pool.map((p) => p.username.toLowerCase())).size !== pool.length)
    throw new Error("Participantes repetidos.");
  const selected: Selection[] = [];
  for (let i = 0; i < winners + alternates; i++) {
    let ticket = secureInt(pool.reduce((sum, p) => sum + p.entries, 0));
    const index = pool.findIndex((p) => {
      ticket -= p.entries;
      return ticket < 0;
    });
    const [participant] = pool.splice(index, 1);
    selected.push({
      username: participant.username,
      comment:
        participant.validComments[secureInt(participant.validComments.length)],
    });
  }
  return {
    mode: "random",
    createdAt: new Date().toISOString(),
    winners: selected.slice(0, winners),
    alternates: selected.slice(winners),
  };
}
