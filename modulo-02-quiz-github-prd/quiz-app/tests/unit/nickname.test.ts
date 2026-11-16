import { describe, expect, it } from "vitest";
import { isProfane, validateNickname } from "@/lib/nickname";

describe("validateNickname", () => {
  it.each(["raissa_dev", "Ana Dados", "dbt.fan-42", "abc", "a".repeat(20)])(
    "aceita %j",
    (nickname) => {
      expect(validateNickname(nickname)).toEqual({ ok: true, nickname });
    },
  );

  it("apara e junta espaços repetidos antes de validar", () => {
    expect(validateNickname("  ana   dados  ")).toEqual({
      ok: true,
      nickname: "ana dados",
    });
  });

  it.each([
    ["ab", "length"],
    ["   ab   ", "length"],
    ["a".repeat(21), "length"],
    ["raissa!", "chars"],
    ["joão", "chars"],
    ["<script>", "chars"],
  ])("recusa %j (%s)", (nickname, error) => {
    expect(validateNickname(nickname)).toEqual({ ok: false, error });
  });

  it("recusa palavrão", () => {
    expect(validateNickname("fuck_sql")).toEqual({
      ok: false,
      error: "profanity",
    });
  });
});

describe("isProfane", () => {
  it.each([
    "PORRA",
    "caralho123",
    "xfuckx",
    "p.u.t.a",
    "f_u_c_k",
    "sh1t_dev",
    "puta dev",
    "cu",
    "wtf",
  ])("barra %j", (nickname) => {
    expect(isProfane(nickname)).toBe(true);
  });

  it.each([
    "disputa",
    "computador",
    "cursor_fan",
    "peacock",
    "paulista",
    "Assis",
    "class_dev",
    "raissa_dev",
  ])("não barra %j", (nickname) => {
    expect(isProfane(nickname)).toBe(false);
  });
});
