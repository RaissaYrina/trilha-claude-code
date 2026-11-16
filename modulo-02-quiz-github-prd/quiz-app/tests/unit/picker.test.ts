import { describe, expect, it, vi } from "vitest";
import beginner from "@/content/questions/beginner.json";
import { pickQuestions, shuffle, TRUE_RANGE } from "@/lib/questions/picker";
import type { Question } from "@/lib/questions/schema";

const bank = beginner as Question[];

/** Banco sintético com `trues` respostas verdadeiras e o resto falsas. */
const makeBank = (size: number, trues: number): Question[] =>
  Array.from({ length: size }, (_, i) => ({
    ...bank[0],
    id: `beg-${String(i + 1).padStart(3, "0")}`,
    answer: i < trues,
  }));

describe("shuffle", () => {
  it("mantém os mesmos itens e não altera a entrada", () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffle(input, (max) => max - 1);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...output].sort()).toEqual(input);
  });

  it("com j sempre 0 faz a rotação esperada do Fisher-Yates", () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });
});

describe("pickQuestions", () => {
  it("sorteia 15 perguntas sem repetição", () => {
    for (let run = 0; run < 50; run++) {
      const picked = pickQuestions(bank);
      expect(picked).toHaveLength(15);
      expect(new Set(picked.map((q) => q.id)).size).toBe(15);
    }
  });

  it("fica entre 5 e 10 respostas verdadeiras com o banco real", () => {
    for (let run = 0; run < 200; run++) {
      const trues = pickQuestions(bank).filter((q) => q.answer).length;
      expect(trues).toBeGreaterThanOrEqual(TRUE_RANGE.min);
      expect(trues).toBeLessThanOrEqual(TRUE_RANGE.max);
    }
  });

  it("re-sorteia quando a primeira tentativa sai da faixa", () => {
    // 15 V nas primeiras posições: a identidade pega só V; depois embaralha de verdade.
    const skewed = makeBank(30, 15);
    let calls = 0;
    const identityFirst = vi.fn((max: number) =>
      calls++ < 29 ? max - 1 : Math.floor(Math.random() * max),
    );
    const picked = pickQuestions(skewed, { randomInt: identityFirst });
    const trues = picked.filter((q) => q.answer).length;
    expect(calls).toBeGreaterThan(29);
    expect(trues).toBeLessThanOrEqual(TRUE_RANGE.max);
  });

  it("depois de 20 tentativas aceita um sorteio fora da faixa", () => {
    const allTrue = makeBank(30, 30);
    const randomInt = vi.fn((max: number) => max - 1);
    const picked = pickQuestions(allTrue, { randomInt });
    expect(picked).toHaveLength(15);
    expect(randomInt).toHaveBeenCalledTimes(20 * 29);
  });

  it("falha se o nível tiver menos perguntas que a partida", () => {
    expect(() => pickQuestions(makeBank(10, 5))).toThrow(/15 perguntas/);
  });
});
