import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 160 }).notNull(),
  industry: varchar("industry", { length: 80 }),
  description: text("description").notNull().default(""),
  // The business's own phone line (the one customers dial).
  phone: varchar("phone", { length: 32 }),
  // The AlwaysHere Twilio number missed calls are forwarded to.
  twilioNumber: varchar("twilio_number", { length: 32 }),
  // Where call summaries and escalation alerts are texted.
  notificationPhone: varchar("notification_phone", { length: 32 }),
  defaultLanguage: varchar("default_language", { length: 8 }).notNull().default("en"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("America/New_York"),
  greeting: text("greeting"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businessHours = pgTable("business_hours", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  // 0 = Sunday … 6 = Saturday (JS Date.getDay convention)
  dayOfWeek: integer("day_of_week").notNull(),
  // "09:00" / "17:30" local to the business timezone
  openTime: varchar("open_time", { length: 5 }).notNull().default("09:00"),
  closeTime: varchar("close_time", { length: 5 }).notNull().default("17:00"),
  closed: boolean("closed").notNull().default(false),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description").notNull().default(""),
  price: varchar("price", { length: 60 }).notNull().default(""),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  active: boolean("active").notNull().default(true),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  name: varchar("name", { length: 160 }).notNull().default(""),
  phone: varchar("phone", { length: 32 }).notNull(),
  language: varchar("language", { length: 8 }),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  twilioCallSid: varchar("twilio_call_sid", { length: 64 }).notNull().unique(),
  fromNumber: varchar("from_number", { length: 32 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("in-progress"),
  language: varchar("language", { length: 8 }).notNull().default("en"),
  intent: varchar("intent", { length: 120 }),
  summary: text("summary"),
  escalated: boolean("escalated").notNull().default(false),
  assistantTurns: integer("assistant_turns").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
});

export const callMessages = pgTable("call_messages", {
  id: serial("id").primaryKey(),
  callId: integer("call_id")
    .notNull()
    .references(() => calls.id),
  // "assistant" | "caller" | "tool" | "system"
  role: varchar("role", { length: 16 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  customerId: integer("customer_id").references(() => customers.id),
  serviceId: integer("service_id").references(() => services.id),
  callId: integer("call_id").references(() => calls.id),
  customerName: varchar("customer_name", { length: 160 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 32 }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  // "confirmed" | "cancelled" | "completed"
  status: varchar("status", { length: 16 }).notNull().default("confirmed"),
  notes: text("notes").notNull().default(""),
  calendarEventId: varchar("calendar_event_id", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
