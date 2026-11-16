import { expect, test } from "@playwright/test";

test.describe("SEO e segurança", () => {
  test("headers de segurança em todas as páginas", async ({ request }) => {
    for (const path of ["/pt", "/en/play"]) {
      const res = await request.get(path);
      const headers = res.headers();
      expect(headers["content-security-policy"]).toContain(
        "frame-ancestors 'none'",
      );
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(headers["x-powered-by"]).toBeUndefined();
    }
  });

  test("a CSP não bloqueia nada na home", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (msg) => {
      if (/Content Security Policy/i.test(msg.text())) {
        violations.push(msg.text());
      }
    });
    await page.goto("/pt");
    await page
      .getByRole("button", { name: "Alternar tema claro/escuro" })
      .click();
    expect(violations).toEqual([]);
  });

  test("hreflang, canonical e OG por locale", async ({ page }) => {
    await page.goto("/en/play");
    const href = (selector: string) =>
      page.locator(selector).getAttribute("href");

    expect(await href('link[rel="canonical"]')).toMatch(/\/en\/play$/);
    expect(await href('link[hreflang="pt-BR"]')).toMatch(/\/pt\/play$/);
    expect(await href('link[hreflang="en"]')).toMatch(/\/en\/play$/);
    expect(await href('link[hreflang="x-default"]')).toMatch(/\/pt\/play$/);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      "en_US",
    );
  });

  test("sitemap e robots", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/pt", "/en/play", "/pt/ranking"]) {
      expect(sitemap).toContain(`${path}</loc>`);
    }
    expect(sitemap).not.toContain("/result/");

    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });
});
