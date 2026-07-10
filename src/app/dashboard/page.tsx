import Link from "next/link";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db, tables } from "@/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const session = await requireSession();
  const businessId = session.businessId;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000);

  const [business] = await db()
    .select()
    .from(tables.businesses)
    .where(eq(tables.businesses.id, businessId));

  const [
    [totalCalls],
    [callsThisWeek],
    [upcomingAppointments],
    [leads],
    [escalated],
    recentCalls,
    [serviceCount],
    [faqCount],
  ] = await Promise.all([
    db().select({ n: count() }).from(tables.calls).where(eq(tables.calls.businessId, businessId)),
    db()
      .select({ n: count() })
      .from(tables.calls)
      .where(and(eq(tables.calls.businessId, businessId), gte(tables.calls.startedAt, weekAgo))),
    db()
      .select({ n: count() })
      .from(tables.appointments)
      .where(
        and(
          eq(tables.appointments.businessId, businessId),
          eq(tables.appointments.status, "confirmed"),
          gte(tables.appointments.startsAt, new Date()),
        ),
      ),
    db()
      .select({ n: count() })
      .from(tables.customers)
      .where(eq(tables.customers.businessId, businessId)),
    db()
      .select({ n: count() })
      .from(tables.calls)
      .where(and(eq(tables.calls.businessId, businessId), eq(tables.calls.escalated, true))),
    db()
      .select()
      .from(tables.calls)
      .where(eq(tables.calls.businessId, businessId))
      .orderBy(desc(tables.calls.startedAt))
      .limit(5),
    db()
      .select({ n: count() })
      .from(tables.services)
      .where(eq(tables.services.businessId, businessId)),
    db().select({ n: count() }).from(tables.faqs).where(eq(tables.faqs.businessId, businessId)),
  ]);

  const stats = [
    { label: "Calls answered", value: totalCalls.n },
    { label: "Calls this week", value: callsThisWeek.n },
    { label: "Upcoming appointments", value: upcomingAppointments.n },
    { label: "Leads captured", value: leads.n },
    { label: "Escalations", value: escalated.n },
  ];

  const checklist = [
    {
      done: Boolean(business?.twilioNumber),
      label: "Add your AlwaysHere (Twilio) number in Settings",
    },
    { done: (serviceCount.n ?? 0) > 0, label: "Add at least one service" },
    { done: (faqCount.n ?? 0) > 0, label: "Add a few FAQs" },
    {
      done: Boolean(business?.notificationPhone),
      label: "Set your notification phone for call summaries",
    },
  ];
  const setupIncomplete = checklist.some((item) => !item.done);
  const tz = business?.timezone ?? "America/New_York";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Overview</h1>
      <p className="mt-1 text-sm text-slate-500">
        What your AI receptionist has been doing for {business?.name}.
      </p>

      {setupIncomplete && (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">Finish setting up</h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {checklist.map((item) => (
              <li key={item.label}>
                {item.done ? "✅" : "⬜️"} {item.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-amber-800">
            Then forward your missed calls — see the instructions in{" "}
            <Link href="/dashboard/settings" className="font-medium underline">
              Settings
            </Link>
            .
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">Recent calls</h2>
          <Link href="/dashboard/calls" className="text-sm font-medium text-teal-600 hover:text-teal-500">
            View all
          </Link>
        </div>
        {recentCalls.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">
            No calls yet. Once forwarding is live, every missed call lands here with a
            transcript and summary.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentCalls.map((call) => (
              <li key={call.id}>
                <Link
                  href={`/dashboard/calls/${call.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium">{call.fromNumber}</p>
                    <p className="text-sm text-slate-500">
                      {formatInTimeZone(call.startedAt, tz, "MMM d, h:mm a")} ·{" "}
                      {call.intent ?? call.status}
                    </p>
                  </div>
                  {call.escalated && (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                      Urgent
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
