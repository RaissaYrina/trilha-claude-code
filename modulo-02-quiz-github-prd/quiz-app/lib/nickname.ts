/** Regras do apelido do ranking (PRD RF06). Roda no cliente e no servidor. */

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;

const ALLOWED = /^[A-Za-z0-9_\-. ]+$/;
const SEPARATORS = /[_\-. ]+/;

/** Barrados mesmo dentro de outra palavra ("fuckyou", "xporrax"). */
const BLOCKED_ANYWHERE = [
  // pt
  "arrombad",
  "buceta",
  "cacete",
  "caralho",
  "cuzao",
  "fodase",
  "merda",
  "piroca",
  "porra",
  "punheta",
  "vagabund",
  "xoxota",
  // en
  "asshole",
  "bitch",
  "cunt",
  "fuck",
  "faggot",
  "motherf",
  "nigga",
  "nigger",
  "shit",
  "whore",
];

/**
 * Barrados só como palavra inteira, porque aparecem dentro de palavras comuns
 * ("disputa", "computador", "peacock", "cursor").
 */
const BLOCKED_WORDS = [
  // pt
  "bosta",
  "cu",
  "fdp",
  "foda",
  "krl",
  "otario",
  "pau",
  "pqp",
  "puta",
  "puto",
  "viado",
  "vsf",
  // en
  "ass",
  "cock",
  "dick",
  "fag",
  "pussy",
  "retard",
  "slut",
  "stfu",
  "wtf",
];

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
};

function unleet(text: string): string {
  return text.toLowerCase().replace(/[0-9]/g, (d) => LEET[d] ?? d);
}

export function isProfane(nickname: string): boolean {
  const words = nickname.split(SEPARATORS).filter(Boolean).map(unleet);
  // "p.u.t.a" e "fu_ck": junta tudo para pegar palavras quebradas por separadores.
  const compact = words.join("");
  return (
    BLOCKED_ANYWHERE.some((w) => compact.includes(w)) ||
    [...words, compact].some((w) => BLOCKED_WORDS.includes(w))
  );
}

export type NicknameError = "length" | "chars" | "profanity";

export type NicknameResult =
  { ok: true; nickname: string } | { ok: false; error: NicknameError };

/** Apara os espaços e valida tamanho, caracteres e palavrões. */
export function validateNickname(raw: string): NicknameResult {
  const nickname = raw.trim().replace(/ {2,}/g, " ");
  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return { ok: false, error: "length" };
  }
  if (!ALLOWED.test(nickname)) return { ok: false, error: "chars" };
  if (isProfane(nickname)) return { ok: false, error: "profanity" };
  return { ok: true, nickname };
}
