import { describe, expect, it } from "vitest";
import { isLikelyPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("strips formatting from E.164 numbers", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toBe("+15551234567");
  });
  it("adds the default country code to 10-digit numbers", () => {
    expect(normalizePhone("5551234567")).toBe("+15551234567");
  });
  it("handles a leading country code without plus", () => {
    expect(normalizePhone("15551234567")).toBe("+15551234567");
  });
  it("returns empty string for empty input", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("   ")).toBe("");
  });
});

describe("isLikelyPhone", () => {
  it("accepts plausible numbers and rejects short strings", () => {
    expect(isLikelyPhone("+15551234567")).toBe(true);
    expect(isLikelyPhone("123")).toBe(false);
  });
});
