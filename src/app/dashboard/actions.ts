"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, tables } from "@/db";
import { requireSession } from "@/lib/auth";
import { resolveLanguage } from "@/lib/languages";
import { normalizePhone } from "@/lib/phone";
import { isValidTime } from "@/lib/slots";

function revalidateDashboard() {
  revalidatePath("/dashboard", "layout");
}

const businessSchema = z.object({
  name: z.string().trim().min(1).max(160),
  industry: z.string().trim().max(80),
  description: z.string().trim().max(4000),
  phone: z.string().trim().max(32),
  twilioNumber: z.string().trim().max(32),
  notificationPhone: z.string().trim().max(32),
  defaultLanguage: z.string().trim().max(8),
  timezone: z.string().trim().min(1).max(64),
  greeting: z.string().trim().max(1000),
});

export async function updateBusiness(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry") ?? "",
    description: formData.get("description") ?? "",
    phone: formData.get("phone") ?? "",
    twilioNumber: formData.get("twilioNumber") ?? "",
    notificationPhone: formData.get("notificationPhone") ?? "",
    defaultLanguage: formData.get("defaultLanguage") ?? "en",
    timezone: formData.get("timezone") ?? "America/New_York",
    greeting: formData.get("greeting") ?? "",
  });
  if (!parsed.success) return;
  const input = parsed.data;

  // Reject unknown timezones before they reach date-fns-tz at call time.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timezone });
  } catch {
    return;
  }

  await db()
    .update(tables.businesses)
    .set({
      name: input.name,
      industry: input.industry || null,
      description: input.description,
      phone: input.phone ? normalizePhone(input.phone) : null,
      twilioNumber: input.twilioNumber ? normalizePhone(input.twilioNumber) : null,
      notificationPhone: input.notificationPhone
        ? normalizePhone(input.notificationPhone)
        : null,
      defaultLanguage: resolveLanguage(input.defaultLanguage).code,
      timezone: input.timezone,
      greeting: input.greeting || null,
    })
    .where(eq(tables.businesses.id, session.businessId));
  revalidateDashboard();
}

export async function updateHours(formData: FormData): Promise<void> {
  const session = await requireSession();
  const rows = [] as {
    businessId: number;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    closed: boolean;
  }[];
  for (let day = 0; day < 7; day++) {
    const closed = formData.get(`closed_${day}`) === "on";
    const openTime = String(formData.get(`open_${day}`) ?? "09:00");
    const closeTime = String(formData.get(`close_${day}`) ?? "17:00");
    if (!isValidTime(openTime) || !isValidTime(closeTime)) return;
    rows.push({
      businessId: session.businessId,
      dayOfWeek: day,
      openTime,
      closeTime,
      closed,
    });
  }
  await db()
    .delete(tables.businessHours)
    .where(eq(tables.businessHours.businessId, session.businessId));
  await db().insert(tables.businessHours).values(rows);
  revalidateDashboard();
}

export async function addFaq(formData: FormData): Promise<void> {
  const session = await requireSession();
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!question || !answer) return;
  await db().insert(tables.faqs).values({
    businessId: session.businessId,
    question,
    answer,
  });
  revalidateDashboard();
}

export async function deleteFaq(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db()
    .delete(tables.faqs)
    .where(and(eq(tables.faqs.id, id), eq(tables.faqs.businessId, session.businessId)));
  revalidateDashboard();
}

export async function addService(formData: FormData): Promise<void> {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const duration = Number(formData.get("durationMinutes"));
  if (!name) return;
  await db().insert(tables.services).values({
    businessId: session.businessId,
    name,
    description,
    price,
    durationMinutes: Number.isInteger(duration) && duration > 0 ? duration : 30,
  });
  revalidateDashboard();
}

export async function setServiceActive(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "true";
  if (!Number.isInteger(id)) return;
  await db()
    .update(tables.services)
    .set({ active })
    .where(
      and(eq(tables.services.id, id), eq(tables.services.businessId, session.businessId)),
    );
  revalidateDashboard();
}

export async function setAppointmentStatus(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  if (!Number.isInteger(id) || !["cancelled", "completed", "confirmed"].includes(status)) {
    return;
  }
  await db()
    .update(tables.appointments)
    .set({ status })
    .where(
      and(
        eq(tables.appointments.id, id),
        eq(tables.appointments.businessId, session.businessId),
      ),
    );
  revalidateDashboard();
}
