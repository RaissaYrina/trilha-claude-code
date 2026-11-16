// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareButtons } from "@/components/result/ShareButtons";
import { renderWithIntl } from "./render";

const trackEvent = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ trackEvent }));

const url = "https://quiz.dev/pt/r/aB3x9KqL2m";
const text = "Fiz 1.840 pontos no nível Avançado!";

afterEach(() => {
  trackEvent.mockReset();
  Reflect.deleteProperty(navigator, "share");
});

describe("ShareButtons", () => {
  it("links das redes abrem em nova aba e contam o canal", async () => {
    renderWithIntl(<ShareButtons url={url} text={text} />);
    const x = screen.getByRole("link", { name: /X \(Twitter\)/ });
    expect(x).toHaveAttribute("target", "_blank");
    expect(new URL(x.getAttribute("href")!).searchParams.get("url")).toBe(url);

    x.addEventListener("click", (e) => e.preventDefault());
    await userEvent.setup().click(x);
    expect(trackEvent).toHaveBeenCalledWith({
      name: "result_shared",
      props: { channel: "x" },
    });
  });

  it("copia o link e avisa", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ShareButtons url={url} text={text} />);
    await user.click(screen.getByRole("button", { name: "Copiar link" }));

    expect(await navigator.clipboard.readText()).toBe(url);
    expect(screen.getByText("Link copiado!")).toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledWith({
      name: "result_shared",
      props: { channel: "copy" },
    });
  });

  it("sem Web Share API, não mostra o botão nativo", () => {
    renderWithIntl(<ShareButtons url={url} text={text} />);
    expect(
      screen.queryByRole("button", { name: "Compartilhar…" }),
    ).not.toBeInTheDocument();
  });

  it("com Web Share API, usa a folha nativa do sistema", async () => {
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, "share", {
      value: share,
      configurable: true,
    });
    renderWithIntl(<ShareButtons url={url} text={text} />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Compartilhar…" }));
    expect(share).toHaveBeenCalledWith({ text, url });
    expect(trackEvent).toHaveBeenCalledWith({
      name: "result_shared",
      props: { channel: "native" },
    });
  });
});
