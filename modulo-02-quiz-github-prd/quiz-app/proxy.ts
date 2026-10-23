import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Detecta o idioma (cookie NEXT_LOCALE ou Accept-Language) e redireciona para /pt ou /en.
export default createMiddleware(routing);

export const config = {
  // Ignora API, arquivos internos do Next e arquivos com extensão.
  matcher: "/((?!api|_next|_vercel|.*\..*).*)",
};
