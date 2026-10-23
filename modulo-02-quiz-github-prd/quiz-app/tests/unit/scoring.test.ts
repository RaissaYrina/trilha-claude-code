import { describe, expect, it } from "vitest";
import { BASE_POINTS, calculateScore, classify, maxScore } from "@/lib/scoring";

const hit = (timeMs: number, streakBefore = 0) =>
  calculateScore({ level: "beginner", correct: true, timeMs, streakBefore });

describe("BASE_POINTS", () => {
  it("segue o PRD", () => {
    expect(BASE_POINTS).toEqual({
      beginner: 100,
      intermediate: 150,
      advanced: 200,
    });
  });
});

describe("calculateScore: bônus de tempo", () => {
  it("t = 0 dá o bônus máximo (metade da base)", () => {
    expect(hit(0)).toEqual({
      points: 150,
      bonus: 50,
      multiplier: 1,
      streakAfter: 1,
    });
  });

  it("t = 10s dá metade do bônus", () => {
    expect(hit(10_000).bonus).toBe(25);
    expect(hit(10_000).points).toBe(125);
  });

  it("t ≥ 20s zera o bônus", () => {
    expect(hit(20_000).bonus).toBe(0);
    expect(hit(95_000).points).toBe(100);
  });

  it("tempo negativo é tratado como zero", () => {
    expect(hit(-500)).toEqual(hit(0));
  });

  it("arredonda o bônus", () => {
    // 100 × 0,5 × (1 − 3,3/20) = 41,75
    expect(hit(3_300).bonus).toBe(42);
  });
});

describe("calculateScore: streak", () => {
  it("o multiplicador sobe 0,1 por acerto consecutivo até 1,5", () => {
    const multipliers = [0, 1, 2, 3, 4, 5, 9].map(
      (streak) => hit(20_000, streak).multiplier,
    );
    expect(multipliers).toEqual([1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.5]);
  });

  it("aplica o multiplicador sobre base + bônus", () => {
    // (100 + 50) × 1,3
    expect(hit(0, 3).points).toBe(195);
    expect(hit(0, 3).streakAfter).toBe(4);
  });

  it("arredonda o resultado (meio para cima)", () => {
    const result = calculateScore({
      level: "intermediate",
      correct: true,
      timeMs: 0,
      streakBefore: 1,
    });
    // (150 + 75) × 1,1 = 247,5
    expect(result.points).toBe(248);
  });

  it("um erro vale 0 e zera o streak", () => {
    expect(
      calculateScore({
        level: "advanced",
        correct: false,
        timeMs: 0,
        streakBefore: 7,
      }),
    ).toEqual({ points: 0, bonus: 0, multiplier: 1, streakAfter: 0 });
  });
});

describe("maxScore", () => {
  it("é a soma de 15 acertos instantâneos em sequência", () => {
    expect(maxScore("beginner")).toBe(3150);
    expect(maxScore("intermediate")).toBe(4731);
    expect(maxScore("advanced")).toBe(6300);
  });
});

describe("classify", () => {
  it.each([
    [0, "explorer"],
    [40, "explorer"],
    [41, "practitioner"],
    [70, "practitioner"],
    [71, "specialist"],
    [90, "specialist"],
    [91, "master"],
    [100, "master"],
  ] as const)("%i%% → %s", (correct, band) => {
    expect(classify(correct, 100)).toBe(band);
  });

  it("funciona com partidas de 15 perguntas", () => {
    expect(classify(6, 15)).toBe("explorer"); // 40%
    expect(classify(7, 15)).toBe("practitioner"); // 46,7%
    expect(classify(14, 15)).toBe("master"); // 93,3%
  });

  it("partida sem perguntas conta como 0%", () => {
    expect(classify(0, 0)).toBe("explorer");
  });
});
