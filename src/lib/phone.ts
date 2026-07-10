/**
 * Normalize a phone number to E.164-ish form. Not a full libphonenumber —
 * good enough for storing caller IDs (already E.164 from Twilio) and numbers
 * typed by business owners / spoken by callers.
 */
export function normalizePhone(raw: string, defaultCountryCode = "1"): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (hasPlus) return `+${digits}`;
  // US-style 10-digit numbers get the default country code.
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith(defaultCountryCode)) return `+${digits}`;
  return `+${digits}`;
}

export function isLikelyPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}
