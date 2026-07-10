import "server-only";
import twilio from "twilio";

let _client: ReturnType<typeof twilio> | null = null;

export function twilioConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

export function getTwilioClient() {
  if (!twilioConfigured()) return null;
  if (!_client) {
    _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

export const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * Validate the X-Twilio-Signature header of an incoming webhook.
 * Only enforced when both TWILIO_AUTH_TOKEN and PUBLIC_BASE_URL are configured,
 * so local development without a tunnel keeps working.
 */
export function validateTwilioSignature(
  request: Request,
  params: Record<string, string>,
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const baseUrl = process.env.PUBLIC_BASE_URL;
  if (!authToken || !baseUrl) return true;
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return false;
  const path = new URL(request.url).pathname;
  const url = new URL(path, baseUrl).toString();
  return twilio.validateRequest(authToken, signature, url, params);
}

export function twimlResponse(twiml: { toString(): string }): Response {
  return new Response(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function formDataToParams(request: Request): Promise<Record<string, string>> {
  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }
  return params;
}
