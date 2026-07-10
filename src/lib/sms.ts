import "server-only";
import { getTwilioClient } from "./twilio";

/**
 * Send an SMS. Fire-and-forget by design: SMS failures are logged and must
 * never break a live call, so callers don't need to await or handle errors.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_NUMBER;
  if (!client || !from) {
    console.warn(`[sms] Twilio not configured; would have sent to ${to}: ${body}`);
    return false;
  }
  try {
    await client.messages.create({ to, from, body });
    return true;
  } catch (error) {
    console.error(`[sms] failed to send to ${to}:`, error);
    return false;
  }
}
