import { afterEach, describe, expect, it, vi } from "vitest";
import { maxScore } from "@/lib/scoring";
import {
  SHARE_ID,
  sharePath,
  shareLinks,
  siteUrl,
  toShareSummary,
} from "@/lib/share";

afterEach(() => vi.unstubAllEnvs());

describe("siteUrl", () => {
  it("usa NEXT_PUBLIC_SITE_URL sem a barra final", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://quiz.exemplo.dev/");
    expect(siteUrl()).toBe("https://quiz.exemplo.dev");
  });

  it("cai para a URL do deploy da Vercel e, por fim, para localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "quiz-abc123.vercel.app");
    expect(siteUrl()).toBe("https://quiz-abc123.vercel.app");

    vi.stubEnv("VERCEL_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});

it("sharePath monta a rota pública com o locale", () => {
  expect(sharePath("en", "aB3x9KqL2m")).toBe("/en/r/aB3x9KqL2m");
});

it("SHARE_ID aceita só o formato do nanoid(10)", () => {
  expect(SHARE_ID.test("aB3x9KqL2m")).toBe(true);
  expect(SHARE_ID.test("aB3x9-_L2m")).toBe(true);
  expect(SHARE_ID.test("curto")).toBe(false);
  expect(SHARE_ID.test("aB3x9KqL2m/../x")).toBe(false);
});

describe("toShareSummary", () => {
  const row = {
    share_id: "aB3x9KqL2m",
    level: "advanced" as const,
    score: 1840,
    correct_count: 12,
    total_time_ms: 98_000,
    question_ids: Array.from({ length: 15 }, (_, i) => `adv-${i}`),
  };

  it("resume placar e faixa, sem nada das perguntas", () => {
    const summary = toShareSummary(row, "raissa_dev");
    expect(summary).toEqual({
      shareId: "aB3x9KqL2m",
      level: "advanced",
      nickname: "raissa_dev",
      score: 1840,
      maxScore: maxScore("advanced"),
      correct: 12,
      total: 15,
      totalTimeMs: 98_000,
      band: "specialist",
    });
    expect(JSON.stringify(summary)).not.toContain("adv-");
  });

  it("apelido nulo quando a partida não entrou no ranking", () => {
    expect(toShareSummary(row, null).nickname).toBeNull();
  });
});

describe("shareLinks", () => {
  const url = "https://quiz.dev/pt/r/aB3x9KqL2m";
  const text = "Fiz 1.840 pontos & mais!";
  const links = shareLinks(url, text);

  it("LinkedIn recebe só a URL", () => {
    expect(new URL(links.linkedin).searchParams.get("url")).toBe(url);
  });

  it("X recebe texto e URL separados", () => {
    const params = new URL(links.x).searchParams;
    expect(params.get("text")).toBe(text);
    expect(params.get("url")).toBe(url);
  });

  it("WhatsApp recebe texto e URL juntos", () => {
    expect(new URL(links.whatsapp).searchParams.get("text")).toBe(
      `${text} ${url}`,
    );
  });
});
