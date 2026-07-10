import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db, tables } from "@/db";
import { requireSession } from "@/lib/auth";
import { resolveLanguage } from "@/lib/languages";

export const dynamic = "force-dynamic";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const callId = Number.parseInt(id, 10);
  if (!Number.isInteger(callId)) notFound();

  const [call] = await db()
    .select()
    .from(tables.calls)
    .where(and(eq(tables.calls.id, callId), eq(tables.calls.businessId, session.businessId)));
  if (!call) notFound();

  const [business] = await db()
    .select({ timezone: tables.businesses.timezone })
    .from(tables.businesses)
    .where(eq(tables.businesses.id, session.businessId));
  const tz = business?.timezone ?? "America/New_York";

  const transcript = await db()
    .select()
    .from(tables.callMessages)
    .where(eq(tables.callMessages.callId, call.id))
    .orderBy(asc(tables.callMessages.id));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/calls" className="text-sm font-medium text-teal-600 hover:text-teal-500">
        ← All calls
      </Link>
      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{call.fromNumber}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatInTimeZone(call.startedAt, tz, "EEEE, MMMM d, yyyy 'at' h:mm a")} ·{" "}
            {resolveLanguage(call.language).label} · {call.status}
          </p>
        </div>
        {call.escalated && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            Urgent — owner alerted
          </span>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Summary</h2>
        <p className="mt-2 text-slate-800">
          {call.summary ?? "Summary will appear here once the call has ended."}
        </p>
        {call.intent && (
          <p className="mt-2 text-sm text-slate-500">
            Intent: <span className="font-medium text-slate-700">{call.intent}</span>
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Transcript</h2>
        <div className="mt-4 space-y-3">
          {transcript.length === 0 && (
            <p className="text-sm text-slate-500">No transcript recorded.</p>
          )}
          {transcript.map((message) => {
            if (message.role === "system") {
              return (
                <p key={message.id} className="text-center text-xs text-slate-400">
                  {message.content}
                </p>
              );
            }
            const isCaller = message.role === "caller";
            return (
              <div key={message.id} className={`flex ${isCaller ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    isCaller ? "bg-slate-100 text-slate-800" : "bg-teal-600 text-white"
                  }`}
                >
                  <p className="mb-0.5 text-xs opacity-70">{isCaller ? "Caller" : "AI receptionist"}</p>
                  {message.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
