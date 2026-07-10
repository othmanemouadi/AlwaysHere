import { describe, expect, it } from "vitest";
import { buildSystemPrompt, formatHoursLines } from "./prompt";

const business = {
  name: "Riverside Dental",
  industry: "Dental clinic",
  description: "Family dental clinic on River Street.",
  timezone: "America/New_York",
  defaultLanguage: "en",
};

describe("formatHoursLines", () => {
  it("orders days and marks closed ones", () => {
    const lines = formatHoursLines([
      { dayOfWeek: 1, openTime: "09:00", closeTime: "17:00", closed: false },
      { dayOfWeek: 0, openTime: "09:00", closeTime: "17:00", closed: true },
    ]);
    expect(lines.split("\n")[0]).toBe("Sunday: closed");
    expect(lines).toContain("Monday: 09:00–17:00");
  });
  it("handles missing hours", () => {
    expect(formatHoursLines([])).toBe("Hours not provided.");
  });
});

describe("buildSystemPrompt", () => {
  const prompt = buildSystemPrompt({
    business,
    services: [
      { id: 7, name: "Teeth whitening", price: "$300", durationMinutes: 60 },
    ],
    faqs: [{ question: "Is there parking?", answer: "Yes, behind the building." }],
    hours: [{ dayOfWeek: 1, openTime: "09:00", closeTime: "17:00", closed: false }],
    now: new Date("2024-01-01T14:00:00Z"),
  });

  it("includes the business identity and knowledge base", () => {
    expect(prompt).toContain("Riverside Dental");
    expect(prompt).toContain("id 7: Teeth whitening — 60 min, $300");
    expect(prompt).toContain("Is there parking?");
    expect(prompt).toContain("Monday: 09:00–17:00");
  });

  it("pins the current local time in the business timezone", () => {
    // 14:00 UTC on Jan 1 = 09:00 in New York
    expect(prompt).toContain("2024-01-01 09:00");
  });

  it("instructs the default language and voice-call behavior", () => {
    expect(prompt).toContain("Speak English by default");
    expect(prompt).toContain("live VOICE call");
  });

  it("tells the model not to invent when the knowledge base is empty", () => {
    const empty = buildSystemPrompt({
      business,
      services: [],
      faqs: [],
      hours: [],
    });
    expect(empty).toContain("No service list provided");
    expect(empty).toContain("No FAQs provided.");
  });
});
