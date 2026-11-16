// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Feedback } from "@/components/quiz/Feedback";
import type { AnswerResponse } from "@/lib/session";
import { renderWithIntl } from "./render";

const base: AnswerResponse = {
  correct: true,
  correctAnswer: true,
  explanation: "O CLAUDE.md é lido no início de cada sessão.",
  docUrl: "https://code.claude.com/docs/en/memory",
  points: 135,
  bonus: 35,
  score: 135,
  streak: 1,
  timeMs: 6000,
  next: { index: 1, id: "beg-002", statement: "..." },
  completed: false,
};

describe("Feedback", () => {
  it("a região aria-live existe antes de haver resultado", () => {
    const { container } = renderWithIntl(
      <Feedback result={null} onNext={() => {}} />,
    );
    const region = container.querySelector('[aria-live="polite"]');
    expect(region).toBeInTheDocument();
    expect(region).toBeEmptyDOMElement();
  });

  it("acerto: texto, ícone, pontos, explicação e link da doc", () => {
    const { container } = renderWithIntl(
      <Feedback result={base} onNext={() => {}} />,
    );
    const region = container.querySelector('[aria-live="polite"]')!;
    expect(region).toHaveTextContent("Correto!");
    expect(region.querySelector("svg.lucide-circle-check")).not.toBeNull();
    expect(region).toHaveTextContent("+135 pontos");
    expect(region).toHaveTextContent("inclui 35 de bônus de tempo");
    expect(region).toHaveTextContent("A afirmação é verdadeira.");
    expect(region).toHaveTextContent(base.explanation);

    const link = screen.getByRole("link", { name: /Ler na documentação/ });
    expect(link).toHaveAttribute("href", base.docUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("erro: texto e ícone próprios, sem pontos", () => {
    const { container } = renderWithIntl(
      <Feedback
        result={{
          ...base,
          correct: false,
          correctAnswer: false,
          points: 0,
          bonus: 0,
        }}
        onNext={() => {}}
      />,
    );
    const region = container.querySelector('[aria-live="polite"]')!;
    expect(region).toHaveTextContent("Incorreto");
    expect(region).toHaveTextContent("A afirmação é falsa.");
    expect(region.querySelector("svg.lucide-circle-x")).not.toBeNull();
    expect(region).not.toHaveTextContent("pontos");
  });

  it("o botão de avançar recebe o foco e chama onNext", async () => {
    const onNext = vi.fn();
    renderWithIntl(<Feedback result={base} onNext={onNext} />);
    const button = screen.getByRole("button", { name: "Próxima pergunta" });
    expect(button).toHaveFocus();
    await userEvent.setup().keyboard("{Enter}");
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("na última pergunta o botão leva ao resultado", () => {
    renderWithIntl(
      <Feedback
        result={{ ...base, completed: true, next: null }}
        onNext={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Ver resultado" }),
    ).toBeInTheDocument();
  });
});
