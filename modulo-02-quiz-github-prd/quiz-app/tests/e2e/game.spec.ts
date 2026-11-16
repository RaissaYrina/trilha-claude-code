import { expect, test } from "@playwright/test";
import {
  answerQuestions,
  expectNoSeriousA11yViolations,
  HAS_DB,
  newPlayer,
  trackQuestions,
} from "./helpers";

// Partida, resultado, ranking e compartilhamento precisam do Supabase.
test.skip(!HAS_DB, "Defina E2E_DB=1 com o Supabase local rodando.");

const LEVELS = [
  ["beginner", "Iniciante"],
  ["intermediate", "Intermediário"],
  ["advanced", "Avançado"],
] as const;

test.describe("partida completa", () => {
  for (const [level, name] of LEVELS) {
    test(`nível ${name}: 15 perguntas até o resultado`, async ({ browser }) => {
      const context = await newPlayer(browser);
      const page = await context.newPage();
      const tracker = trackQuestions(page);

      await page.goto(`/pt/play/${level}`);
      await expectNoSeriousA11yViolations(page);
      // Erra a 1ª de propósito para a revisão ter os dois casos.
      await answerQuestions(page, tracker, { wrong: (i) => i === 0 });
      await page.getByRole("button", { name: "Ver resultado" }).click();

      await expect(page).toHaveURL(/\/pt\/result\/[0-9a-f-]{36}$/);
      await expect(page.getByText("14 de 15")).toBeVisible();
      // 14/15 = 93%: faixa 91–100%.
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Mestre do Claude Code para Dados",
      );
      await expect(
        page.getByRole("region", { name: "Revisão das perguntas" }),
      ).toBeVisible();
      await expect(page.locator("ol > li")).toHaveCount(15);
      await expectNoSeriousA11yViolations(page);
      await context.close();
    });
  }

  test("o gabarito não aparece na rede antes da resposta", async ({
    browser,
  }) => {
    const context = await newPlayer(browser);
    const page = await context.newPage();
    const tracker = trackQuestions(page);
    await page.goto("/pt/play/beginner");
    await answerQuestions(page, tracker, { to: 3 });

    // Corpos que entregam pergunta nova: nenhuma chave de gabarito ao lado
    // dela, a não ser na resposta da pergunta anterior.
    for (const body of tracker.bodies as Record<string, unknown>[]) {
      for (const question of [body.question, body.next]) {
        if (question) {
          expect(Object.keys(question).sort()).toEqual([
            "id",
            "index",
            "statement",
          ]);
        }
      }
      if (!("correct" in body)) {
        expect(JSON.stringify(body)).not.toMatch(
          /"(answer|correctAnswer|explanation|docUrl)"/,
        );
      }
    }
    await context.close();
  });

  test("recarregar no meio retoma a mesma partida", async ({ browser }) => {
    const context = await newPlayer(browser);
    const page = await context.newPage();
    const tracker = trackQuestions(page);
    await page.goto("/pt/play/intermediate");
    await answerQuestions(page, tracker, { to: 3 });

    await page.reload();
    await expect(page.getByText("Pergunta 4 de 15")).toBeVisible();
    await answerQuestions(page, tracker, { from: 3, to: 4 });
    await context.close();
  });

  test("navegação só por teclado: setas e Enter", async ({ browser }) => {
    const context = await newPlayer(browser);
    const page = await context.newPage();
    const tracker = trackQuestions(page);
    await page.goto("/pt/play/beginner");

    const correct = await tracker.answerFor(0);
    const trueButton = page.getByRole("button", { name: "Verdadeiro" });
    const falseButton = page.getByRole("button", { name: "Falso" });
    await trueButton.focus();
    if (!correct) await page.keyboard.press("ArrowRight");
    await expect(correct ? trueButton : falseButton).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByText("Correto!")).toBeVisible();
    await context.close();
  });
});

test.describe("ranking e compartilhamento", () => {
  test("registra o apelido, destaca no ranking e gera a página pública", async ({
    browser,
  }) => {
    const context = await newPlayer(browser);
    const page = await context.newPage();
    const tracker = trackQuestions(page);
    await page.goto("/pt/play/advanced");
    await answerQuestions(page, tracker);
    await page.getByRole("button", { name: "Ver resultado" }).click();
    await expect(page).toHaveURL(/\/result\//);

    const nickname = `e2e_${Date.now().toString(36)}`;
    await page.getByLabel("Apelido").fill(nickname);
    await page.getByRole("button", { name: "Registrar" }).click();
    await expect(page.getByText(/Você está em #\d+/)).toBeVisible();

    // Recarregar não oferece o formulário de novo.
    await page.reload();
    await expect(
      page.getByText("Esta partida já está no ranking."),
    ).toBeVisible();

    // Link de compartilhamento: o mesmo que vai para o X.
    const xHref = await page
      .getByRole("link", { name: /X \(Twitter\)/ })
      .getAttribute("href");
    const shareUrl = new URL(new URL(xHref!).searchParams.get("url")!);

    await page.getByRole("link", { name: "Ver minha posição" }).click();
    await expect(page).toHaveURL(/\/pt\/ranking\?level=advanced&me=/);
    const myRow = page.locator('tr[aria-current="true"]');
    await expect(myRow).toContainText(nickname);
    await expectNoSeriousA11yViolations(page);

    // Página pública: placar sem gabarito, OG image declarada e servida.
    await page.goto(shareUrl.pathname);
    await expect(
      page.getByText(`${nickname} jogou o nível Avançado`),
    ).toBeVisible();
    await expect(page.getByText("Resposta certa")).toHaveCount(0);
    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(ogImage).toMatch(/\/api\/og\/[A-Za-z0-9_-]{10}\?locale=pt$/);
    const png = await page.request.get(
      new URL(ogImage!).pathname + "?locale=pt",
    );
    expect(png.headers()["content-type"]).toBe("image/png");
    await expectNoSeriousA11yViolations(page);
    await context.close();
  });

  test("ranking vazio ou cheio passa no axe nos dois temas", async ({
    browser,
  }) => {
    for (const colorScheme of ["light", "dark"] as const) {
      const context = await newPlayer(browser, { colorScheme });
      const page = await context.newPage();
      await page.goto("/en/ranking?level=intermediate&period=7d");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Leaderboard",
      );
      await expectNoSeriousA11yViolations(page);
      await context.close();
    }
  });
});
