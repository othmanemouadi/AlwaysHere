import { db, tables } from "@/db";
import { resolveLanguage } from "@/lib/languages";
import {
  formDataToParams,
  twimlResponse,
  validateTwilioSignature,
  VoiceResponse,
} from "@/lib/twilio";
import { addCallMessage, defaultGreeting, findBusinessForCall } from "@/lib/voice";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const RESPOND_PATH = "/api/voice/respond";

export async function POST(request: Request) {
  const params = await formDataToParams(request);
  if (!validateTwilioSignature(request, params)) {
    return new Response("Invalid Twilio signature", { status: 403 });
  }

  const twiml = new VoiceResponse();
  try {
    const callSid = params.CallSid ?? "";
    const from = params.From ?? "unknown";
    const to = params.To ?? "";

    const business = await findBusinessForCall(to);
    if (!callSid || !business) {
      twiml.say(
        "Sorry, this number isn't set up yet. Please try again later.",
      );
      twiml.hangup();
      return twimlResponse(twiml);
    }

    const language = resolveLanguage(business.defaultLanguage);
    // Twilio may retry webhooks — keep the call row idempotent on CallSid.
    const inserted = await db()
      .insert(tables.calls)
      .values({
        businessId: business.id,
        twilioCallSid: callSid,
        fromNumber: from,
        language: language.code,
        status: "in-progress",
      })
      .onConflictDoNothing({ target: tables.calls.twilioCallSid })
      .returning();
    const call =
      inserted[0] ??
      (
        await db()
          .select()
          .from(tables.calls)
          .where(eq(tables.calls.twilioCallSid, callSid))
      )[0];

    const greeting = business.greeting?.trim() || defaultGreeting(business.name);
    if (inserted[0]) {
      await addCallMessage(call.id, "assistant", greeting);
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    twiml.say({ voice: language.voice as any, language: language.say as any }, greeting);
    const gather = twiml.gather({
      input: ["speech"],
      language: language.gather as any,
      speechTimeout: "auto",
      action: RESPOND_PATH,
      method: "POST",
    });
    void gather;
    // If the caller says nothing, fall through to the respond handler so it
    // can reprompt once and then wrap up gracefully.
    twiml.redirect({ method: "POST" }, RESPOND_PATH);
    return twimlResponse(twiml);
  } catch (error) {
    console.error("[voice/incoming] failed:", error);
    const fallback = new VoiceResponse();
    fallback.say(
      "Sorry, we're having technical trouble. Please try calling again shortly.",
    );
    fallback.hangup();
    return twimlResponse(fallback);
  }
}
