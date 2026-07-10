import "server-only";
import type OpenAI from "openai";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { bookAppointment, getOpenSlots } from "@/lib/booking";
import { resolveLanguage, supportedLanguageCodes } from "@/lib/languages";
import { normalizePhone } from "@/lib/phone";
import { formatTimeLocal, isValidDate } from "@/lib/slots";
import { sendSms } from "@/lib/sms";

/** Mutable per-turn flags the tools set and the voice route reads. */
export type TurnState = {
  endCall: boolean;
  farewell: string | null;
  language: string | null;
  escalated: boolean;
};

export function newTurnState(): TurnState {
  return { endCall: false, farewell: null, language: null, escalated: false };
}

export type ToolContext = {
  businessId: number;
  businessName: string;
  timezone: string;
  notificationPhone: string | null;
  callId: number;
  fromNumber: string;
  turnState: TurnState;
};

export const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "List open appointment times for a given business-local calendar date. Call before offering or booking any time.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Calendar date, YYYY-MM-DD" },
          service_id: { type: "number", description: "Service id from the service list" },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Book an appointment after the caller confirmed service, time, name and phone number.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string" },
          customer_phone: {
            type: "string",
            description: "Omit to use the caller-ID number of this call",
          },
          service_id: { type: "number" },
          start_local: {
            type: "string",
            description: "Business-local start time, YYYY-MM-DDTHH:mm",
          },
          notes: { type: "string" },
        },
        required: ["customer_name", "start_local"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "capture_lead",
      description:
        "Save the caller's contact details and what they need, so the business can call them back.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: {
            type: "string",
            description: "Omit to use the caller-ID number of this call",
          },
          reason: { type: "string", description: "What the caller needs" },
        },
        required: ["name", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate",
      description:
        "Alert the business owner immediately for emergencies or urgent issues you cannot resolve.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string" },
        },
        required: ["reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "switch_language",
      description: `Switch the conversation language. Supported codes: ${supportedLanguageCodes().join(", ")}.`,
      parameters: {
        type: "object",
        properties: {
          language_code: { type: "string" },
        },
        required: ["language_code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "end_call",
      description: "End the call politely once the caller is done.",
      parameters: {
        type: "object",
        properties: {
          farewell: { type: "string", description: "Short goodbye in the caller's language" },
        },
        required: ["farewell"],
      },
    },
  },
];

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export async function dispatchToolCall(
  ctx: ToolContext,
  name: string,
  rawArgs: string,
): Promise<string> {
  const args = parseArgs(rawArgs);
  try {
    switch (name) {
      case "check_availability": {
        const date = String(args.date ?? "");
        if (!isValidDate(date)) return "Error: date must be YYYY-MM-DD.";
        const serviceId = typeof args.service_id === "number" ? args.service_id : null;
        const { slots } = await getOpenSlots(ctx.businessId, ctx.timezone, date, serviceId);
        if (slots.length === 0) {
          return `No open times on ${date}. Suggest another day.`;
        }
        const times = slots.slice(0, 8).map((s) => formatTimeLocal(s, ctx.timezone));
        return `Open times on ${date}: ${times.join(", ")}${slots.length > 8 ? " (more available)" : ""}.`;
      }

      case "book_appointment": {
        const customerName = String(args.customer_name ?? "").trim();
        const startLocal = String(args.start_local ?? "");
        if (!customerName) return "Error: customer_name is required.";
        const phone = normalizePhone(String(args.customer_phone ?? "") || ctx.fromNumber);
        const result = await bookAppointment({
          businessId: ctx.businessId,
          timezone: ctx.timezone,
          businessName: ctx.businessName,
          callId: ctx.callId,
          customerName,
          customerPhone: phone,
          serviceId: typeof args.service_id === "number" ? args.service_id : null,
          startLocalIso: startLocal,
          notes: typeof args.notes === "string" ? args.notes : "",
        });
        if (!result.ok) return `Booking failed: ${result.reason}`;
        return `Booked for ${result.whenLocal}. An SMS confirmation was sent to ${phone}. Tell the caller it's confirmed.`;
      }

      case "capture_lead": {
        const leadName = String(args.name ?? "").trim();
        const reason = String(args.reason ?? "").trim();
        if (!leadName || !reason) return "Error: name and reason are required.";
        const phone = normalizePhone(String(args.phone ?? "") || ctx.fromNumber);
        await db().insert(tables.customers).values({
          businessId: ctx.businessId,
          name: leadName,
          phone,
          notes: reason,
        });
        return `Lead saved: ${leadName} (${phone}) — ${reason}. Tell the caller the team will call them back.`;
      }

      case "escalate": {
        const reason = String(args.reason ?? "urgent call").trim();
        ctx.turnState.escalated = true;
        await db()
          .update(tables.calls)
          .set({ escalated: true })
          .where(eq(tables.calls.id, ctx.callId));
        if (ctx.notificationPhone) {
          void sendSms(
            ctx.notificationPhone,
            `AlwaysHere URGENT: caller ${ctx.fromNumber} needs immediate attention — ${reason}`,
          );
        }
        return "Owner alerted by SMS. Reassure the caller and take any extra details.";
      }

      case "switch_language": {
        const lang = resolveLanguage(String(args.language_code ?? ""));
        ctx.turnState.language = lang.code;
        await db()
          .update(tables.calls)
          .set({ language: lang.code })
          .where(eq(tables.calls.id, ctx.callId));
        return `Language switched to ${lang.label}. Continue entirely in ${lang.label}.`;
      }

      case "end_call": {
        ctx.turnState.endCall = true;
        ctx.turnState.farewell = String(args.farewell ?? "").trim() || null;
        return "Call will end after your farewell.";
      }

      default:
        return `Error: unknown tool ${name}.`;
    }
  } catch (error) {
    console.error(`[ai] tool ${name} failed:`, error);
    return `Error: the ${name} action failed. Apologize and offer to take a message.`;
  }
}
