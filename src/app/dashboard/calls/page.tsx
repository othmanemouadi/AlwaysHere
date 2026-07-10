import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db, tables } from "@/db";
import { requireSession } from "@/lib/auth";
import { resolveLanguage } from "@/lib/languages";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number | null): string {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function CallsPage() {
  const session = await requireSession();
  const [business] = await db()
    .select({ timezone: tables.businesses.timezone })
    .from(tables.businesses)
    .where(eq(tables.businesses.id, session.businessId));
  const tz = business?.timezone ?? "America/New_York";

  const callRows = await db()
    .select()
    .from(tables.calls)
    .where(eq(tables.calls.businessId, session.businessId))
    .orderBy(desc(tables.calls.startedAt))
    .limit(200);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Call history</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every missed call your AI receptionist answered, with transcripts.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {callRows.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-500">No calls yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Caller</th>
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Language</th>
                <th className="px-5 py-3">Intent</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {callRows.map((call) => (
                <tr key={call.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">
                    {call.fromNumber}
                    {call.escalated && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Urgent
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {formatInTimeZone(call.startedAt, tz, "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDuration(call.durationSeconds)}</td>
                  <td className="px-5 py-3 text-slate-500">{resolveLanguage(call.language).label}</td>
                  <td className="px-5 py-3 text-slate-500">{call.intent ?? "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/dashboard/calls/${call.id}`}
                      className="font-medium text-teal-600 hover:text-teal-500"
                    >
                      Transcript
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
