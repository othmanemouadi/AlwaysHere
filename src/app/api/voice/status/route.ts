import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { generateCallSummary } from "@/lib/ai/brain";
import { formDataToParams, validateTwilioSignature } from "@/lib/twilio";
import { getCallBySid, getTranscript } from "@/lib/voice";
import { sendSms } from "@/lib/sms";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FINAL_STATUSES = new Set(["completed", "busy", "failed", "no-answer", "canceled"]);

export async function POST(request: Request) {
  const params = await formDataToParams(request);
  if (!validateTwilioSignature(request, params)) {
    return new Response("Invalid Twilio signature", { status: 403 });
  }

  try {
    const callSid = params.CallSid ?? "";
    const status = params.CallStatus ?? "";
    if (!FINAL_STATUSES.has(status)) return new Response("ok");

    const call = await getCallBySid(callSid);
    if (!call) return new Response("ok");
    // Idempotency: Twilio may retry the status callback.
    if (call.status === status && call.summary) return new Response("ok");

    const duration = Number.parseInt(params.CallDuration ?? "", 10);
    const [business] = await db()
      .select()
      .from(tables.businesses)
      .where(eq(tables.businesses.id, call.businessId));

    let summary = call.summary;
    let intent = call.intent;
    if (status === "completed" && !summary) {
      const transcript = await getTranscript(call.id);
      const generated = await generateCallSummary({
        businessName: business?.name ?? "the business",
        transcript,
      });
      summary = generated.summary;
      intent = generated.intent;
    }

    await db()
      .update(tables.calls)
      .set({
        status,
        endedAt: new Date(),
        durationSeconds: Number.isFinite(duration) ? duration : null,
        summary,
        intent,
      })
      .where(eq(tables.calls.id, call.id));

    if (status === "completed" && summary && business?.notificationPhone) {
      const header = call.escalated ? "AlwaysHere URGENT call summary" : "AlwaysHere call summary";
      void sendSms(
        business.notificationPhone,
        `${header}\nFrom: ${call.fromNumber}\n${summary}`,
      );
    }
    return new Response("ok");
  } catch (error) {
    console.error("[voice/status] failed:", error);
    // Always 200 so Twilio doesn't retry forever on our internal errors.
    return new Response("ok");
  }
}
