import { describe, expect, it, vi } from "vitest";
import { extractShortcode } from "@/lib/instagram/url";
import {
  normalizeComments,
  parseMentions,
  parseBlacklist,
} from "@/lib/giveaway/normalize";
import { getParticipants } from "@/lib/giveaway/eligibility";
import { randomDraw, secureInt } from "@/lib/giveaway/draw";
import { curateParticipant } from "@/lib/giveaway/curation";
import { defaultRules } from "@/lib/giveaway/types";
import { resultText } from "@/lib/giveaway/export";
const comments = normalizeComments([
  { id: "1", username: "Ana", text: "vamos @bia" },
  { id: "2", username: "ana", text: "vamos @bia" },
  { id: "3", username: "ana", text: "outro @bia @caio" },
  { id: "4", username: "bia", text: "rock" },
  { id: "5", username: "sempreumrock", text: "@ana" },
]);
describe("URL e normalização", () => {
  it.each(["p", "reel"])("extrai shortcode de %s", (kind) =>
    expect(
      extractShortcode(`https://www.instagram.com/${kind}/Ab_C-123/?igsh=foo`),
    ).toBe("Ab_C-123"),
  );
  it.each([
    "https://evil.com/p/ABC/",
    "https://instagram.com.evil.com/p/ABC/",
    "http://instagram.com/p/ABC/",
    "https://user:pass@instagram.com/p/ABC/",
    "https://instagram.com/stories/ABC/",
    "https://instagram.com/p/A/extra",
    "invalido",
  ])("rejeita %s", (url) => expect(() => extractShortcode(url)).toThrow());
  it("extrai menções distintas, sem email", () =>
    expect(parseMentions("Olá @Ana, @ana! @bia.rock teste@email.com")).toEqual([
      "ana",
      "bia.rock",
    ]));
  it("deduplica IDs e normaliza username", () =>
    expect(
      normalizeComments([
        { id: "1", username: "@ANA", text: "" },
        { id: "1", username: "ana", text: "" },
      ]),
    ).toHaveLength(1));
});
describe("Elegibilidade", () => {
  it("uma chance por usuário", () =>
    expect(getParticipants(comments, defaultRules, [])[0].entries).toBe(1));
  it("uma chance por comentário com duplicados removidos por autor", () =>
    expect(
      getParticipants(
        comments,
        { ...defaultRules, entryMode: "comment" },
        [],
      )[0].entries,
    ).toBe(2));
  it("preserva duplicados quando solicitado", () =>
    expect(
      getParticipants(
        comments,
        { ...defaultRules, entryMode: "comment", ignoreDuplicates: false },
        [],
      )[0].entries,
    ).toBe(3));
  it("blacklist ignora caixa e @", () =>
    expect(
      getParticipants(comments, defaultRules, parseBlacklist("@ANA\n@bia"))[0],
    ).toMatchObject({
      eligible: false,
      entries: 0,
      exclusionReason: "Na blacklist",
    }));
  it("mínimo de menções vale por comentário", () =>
    expect(
      getParticipants(
        comments,
        { ...defaultRules, minMentions: 2, entryMode: "comment" },
        [],
      )[0].entries,
    ).toBe(1));
  it("exclui organizador e username ausente", () => {
    expect(getParticipants(comments, defaultRules, [])[2].eligible).toBe(false);
    expect(
      getParticipants(
        normalizeComments([{ id: "x", text: "oi" }]),
        defaultRules,
        [],
      )[0].eligible,
    ).toBe(false);
  });
  it("não remove textos iguais de autores diferentes", () =>
    expect(
      getParticipants(
        normalizeComments([
          { id: "1", username: "a", text: "rock" },
          { id: "2", username: "b", text: "rock" },
        ]),
        defaultRules,
        [],
      ).filter((p) => p.eligible),
    ).toHaveLength(2));
});
describe("Sorteio e curadoria", () => {
  const pool = getParticipants(comments, defaultRules, []);
  it("usa crypto e não Math.random; não repete vencedor nem suplente", () => {
    const crypto = vi.spyOn(globalThis.crypto, "getRandomValues");
    const math = vi.spyOn(Math, "random").mockImplementation(() => {
      throw Error("Proibido");
    });
    const result = randomDraw(pool, 1, 1);
    expect(
      new Set([...result.winners, ...result.alternates].map((p) => p.username))
        .size,
    ).toBe(2);
    expect(crypto).toHaveBeenCalled();
    expect(math).not.toHaveBeenCalled();
    expect(result.mode).toBe("random");
    expect(pool).toHaveLength(3);
  });
  it("rejeita amostras que produziriam viés de módulo", () => {
    const values = [0xffffffff, 7];
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(
      (array) => {
        (array as Uint32Array)[0] = values.shift()!;
        return array;
      },
    );
    expect(secureInt(3)).toBe(1);
    expect(values).toHaveLength(0);
  });
  it("respeita pesos nas fronteiras", () => {
    const weighted = getParticipants(
      comments,
      { ...defaultRules, entryMode: "comment" },
      [],
    );
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(
      (array) => {
        (array as Uint32Array)[0] = 2;
        return array;
      },
    );
    expect(randomDraw(weighted, 1, 0).winners[0].username).toBe("bia");
  });
  it("rejeita contagens inválidas e falta de participantes", () => {
    for (const [w, a] of [
      [0, 0],
      [1, -1],
      [1.5, 0],
      [2, 1],
    ])
      expect(() => randomDraw(pool, w, a)).toThrow();
  });
  it("curadoria não chama crypto e é rotulada em exportação", () => {
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(() => {
      throw Error("Curadoria não pode sortear");
    });
    const result = curateParticipant(pool[0]);
    expect(result.mode).toBe("curation");
    expect(resultText(result)).toContain("CURADORIA / SIMULAÇÃO");
    expect(result.winners[0].username).toBe("ana");
    expect(result.alternates).toEqual([]);
  });
});
