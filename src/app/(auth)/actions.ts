"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, tables } from "@/db";
import {
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

export type AuthFormState = { error: string } | null;

const signupSchema = z.object({
  name: z.string().trim().min(1, "Your name is required").max(120),
  businessName: z.string().trim().min(1, "Business name is required").max(160),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().max(32).optional(),
});

const DEFAULT_HOURS = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  openTime: "09:00",
  closeTime: "17:00",
  closed: dayOfWeek === 0 || dayOfWeek === 6,
}));

export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const [existing] = await db()
    .select({ id: tables.users.id })
    .from(tables.users)
    .where(eq(tables.users.email, input.email));
  if (existing) {
    return { error: "An account with this email already exists. Log in instead." };
  }

  const passwordHash = await hashPassword(input.password);
  const [user] = await db()
    .insert(tables.users)
    .values({ email: input.email, passwordHash, name: input.name })
    .returning();
  const [business] = await db()
    .insert(tables.businesses)
    .values({
      ownerId: user.id,
      name: input.businessName,
      phone: input.phone ? normalizePhone(input.phone) : null,
      notificationPhone: input.phone ? normalizePhone(input.phone) : null,
    })
    .returning();
  await db()
    .insert(tables.businessHours)
    .values(DEFAULT_HOURS.map((h) => ({ ...h, businessId: business.id })));

  await setSessionCookie({ userId: user.id, businessId: business.id });
  redirect("/dashboard");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [user] = await db()
    .select()
    .from(tables.users)
    .where(eq(tables.users.email, parsed.data.email));
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }

  const [business] = await db()
    .select({ id: tables.businesses.id })
    .from(tables.businesses)
    .where(eq(tables.businesses.ownerId, user.id));
  if (!business) {
    return { error: "No business found for this account." };
  }

  await setSessionCookie({ userId: user.id, businessId: business.id });
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
