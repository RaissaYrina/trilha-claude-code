import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  type Browser,
  type Page,
  type Response,
} from "@playwright/test";
import advanced from "../../content/questions/advanced.json";
import beginner from "../../content/questions/beginner.json";
import intermediate from "../../content/questions/intermediate.json";

/** Gabarito lido do banco de perguntas, como uma pessoa que sabe tudo. */
const ANSWERS = new Map<string, boolean>(
  [...beginner, ...intermediate, ...advanced].map((q) => [q.id, q.answer]),
);

/** Os testes que dependem do Supabase só rodam com `E2E_DB=1` (o CI liga). */
export const HAS_DB = !!process.env.E2E_DB;

let ipCounter = 0;
/**
 * Contexto com um IP próprio (`X-Forwarded-For`), para o rate limit de 10
 * sessões por IP não misturar os testes.
 */
export async function newPlayer(
  browser: Browser,
  options: Parameters<Browser["newContext"]>[0] = {},
) {
  const ip = `198.18.${Math.floor(Math.random() * 250)}.${++ipCounter % 250}`;
  return browser.newContext({
    ...options,
    extraHTTPHeaders: { "x-forwarded-for": ip },
  });
}

type ServedQuestion = { index: number; id: string; statement: string };

/** Acompanha, pela rede, qual pergunta está na tela. */
export function trackQuestions(page: Page) {
  const served: ServedQuestion[] = [];
  const bodies: unknown[] = [];
  page.on("response", async (res: Response) => {
    if (
      !/\/api\/sessions(\/[^/]+(\/answer)?)?$/.test(new URL(res.url()).pathname)
    ) {
      return;
    }
    const body = (await res.json().catch(() => null)) as {
      question?: ServedQuestion;
      next?: ServedQuestion | null;
    } | null;
    if (!body) return;
    bodies.push(body);
    if (body.question) served.push(body.question);
    if (body.next) served.push(body.next);
  });
  return {
    bodies,
    /** Gabarito da pergunta `index` (1ª = 0). */
    async answerFor(index: number): Promise<boolean> {
      await expect.poll(() => served.some((q) => q.index === index)).toBe(true);
      const question = served.find((q) => q.index === index)!;
      return ANSWERS.get(question.id)!;
    },
  };
}

/**
 * Responde as perguntas `from`..`to - 1` pelo teclado (V/F), acertando todas
 * ou errando de propósito quando `wrong(index)` for verdadeiro.
 */
export async function answerQuestions(
  page: Page,
  tracker: ReturnType<typeof trackQuestions>,
  {
    from = 0,
    to = 15,
    wrong = (): boolean => false,
  }: { from?: number; to?: number; wrong?: (index: number) => boolean } = {},
) {
  for (let index = from; index < to; index++) {
    await expect(
      page.getByRole("group", { name: new RegExp(` ${index + 1} `) }),
    ).toBeVisible();
    const correct = await tracker.answerFor(index);
    const answer = wrong(index) ? !correct : correct;
    await page.keyboard.press(answer ? "v" : "f");
    const isLast = index === 14;
    const next = page.getByRole("button", {
      name: isLast
        ? /Ver resultado|See result/
        : /Próxima pergunta|Next question/,
    });
    await expect(next).toBeVisible();
    if (!isLast) await next.click();
  }
}

export async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}
