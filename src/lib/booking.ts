import "server-only";
import { and, eq, gte, lt } from "drizzle-orm";
import { db, tables } from "@/db";
import { createCalendarEvent } from "./calendar";
import { normalizePhone } from "./phone";
import {
  computeOpenSlots,
  findConflict,
  formatSlotLocal,
  parseLocalDateTime,
} from "./slots";
import { sendSms } from "./sms";

const DEFAULT_DURATION_MINUTES = 30;

export async function getOpenSlots(
  businessId: number,
  timezone: string,
  date: string,
  serviceId?: number | null,
): Promise<{ slots: Date[]; durationMinutes: number }> {
  const hours = await db()
    .select()
    .from(tables.businessHours)
    .where(eq(tables.businessHours.businessId, businessId));

  let durationMinutes = DEFAULT_DURATION_MINUTES;
  if (serviceId) {
    const [service] = await db()
      .select()
      .from(tables.services)
      .where(
        and(eq(tables.services.id, serviceId), eq(tables.services.businessId, businessId)),
      );
    if (service) durationMinutes = service.durationMinutes;
  }

  const dayStart = new Date(`${date}T00:00:00Z`);
  const windowStart = new Date(dayStart.getTime() - 24 * 60 * 60_000);
  const windowEnd = new Date(dayStart.getTime() + 48 * 60 * 60_000);
  const booked = await db()
    .select({
      startsAt: tables.appointments.startsAt,
      endsAt: tables.appointments.endsAt,
    })
    .from(tables.appointments)
    .where(
      and(
        eq(tables.appointments.businessId, businessId),
        eq(tables.appointments.status, "confirmed"),
        gte(tables.appointments.startsAt, windowStart),
        lt(tables.appointments.startsAt, windowEnd),
      ),
    );

  const slots = computeOpenSlots({
    date,
    timezone,
    hours,
    booked,
    durationMinutes,
  });
  return { slots, durationMinutes };
}

export type BookingRequest = {
  businessId: number;
  timezone: string;
  businessName: string;
  callId?: number | null;
  customerName: string;
  customerPhone: string;
  serviceId?: number | null;
  /** Business-local "YYYY-MM-DDTHH:mm" */
  startLocalIso: string;
  notes?: string;
};

export type BookingResult =
  | { ok: true; appointmentId: number; whenLocal: string }
  | { ok: false; reason: string };

export async function bookAppointment(request: BookingRequest): Promise<BookingResult> {
  const startsAt = parseLocalDateTime(request.startLocalIso, request.timezone);
  if (!startsAt) {
    return { ok: false, reason: "Invalid date/time. Use YYYY-MM-DDTHH:mm." };
  }
  if (startsAt.getTime() < Date.now()) {
    return { ok: false, reason: "That time is in the past." };
  }

  let serviceName = "Appointment";
  let durationMinutes = DEFAULT_DURATION_MINUTES;
  if (request.serviceId) {
    const [service] = await db()
      .select()
      .from(tables.services)
      .where(
        and(
          eq(tables.services.id, request.serviceId),
          eq(tables.services.businessId, request.businessId),
        ),
      );
    if (!service) return { ok: false, reason: "Unknown service." };
    serviceName = service.name;
    durationMinutes = service.durationMinutes;
  }
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  // Requested time must be one of the open slots (inside hours, no conflicts).
  const date = request.startLocalIso.slice(0, 10);
  const { slots } = await getOpenSlots(
    request.businessId,
    request.timezone,
    date,
    request.serviceId,
  );
  const matchesSlot = slots.some((slot) => slot.getTime() === startsAt.getTime());
  if (!matchesSlot) {
    // Distinguish "outside hours" from "taken" for a better spoken reply.
    const booked = await db()
      .select({
        startsAt: tables.appointments.startsAt,
        endsAt: tables.appointments.endsAt,
      })
      .from(tables.appointments)
      .where(
        and(
          eq(tables.appointments.businessId, request.businessId),
          eq(tables.appointments.status, "confirmed"),
        ),
      );
    if (findConflict(startsAt, endsAt, booked)) {
      return { ok: false, reason: "That time is already booked. Offer another open slot." };
    }
    return {
      ok: false,
      reason:
        "That time is outside opening hours or not available. Check availability first and offer an open slot.",
    };
  }

  const phone = normalizePhone(request.customerPhone);
  const [customer] = await db()
    .insert(tables.customers)
    .values({
      businessId: request.businessId,
      name: request.customerName,
      phone,
      notes: request.notes ?? "",
    })
    .returning();

  const whenLocal = formatSlotLocal(startsAt, request.timezone);
  const [appointment] = await db()
    .insert(tables.appointments)
    .values({
      businessId: request.businessId,
      customerId: customer.id,
      serviceId: request.serviceId ?? null,
      callId: request.callId ?? null,
      customerName: request.customerName,
      customerPhone: phone,
      startsAt,
      endsAt,
      status: "confirmed",
      notes: request.notes ?? "",
    })
    .returning();

  // SMS confirmation + optional calendar sync happen best-effort in the
  // background; the caller hears the confirmation either way.
  void sendSms(
    phone,
    `${request.businessName}: your ${serviceName} is confirmed for ${whenLocal}. Reply or call us to reschedule.`,
  );
  void createCalendarEvent({
    summary: `${serviceName} — ${request.customerName}`,
    description: `Booked by the AlwaysHere AI receptionist.\nCustomer: ${request.customerName} (${phone})\nNotes: ${request.notes ?? ""}`,
    startISO: startsAt.toISOString(),
    endISO: endsAt.toISOString(),
    timezone: request.timezone,
  }).then(async (eventId) => {
    if (eventId) {
      await db()
        .update(tables.appointments)
        .set({ calendarEventId: eventId })
        .where(eq(tables.appointments.id, appointment.id));
    }
  });

  return { ok: true, appointmentId: appointment.id, whenLocal };
}
