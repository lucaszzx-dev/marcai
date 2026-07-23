import { describe, expect, it } from "vitest";
import { calculateEnd, parsePrice } from "./formatters";

describe("parsePrice", () => {
  it("converte preço brasileiro", () => {
    expect(parsePrice("1.250,90")).toBe(1250.9);
  });

  it("recusa texto inválido", () => {
    expect(parsePrice("sessenta")).toBeNaN();
  });
});

describe("calculateEnd", () => {
  it("soma a duração do serviço ao início", () => {
    const end = calculateEnd("2026-07-25T14:00:00.000Z", 45);
    expect(end.toISOString()).toBe("2026-07-25T14:45:00.000Z");
  });
});
