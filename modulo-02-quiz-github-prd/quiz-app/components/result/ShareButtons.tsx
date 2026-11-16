"use client";

import { Copy, ExternalLink, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { trackEvent, type ShareChannel } from "@/lib/analytics";
import { shareLinks } from "@/lib/share";

type Props = {
  url: string;
  text: string;
};

const noop = () => () => {};

/** Web Share API existe só no navegador e, em geral, só no mobile. */
function useCanShare() {
  return useSyncExternalStore(
    noop,
    () => typeof navigator.share === "function",
    () => false,
  );
}

/** Botões de compartilhamento do resultado (PRD RF07). */
export function ShareButtons({ url, text }: Props) {
  const t = useTranslations("Share");
  const tQuiz = useTranslations("Quiz");
  const canShare = useCanShare();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const links = shareLinks(url, text);

  const shared = (channel: ShareChannel) =>
    trackEvent({ name: "result_shared", props: { channel } });

  async function nativeShare() {
    try {
      await navigator.share({ text, url });
      shared("native");
    } catch {
      // A pessoa fechou a folha de compartilhamento: nada a fazer.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      shared("copy");
    } catch {
      setStatus("failed");
    }
  }

  const channels = [
    { channel: "linkedin", href: links.linkedin, label: t("linkedin") },
    { channel: "x", href: links.x, label: t("x") },
    { channel: "whatsapp", href: links.whatsapp, label: t("whatsapp") },
  ] as const;

  return (
    <section
      aria-labelledby="compartilhar"
      className="bg-card flex flex-col gap-3 rounded-lg border p-4"
    >
      <h2 id="compartilhar" className="font-mono text-base font-semibold">
        {t("sectionTitle")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <Button onClick={nativeShare} className="h-10">
            <Share2 aria-hidden />
            {t("native")}
          </Button>
        )}
        {channels.map(({ channel, href, label }) => (
          <Button key={channel} asChild variant="outline" className="h-10">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => shared(channel)}
            >
              {label}
              <ExternalLink aria-hidden />
              <span className="sr-only">{tQuiz("newTab")}</span>
            </a>
          </Button>
        ))}
        <Button variant="outline" onClick={copy} className="h-10">
          <Copy aria-hidden />
          {t("copy")}
        </Button>
      </div>
      <p aria-live="polite" className="text-sm empty:hidden">
        {status === "copied" && t("copied")}
        {status === "failed" && t("copyFailed", { url })}
      </p>
    </section>
  );
}
