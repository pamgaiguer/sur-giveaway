import { expect, it } from "vitest";
import {
  extractHandles,
  reviewHandles,
  createImageImport,
  validateImages,
} from "@/lib/images/participants";
import { getParticipants } from "@/lib/giveaway/eligibility";
import { defaultRules } from "@/lib/giveaway/types";
import { curateParticipant } from "@/lib/giveaway/curation";
import { resultText } from "@/lib/giveaway/export";
it("extrai @ explícitos, normaliza e deduplica entre prints sem emails", () =>
  expect(
    extractHandles("@Ana.rock @bia_rock\n@ANA.rock contato@mail.com @caio."),
  ).toEqual(["ana.rock", "bia_rock", "caio"]));
it("não adivinha nomes em texto sem @", () =>
  expect(extractHandles("Responder Curtir ana")).toEqual([]));
it("rejeita usernames inválidos em vez de truncar", () =>
  expect(extractHandles("@" + "a".repeat(31) + " @a..b @.ana")).toEqual([]));
it("revisão aceita nomes sem @ e informa linhas inválidas", () =>
  expect(reviewHandles("ana\n@ANA\n@bia\n@nome invalido")).toEqual({
    usernames: ["ana", "bia"],
    invalid: ["@nome invalido"],
    duplicates: 1,
  }));
it("bloqueia confirmação vazia ou inválida", () => {
  expect(() => createImageImport("", ["x.png"])).toThrow();
  expect(() => createImageImport("@ana\n???", ["x.png"])).toThrow();
});
it("identifica origem e mantém só uma entrada por username", () => {
  const data = createImageImport("@ana\n@ANA\n@bia", ["a.png", "b.png"]);
  expect(data.source).toBe("images");
  expect(data.comments).toHaveLength(2);
  expect(data.comments[0]).toMatchObject({
    source: "images",
    text: "",
    mentionedUsers: [],
  });
  const pool = getParticipants(data.comments, defaultRules, ["bia"]);
  expect(pool[0].entries).toBe(1);
  expect(pool[1].eligible).toBe(false);
  expect(resultText(curateParticipant(pool[0]))).toContain(
    "Origem: lista revisada de imagens",
  );
});
it("valida quantidade, tamanho e formato", () => {
  const image = { size: 100, type: "image/png" };
  expect(() => validateImages(Array(5).fill(image))).not.toThrow();
  expect(() => validateImages(Array(6).fill(image))).toThrow();
  expect(() => validateImages([])).toThrow();
  expect(() =>
    validateImages([{ size: 100, type: "image/svg+xml" }]),
  ).toThrow();
  expect(() => validateImages([{ size: 0, type: "image/png" }])).toThrow();
  expect(() =>
    validateImages([{ size: 11 * 1024 * 1024, type: "image/png" }]),
  ).toThrow();
});
