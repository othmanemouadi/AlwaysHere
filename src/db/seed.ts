import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as schema from "./schema";

/**
 * Seeds a demo business (Riverside Dental) so the dashboard and the voice
 * flow can be exercised immediately.
 *
 *   Login: demo@alwayshere.app / demo-password
 */
async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://alwayshere:alwayshere@localhost:5439/alwayshere",
  });
  const db = drizzle(pool, { schema });

  const email = "demo@alwayshere.app";
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) {
    console.log("Demo user already exists — nothing to do.");
    await pool.end();
    return;
  }

  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash: await bcrypt.hash("demo-password", 10),
      name: "Dana Rivera",
    })
    .returning();

  const [business] = await db
    .insert(schema.businesses)
    .values({
      ownerId: user.id,
      name: "Riverside Dental",
      industry: "Dental clinic",
      description:
        "Family dental clinic at 42 River Street, Springfield. Free parking behind the building. We accept most major insurance plans (Delta, Cigna, Aetna) and offer payment plans. New patients welcome.",
      phone: "+15551230000",
      notificationPhone: "+15551230001",
      defaultLanguage: "en",
      timezone: "America/New_York",
    })
    .returning();

  await db.insert(schema.businessHours).values(
    [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      businessId: business.id,
      dayOfWeek,
      openTime: dayOfWeek === 6 ? "10:00" : "09:00",
      closeTime: dayOfWeek === 6 ? "14:00" : "17:00",
      closed: dayOfWeek === 0,
    })),
  );

  await db.insert(schema.services).values([
    {
      businessId: business.id,
      name: "Check-up & cleaning",
      description: "Routine exam with hygienist cleaning.",
      price: "$120",
      durationMinutes: 45,
    },
    {
      businessId: business.id,
      name: "Teeth whitening",
      description: "In-office whitening session.",
      price: "$300",
      durationMinutes: 60,
    },
    {
      businessId: business.id,
      name: "Emergency visit",
      description: "Same-day slot for acute pain or a broken tooth.",
      price: "$95 consultation",
      durationMinutes: 30,
    },
  ]);

  await db.insert(schema.faqs).values([
    {
      businessId: business.id,
      question: "Do you take walk-ins?",
      answer:
        "We see walk-ins when a slot is free, but booking ahead is strongly recommended — same-day slots usually exist for emergencies.",
    },
    {
      businessId: business.id,
      question: "Which insurance do you accept?",
      answer: "Delta Dental, Cigna and Aetna. For other plans we provide an itemized receipt to claim yourself.",
    },
    {
      businessId: business.id,
      question: "Is there parking?",
      answer: "Yes, free customer parking behind the building on River Street.",
    },
  ]);

  console.log("Seeded demo business. Login: demo@alwayshere.app / demo-password");
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
