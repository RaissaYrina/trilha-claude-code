// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeaderboardForm } from "@/components/result/LeaderboardForm";
import { renderWithIntl } from "./render";

// O Link do next-intl depende do roteador do Next; aqui basta um <a>.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props} />
  ),
}));

const props = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  shareId: "aB3x9KqL2m",
  level: "advanced" as const,
  submitted: false,
};

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function submit(nickname: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Apelido"), nickname);
  await user.click(screen.getByRole("button", { name: "Registrar" }));
}

afterEach(() => vi.unstubAllGlobals());

describe("LeaderboardForm", () => {
  it("valida no cliente antes de chamar a API", async () => {
    const fetchMock = mockFetch(201, {});
    renderWithIntl(<LeaderboardForm {...props} />);

    await submit("ab");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O apelido precisa ter de 3 a 20 caracteres.",
    );
    expect(screen.getByLabelText("Apelido")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registra e mostra a posição com link para o ranking destacado", async () => {
    const fetchMock = mockFetch(201, { rank: 12, shareId: props.shareId });
    renderWithIntl(<LeaderboardForm {...props} />);

    await submit("  raissa_dev ");
    expect(
      await screen.findByText("Pronto! Você está em #12 no ranking do nível."),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/sessions/${props.sessionId}/leaderboard`,
      expect.objectContaining({
        body: JSON.stringify({ nickname: "raissa_dev" }),
      }),
    );
    expect(
      screen.getByRole("link", { name: "Ver minha posição" }),
    ).toHaveAttribute("href", "/ranking?level=advanced&me=aB3x9KqL2m");
  });

  it("partida já registrada não mostra o formulário", () => {
    renderWithIntl(<LeaderboardForm {...props} submitted />);
    expect(screen.queryByLabelText("Apelido")).not.toBeInTheDocument();
    expect(
      screen.getByText("Esta partida já está no ranking."),
    ).toBeInTheDocument();
  });

  it.each([
    [409, "ALREADY_SUBMITTED", "Esta partida já está no ranking."],
    [
      429,
      "RATE_LIMITED",
      "Muitos registros seguidos. Tente de novo em alguns minutos.",
    ],
    [500, "INTERNAL_ERROR", "Não foi possível registrar. Tente novamente."],
  ])("trata %i %s", async (status, code, message) => {
    mockFetch(status, { error: { code, message: "x" } });
    renderWithIntl(<LeaderboardForm {...props} />);

    await submit("raissa_dev");
    expect(await screen.findByText(message)).toBeInTheDocument();
  });
});
