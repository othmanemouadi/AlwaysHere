import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { normalizePhone } from "./phone";

/**
 * Resolve which business a forwarded call belongs to: match the dialed Twilio
 * number, falling back to the only business in the system (single-tenant dev
 * convenience so the demo works before a number is assigned).
 */
export async function findBusinessForCall(toNumber: string) {
  const to = normalizePhone(toNumber);
  const all = await db().select().from(tables.businesses);
  const match = all.find(
    (b) => b.twilioNumber && normalizePhone(b.twilioNumber) === to,
  );
  if (match) return match;
  if (all.length === 1) return all[0];
  return null;
}

export async function loadReceptionContext(businessId: number) {
  const [services, faqRows, hours] = await Promise.all([
    db()
      .select()
      .from(tables.services)
      .where(
        and(eq(tables.services.businessId, businessId), eq(tables.services.active, true)),
      ),
    db().select().from(tables.faqs).where(eq(tables.faqs.businessId, businessId)),
    db()
      .select()
      .from(tables.businessHours)
      .where(eq(tables.businessHours.businessId, businessId)),
  ]);
  return { services, faqs: faqRows, hours };
}

export async function getCallBySid(callSid: string) {
  const [call] = await db()
    .select()
    .from(tables.calls)
    .where(eq(tables.calls.twilioCallSid, callSid));
  return call ?? null;
}

export async function getTranscript(callId: number) {
  return db()
    .select()
    .from(tables.callMessages)
    .where(eq(tables.callMessages.callId, callId))
    .orderBy(asc(tables.callMessages.id));
}

export async function addCallMessage(callId: number, role: string, content: string) {
  await db().insert(tables.callMessages).values({ callId, role, content });
}

export function defaultGreeting(businessName: string): string {
  return `Hello, you've reached ${businessName}. The team can't pick up right now, but I'm their virtual assistant and I can answer questions or book you in. How can I help?`;
}
