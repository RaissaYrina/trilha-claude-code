// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { renderWithIntl } from "./render";

const question = {
  index: 2,
  id: "beg-007",
  statement: "O Claude Code consegue ler um notebook Jupyter.",
};

function setup(props: Partial<Parameters<typeof QuestionCard>[0]> = {}) {
  const onAnswer = vi.fn();
  renderWithIntl(
    <QuestionCard
      question={question}
      total={15}
      onAnswer={onAnswer}
      selected={null}
      correctAnswer={null}
      disabled={false}
      {...props}
    />,
  );
  return { onAnswer, user: userEvent.setup() };
}

describe("QuestionCard", () => {
  it("mostra o enunciado e o progresso, com o foco no enunciado", () => {
    setup();
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent(question.statement);
    expect(heading).toHaveFocus();
    expect(screen.getByText("Pergunta 3 de 15")).toBeInTheDocument();
  });

  it.each([
    ["v", true],
    ["T", true],
    ["f", false],
  ])("a tecla %s responde %s", async (key, expected) => {
    const { onAnswer, user } = setup();
    await user.keyboard(key);
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it("ignora atalhos com modificadores e outras teclas", async () => {
    const { onAnswer, user } = setup();
    await user.keyboard("{Control>}f{/Control}x");
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("setas trocam o foco entre os botões e Enter confirma", async () => {
    const { onAnswer, user } = setup();
    const [yes, no] = screen.getAllByRole("button");
    yes.focus();
    await user.keyboard("{ArrowRight}");
    expect(no).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(yes).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("os botões têm pelo menos 48px de altura", () => {
    setup();
    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toMatch(/\bh-14\b/);
    }
  });

  it("depois de responder, desativa atalhos e botões e marca a escolha", async () => {
    const { onAnswer, user } = setup({
      disabled: true,
      selected: false,
      correctAnswer: true,
    });
    await user.keyboard("v");
    expect(onAnswer).not.toHaveBeenCalled();
    const falseButton = screen.getByRole("button", { name: "Falso" });
    expect(falseButton).toBeDisabled();
    expect(falseButton).toHaveAttribute("aria-pressed", "true");
  });

  it("em inglês mostra True/False", () => {
    renderWithIntl(
      <QuestionCard
        question={question}
        total={15}
        onAnswer={() => {}}
        selected={null}
        correctAnswer={null}
        disabled={false}
      />,
      "en",
    );
    expect(screen.getByRole("button", { name: "True" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "False" })).toBeInTheDocument();
  });
});
