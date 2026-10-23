// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readBestScore, saveBestScore } from "@/lib/best-score";

describe("melhor pontuação local", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("retorna null quando não há registro", () => {
    expect(readBestScore("beginner")).toBeNull();
  });

  it("grava a primeira pontuação e só substitui por uma maior", () => {
    expect(saveBestScore("beginner", 1200)).toBe(true);
    expect(saveBestScore("beginner", 900)).toBe(false);
    expect(saveBestScore("beginner", 1200)).toBe(false);
    expect(saveBestScore("beginner", 1500)).toBe(true);
    expect(readBestScore("beginner")).toBe(1500);
  });

  it("separa os níveis", () => {
    saveBestScore("advanced", 3000);
    expect(readBestScore("intermediate")).toBeNull();
  });

  it("ignora valores corrompidos", () => {
    window.localStorage.setItem("ccquiz:best:beginner", "abc");
    expect(readBestScore("beginner")).toBeNull();
  });

  it("não quebra quando o storage está bloqueado", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(readBestScore("beginner")).toBeNull();
    expect(saveBestScore("beginner", 100)).toBe(false);
  });
});
