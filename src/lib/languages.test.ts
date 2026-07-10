import { describe, expect, it } from "vitest";
import { LANGUAGES, resolveLanguage } from "./languages";

describe("resolveLanguage", () => {
  it("resolves exact codes", () => {
    expect(resolveLanguage("es").code).toBe("es");
    expect(resolveLanguage("ar").code).toBe("ar");
  });
  it("resolves locale-style codes to the base language", () => {
    expect(resolveLanguage("es-MX").code).toBe("es");
    expect(resolveLanguage("pt-BR").code).toBe("pt");
  });
  it("is case-insensitive", () => {
    expect(resolveLanguage("FR").code).toBe("fr");
  });
  it("falls back to English for unknown or missing codes", () => {
    expect(resolveLanguage("xx").code).toBe("en");
    expect(resolveLanguage(null).code).toBe("en");
    expect(resolveLanguage(undefined).code).toBe("en");
  });
  it("every language has Twilio locales and a voice", () => {
    for (const lang of Object.values(LANGUAGES)) {
      expect(lang.say).toBeTruthy();
      expect(lang.gather).toBeTruthy();
      expect(lang.voice).toMatch(/^Polly\./);
    }
  });
});
