import { eq, sql } from "drizzle-orm";
import { db, tables } from "@/db";
import { runAssistantTurn } from "@/lib/ai/brain";
import { resolveLanguage } from "@/lib/languages";
import {
  formDataToParams,
  twimlResponse,
  validateTwilioSignature,
  VoiceResponse,
} from "@/lib/twilio";
import {
  addCallMessage,
  getCallBySid,
  getTranscript,
  loadReceptionContext,
} from "@/lib/voice";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RESPOND_PATH = "/api/voice/respond";
const MAX_ASSISTANT_TURNS = 20;
const NO_SPEECH_MARKER = "[no speech detected]";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: Request) {
  const params = await formDataToParams(request);
  if (!validateTwilioSignature(request, params)) {
    return new Response("Invalid Twilio signature", { status: 403 });
  }

  const twiml = new VoiceResponse();
  try {
    const callSid = params.CallSid ?? "";
    const speech = (params.SpeechResult ?? "").trim();

    const call = callSid ? await getCallBySid(callSid) : null;
    if (!call) {
      twiml.say("Sorry, something went wrong with this call. Please call back.");
      twiml.hangup();
      return twimlResponse(twiml);
    }

    const [business] = await db()
      .select()
      .from(tables.businesses)
      .where(eq(tables.businesses.id, call.businessId));
    const language = resolveLanguage(call.language);
    const say = (text: string) =>
      twiml.say({ voice: language.voice as any, language: language.say as any }, text);
    const gatherAgain = (locale = language) => {
      twiml.gather({
        input: ["speech"],
        language: locale.gather as any,
        speechTimeout: "auto",
        action: RESPOND_PATH,
        method: "POST",
      });
      twiml.redirect({ method: "POST" }, RESPOND_PATH);
    };

    const transcript = await getTranscript(call.id);

    // Silence handling: reprompt once, then say goodbye.
    if (!speech) {
      const misses = transcript.filter(
        (m) => m.role === "system" && m.content === NO_SPEECH_MARKER,
      ).length;
      await addCallMessage(call.id, "system", NO_SPEECH_MARKER);
      if (misses === 0) {
        say("Sorry, I didn't catch that. Could you say that again?");
        gatherAgain();
      } else {
        say(
          "It seems the line is quiet, so I'll let you go. The team will see your number and call you back. Goodbye!",
        );
        twiml.hangup();
      }
      return twimlResponse(twiml);
    }

    await addCallMessage(call.id, "caller", speech);

    if (call.assistantTurns >= MAX_ASSISTANT_TURNS) {
      say(
        "I need to wrap up now, but everything we discussed has been passed to the team and they'll follow up. Thanks for calling. Goodbye!",
      );
      twiml.hangup();
      return twimlResponse(twiml);
    }

    const context = await loadReceptionContext(call.businessId);
    const result = await runAssistantTurn({
      business: business,
      services: context.services,
      faqs: context.faqs,
      hours: context.hours,
      callId: call.id,
      fromNumber: call.fromNumber,
      transcript: [...transcript, { role: "caller", content: speech }],
    });

    await addCallMessage(call.id, "assistant", result.say);
    await db()
      .update(tables.calls)
      .set({ assistantTurns: sql`${tables.calls.assistantTurns} + 1` })
      .where(eq(tables.calls.id, call.id));

    // A switch_language tool call takes effect on this very reply.
    const activeLanguage = resolveLanguage(result.turnState.language ?? call.language);
    twiml.say(
      { voice: activeLanguage.voice as any, language: activeLanguage.say as any },
      result.say,
    );
    if (result.turnState.endCall) {
      twiml.hangup();
    } else {
      gatherAgain(activeLanguage);
    }
    return twimlResponse(twiml);
  } catch (error) {
    console.error("[voice/respond] failed:", error);
    const fallback = new VoiceResponse();
    fallback.say(
      "Sorry, I'm having technical trouble. The team will see your call and get back to you. Goodbye.",
    );
    fallback.hangup();
    return twimlResponse(fallback);
  }
}
