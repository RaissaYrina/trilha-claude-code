import { ImageResponse } from "next/og";
import { createFormatter, createTranslator } from "next-intl";
import { routing } from "@/i18n/routing";
import { jsonError, withErrors } from "@/lib/api";
import { getShareSummary } from "@/lib/share-summary";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

export const runtime = "nodejs";

const MESSAGES = { pt, en };

// Paleta fixa no tema escuro do terminal: a imagem não segue o tema de quem vê.
const COLORS = {
  bg: "#171412",
  window: "#221e1b",
  border: "#3a332d",
  text: "#f4efe9",
  muted: "#a39a91",
  accent: "#d97757",
  dots: ["#e5534b", "#e0a33b", "#57ab5a"],
};

/** OG image 1200×630 do resultado (PRD RF07). Não mostra nenhuma pergunta. */
export const GET = withErrors(
  async (req: Request, ctx: RouteContext<"/api/og/[shareId]">) => {
    const { shareId } = await ctx.params;
    const summary = await getShareSummary(shareId);
    if (!summary) {
      return jsonError("SESSION_NOT_FOUND", "Resultado não encontrado.", 404);
    }

    const requested = new URL(req.url).searchParams.get("locale");
    const locale =
      routing.locales.find((l) => l === requested) ?? routing.defaultLocale;
    // Fora da árvore de páginas: monta o tradutor direto com as mensagens.
    const t = createTranslator({ locale, messages: MESSAGES[locale] });
    const format = createFormatter({ locale });
    const name = summary.nickname ?? t("Share.anonymous");

    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 56,
          backgroundColor: COLORS.bg,
          color: COLORS.text,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            backgroundColor: COLORS.window,
            border: `2px solid ${COLORS.border}`,
            borderRadius: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "20px 28px",
              borderBottom: `2px solid ${COLORS.border}`,
            }}
          >
            {COLORS.dots.map((color) => (
              <div
                key={color}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: color,
                }}
              />
            ))}
            <div style={{ marginLeft: 16, fontSize: 24, color: COLORS.muted }}>
              cc-quiz_data
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "36px 48px 44px",
            }}
          >
            <div style={{ fontSize: 30, color: COLORS.muted }}>
              {t("Home.eyebrow")}
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 44 }}>
                {t("Share.heading", {
                  name,
                  level: t(`Play.levels.${summary.level}.name`),
                })}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 20,
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 132,
                    color: COLORS.accent,
                    lineHeight: 1,
                  }}
                >
                  {format.number(summary.score)}
                </div>
                <div style={{ fontSize: 36, color: COLORS.muted }}>
                  {`${t("Share.points")} · ${t("Result.correctOf", {
                    correct: summary.correct,
                    total: summary.total,
                  })} ${t("Share.correct")}`}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", fontSize: 36 }}>
              <span style={{ color: COLORS.accent }}>&gt;&nbsp;</span>
              {t(`Result.bands.${summary.band}.name`)}
            </div>
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        headers: {
          // O apelido pode surgir depois (registro no ranking): cache curto.
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      },
    );
  },
);
