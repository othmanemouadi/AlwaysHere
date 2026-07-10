import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db, tables } from "@/db";
import { requireSession } from "@/lib/auth";
import { setAppointmentStatus } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-teal-100 text-teal-800",
  cancelled: "bg-slate-200 text-slate-600",
  completed: "bg-blue-100 text-blue-800",
};

function AppointmentRow({
  appointment,
  serviceName,
  tz,
  upcoming,
}: {
  appointment: typeof tables.appointments.$inferSelect;
  serviceName: string | null;
  tz: string;
  upcoming: boolean;
}) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-5 py-3">
        <p className="font-medium">{appointment.customerName}</p>
        <p className="text-slate-500">{appointment.customerPhone}</p>
      </td>
      <td className="px-5 py-3 text-slate-600">{serviceName ?? "Appointment"}</td>
      <td className="px-5 py-3 text-slate-600">
        {formatInTimeZone(appointment.startsAt, tz, "EEE, MMM d · h:mm a")}
      </td>
      <td className="px-5 py-3">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[appointment.status] ?? ""}`}
        >
          {appointment.status}
        </span>
      </td>
      <td className="px-5 py-3 text-right">
        {appointment.status === "confirmed" && (
          <div className="flex justify-end gap-2">
            {!upcoming && (
              <form action={setAppointmentStatus}>
                <input type="hidden" name="id" value={appointment.id} />
                <input type="hidden" name="status" value="completed" />
                <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-100">
                  Mark completed
                </button>
              </form>
            )}
            <form action={setAppointmentStatus}>
              <input type="hidden" name="id" value={appointment.id} />
              <input type="hidden" name="status" value="cancelled" />
              <button className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                Cancel
              </button>
            </form>
          </div>
        )}
      </td>
    </tr>
  );
}

function AppointmentsTable({
  rows,
  tz,
  upcoming,
  emptyText,
}: {
  rows: { appointment: typeof tables.appointments.$inferSelect; serviceName: string | null }[];
  tz: string;
  upcoming: boolean;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-sm text-slate-500">{emptyText}</p>;
  }
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-5 py-3">Customer</th>
          <th className="px-5 py-3">Service</th>
          <th className="px-5 py-3">When</th>
          <th className="px-5 py-3">Status</th>
          <th className="px-5 py-3"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map(({ appointment, serviceName }) => (
          <AppointmentRow
            key={appointment.id}
            appointment={appointment}
            serviceName={serviceName}
            tz={tz}
            upcoming={upcoming}
          />
        ))}
      </tbody>
    </table>
  );
}

export default async function AppointmentsPage() {
  const session = await requireSession();
  const now = new Date();

  const [business] = await db()
    .select({ timezone: tables.businesses.timezone })
    .from(tables.businesses)
    .where(eq(tables.businesses.id, session.businessId));
  const tz = business?.timezone ?? "America/New_York";

  const base = {
    appointment: tables.appointments,
    serviceName: tables.services.name,
  };
  const [upcoming, past] = await Promise.all([
    db()
      .select(base)
      .from(tables.appointments)
      .leftJoin(tables.services, eq(tables.appointments.serviceId, tables.services.id))
      .where(
        and(
          eq(tables.appointments.businessId, session.businessId),
          gte(tables.appointments.startsAt, now),
        ),
      )
      .orderBy(asc(tables.appointments.startsAt)),
    db()
      .select(base)
      .from(tables.appointments)
      .leftJoin(tables.services, eq(tables.appointments.serviceId, tables.services.id))
      .where(
        and(
          eq(tables.appointments.businessId, session.businessId),
          lt(tables.appointments.startsAt, now),
        ),
      )
      .orderBy(desc(tables.appointments.startsAt))
      .limit(100),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Appointments</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bookings made by your AI receptionist. Customers get an SMS confirmation
        automatically.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-4 font-semibold">Upcoming</h2>
        <AppointmentsTable
          rows={upcoming}
          tz={tz}
          upcoming
          emptyText="No upcoming appointments yet."
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-4 font-semibold">Past</h2>
        <AppointmentsTable rows={past} tz={tz} upcoming={false} emptyText="No past appointments." />
      </div>
    </div>
  );
}
