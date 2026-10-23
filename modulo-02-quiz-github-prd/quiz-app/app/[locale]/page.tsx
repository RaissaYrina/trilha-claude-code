import { resolveLocale } from "@/i18n/locale";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await resolveLocale(params);

  return <div className="mx-auto max-w-5xl px-4 py-12" />;
}
