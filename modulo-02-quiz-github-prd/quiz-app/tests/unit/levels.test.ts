import { describe, expect, it } from "vitest";
import { isLevel, LEVELS } from "@/lib/levels";

describe("isLevel", () => {
  it("aceita os três níveis", () => {
    for (const level of LEVELS) expect(isLevel(level)).toBe(true);
  });

  it("rejeita valores desconhecidos", () => {
    expect(isLevel("expert")).toBe(false);
    expect(isLevel("")).toBe(false);
  });
});
