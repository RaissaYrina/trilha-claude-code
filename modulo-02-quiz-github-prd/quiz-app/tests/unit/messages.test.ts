import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

type Tree = { [key: string]: string | Tree };

/** Achata o JSON em pares "caminho.da.chave" → texto. */
function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === "string"
        ? [[path, value]]
        : Object.entries(flatten(value, path));
    }),
  );
}

describe("mensagens de UI", () => {
  const flatPt = flatten(pt);
  const flatEn = flatten(en);

  it("pt e en têm exatamente as mesmas chaves", () => {
    expect(Object.keys(flatEn).sort()).toEqual(Object.keys(flatPt).sort());
  });

  it("nenhuma mensagem está vazia", () => {
    const empty = [flatPt, flatEn].flatMap((flat) =>
      Object.entries(flat)
        .filter(([, text]) => text.trim() === "")
        .map(([path]) => path),
    );
    expect(empty).toEqual([]);
  });
});
