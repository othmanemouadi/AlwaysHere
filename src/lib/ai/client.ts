import "server-only";
import OpenAI from "openai";

let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "missing" });
  }
  return _openai;
}

export function aiModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}
