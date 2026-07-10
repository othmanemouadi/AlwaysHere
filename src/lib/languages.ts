/**
 * Languages the receptionist can speak. `say` is the Twilio <Say> language,
 * `gather` is the Twilio speech-recognition locale, `voice` is an Amazon Polly
 * neural voice available through Twilio for natural-sounding TTS.
 */
export type LanguageDef = {
  code: string;
  label: string;
  say: string;
  gather: string;
  voice: string;
};

export const LANGUAGES: Record<string, LanguageDef> = {
  en: { code: "en", label: "English", say: "en-US", gather: "en-US", voice: "Polly.Joanna-Neural" },
  es: { code: "es", label: "Spanish", say: "es-US", gather: "es-US", voice: "Polly.Lupe-Neural" },
  fr: { code: "fr", label: "French", say: "fr-FR", gather: "fr-FR", voice: "Polly.Lea-Neural" },
  de: { code: "de", label: "German", say: "de-DE", gather: "de-DE", voice: "Polly.Vicki-Neural" },
  pt: { code: "pt", label: "Portuguese", say: "pt-BR", gather: "pt-BR", voice: "Polly.Camila-Neural" },
  it: { code: "it", label: "Italian", say: "it-IT", gather: "it-IT", voice: "Polly.Bianca-Neural" },
  zh: { code: "zh", label: "Mandarin", say: "cmn-CN", gather: "cmn-Hans-CN", voice: "Polly.Zhiyu-Neural" },
  ar: { code: "ar", label: "Arabic", say: "arb", gather: "ar-SA", voice: "Polly.Hala-Neural" },
  hi: { code: "hi", label: "Hindi", say: "hi-IN", gather: "hi-IN", voice: "Polly.Kajal-Neural" },
};

export const DEFAULT_LANGUAGE = "en";

/** Resolve a language code (or anything close to one) to a supported definition. */
export function resolveLanguage(code: string | null | undefined): LanguageDef {
  if (!code) return LANGUAGES[DEFAULT_LANGUAGE];
  const normalized = code.trim().toLowerCase().slice(0, 2);
  return LANGUAGES[normalized] ?? LANGUAGES[DEFAULT_LANGUAGE];
}

export function supportedLanguageCodes(): string[] {
  return Object.keys(LANGUAGES);
}
