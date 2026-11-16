// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track }));

const { trackEvent, trackOnce } = await import("@/lib/analytics");

beforeEach(() => {
  track.mockReset();
  sessionStorage.clear();
});

describe("trackEvent", () => {
  it("repassa nome e propriedades para o Vercel Analytics", () => {
    trackEvent({
      name: "quiz_started",
      props: { level: "beginner", locale: "pt" },
    });
    expect(track).toHaveBeenCalledWith("quiz_started", {
      level: "beginner",
      locale: "pt",
    });
  });

  it("engole erros do analytics", () => {
    track.mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(() =>
      trackEvent({ name: "result_shared", props: { channel: "copy" } }),
    ).not.toThrow();
  });
});

describe("trackOnce", () => {
  const event = {
    name: "quiz_completed",
    props: { level: "advanced", score: 1840, correct: 12 },
  } as const;

  it("dispara uma vez por chave", () => {
    trackOnce("s1", event);
    trackOnce("s1", event);
    trackOnce("s2", event);
    expect(track).toHaveBeenCalledTimes(2);
  });

  it("sem storage, dispara mesmo assim", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    trackOnce("s1", event);
    expect(track).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
