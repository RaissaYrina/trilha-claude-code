import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("fundação", () => {
  test("redireciona / conforme o Accept-Language", async ({ browser }) => {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await context.close();
  });

  test("troca de idioma pelo header", async ({ page }) => {
    await page.goto("/pt");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await page.getByRole("link", { name: "Mudar idioma para inglês" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("segue o tema do sistema e alterna manualmente", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("/pt");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page
      .getByRole("button", { name: "Alternar tema claro/escuro" })
      .click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    // A escolha manual persiste depois de recarregar.
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await context.close();
  });

  test("home leva à escolha de nível", async ({ page }) => {
    await page.goto("/pt");
    await page.getByRole("link", { name: "Começar" }).click();
    await expect(page).toHaveURL(/\/pt\/play$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Escolha o nível",
    );
    await expect(
      page.getByRole("link", { name: /^Jogar o nível/ }),
    ).toHaveCount(3);
  });

  for (const path of ["/pt", "/en", "/pt/play", "/en/play"]) {
    for (const scheme of ["light", "dark"] as const) {
      test(`sem violações sérias de acessibilidade em ${path} (${scheme})`, async ({
        browser,
      }) => {
        const context = await browser.newContext({ colorScheme: scheme });
        const page = await context.newPage();
        await page.goto(path);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const serious = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
        await context.close();
      });
    }
  }
});
