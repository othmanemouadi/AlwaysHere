import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireSession } from "@/lib/auth";
import { LANGUAGES } from "@/lib/languages";
import { updateBusiness, updateHours } from "../actions";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none";
const labelClass = "block text-sm font-medium text-slate-700";

export default async function SettingsPage() {
  const session = await requireSession();
  const [business] = await db()
    .select()
    .from(tables.businesses)
    .where(eq(tables.businesses.id, session.businessId));
  const hours = await db()
    .select()
    .from(tables.businessHours)
    .where(eq(tables.businessHours.businessId, session.businessId))
    .orderBy(asc(tables.businessHours.dayOfWeek));
  const hoursByDay = new Map(hours.map((h) => [h.dayOfWeek, h]));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your business profile — the AI receptionist introduces itself and answers
        based on what you put here.
      </p>

      {/* Business profile */}
      <form
        action={updateBusiness}
        className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h2 className="font-semibold">Business profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelClass}>Business name</label>
            <input id="name" name="name" required defaultValue={business.name} className={inputClass} />
          </div>
          <div>
            <label htmlFor="industry" className={labelClass}>Industry</label>
            <input
              id="industry"
              name="industry"
              defaultValue={business.industry ?? ""}
              placeholder="e.g. Dental clinic"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>Business phone (your real line)</label>
            <input id="phone" name="phone" defaultValue={business.phone ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor="twilioNumber" className={labelClass}>AlwaysHere number (Twilio)</label>
            <input
              id="twilioNumber"
              name="twilioNumber"
              defaultValue={business.twilioNumber ?? ""}
              placeholder="+1 555 000 0000"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="notificationPhone" className={labelClass}>
              Notification phone (SMS summaries)
            </label>
            <input
              id="notificationPhone"
              name="notificationPhone"
              defaultValue={business.notificationPhone ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="defaultLanguage" className={labelClass}>Default language</label>
            <select
              id="defaultLanguage"
              name="defaultLanguage"
              defaultValue={business.defaultLanguage}
              className={inputClass}
            >
              {Object.values(LANGUAGES).map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="timezone" className={labelClass}>Timezone</label>
            <input
              id="timezone"
              name="timezone"
              required
              list="timezones"
              defaultValue={business.timezone}
              className={inputClass}
            />
            <datalist id="timezones">
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </div>
        </div>
        <div>
          <label htmlFor="description" className={labelClass}>
            About the business <span className="font-normal text-slate-500">(the AI reads this)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={business.description}
            placeholder="What you do, where you are, parking, insurance, policies…"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="greeting" className={labelClass}>
            Custom greeting <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id="greeting"
            name="greeting"
            rows={2}
            defaultValue={business.greeting ?? ""}
            placeholder="Hello, you've reached … I'm the virtual assistant — how can I help?"
            className={inputClass}
          />
        </div>
        <button className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-500">
          Save profile
        </button>
      </form>

      {/* Opening hours */}
      <form
        action={updateHours}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h2 className="font-semibold">Opening hours</h2>
        <p className="mt-1 text-sm text-slate-500">
          Appointments are only offered inside these hours ({business.timezone}).
        </p>
        <div className="mt-4 space-y-2">
          {DAY_NAMES.map((dayName, day) => {
            const row = hoursByDay.get(day);
            return (
              <div key={day} className="flex items-center gap-4 text-sm">
                <span className="w-24 font-medium">{dayName}</span>
                <label className="flex items-center gap-1.5 text-slate-600">
                  <input type="checkbox" name={`closed_${day}`} defaultChecked={row?.closed ?? false} />
                  Closed
                </label>
                <input
                  type="time"
                  name={`open_${day}`}
                  defaultValue={row?.openTime ?? "09:00"}
                  className="rounded-lg border border-slate-300 px-2 py-1"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="time"
                  name={`close_${day}`}
                  defaultValue={row?.closeTime ?? "17:00"}
                  className="rounded-lg border border-slate-300 px-2 py-1"
                />
              </div>
            );
          })}
        </div>
        <button className="mt-4 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-500">
          Save hours
        </button>
      </form>

      {/* Forwarding setup */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Missed-call forwarding setup</h2>
        <p className="mt-1 text-sm text-slate-500">
          Dial these from your business phone so unanswered and busy calls forward to
          your AlwaysHere number{business.twilioNumber ? ` (${business.twilioNumber})` : ""}.
        </p>
        <div className="mt-4 space-y-2 font-mono text-sm">
          <p className="rounded-lg bg-slate-100 px-3 py-2">
            Forward when unanswered: <strong>*61*{business.twilioNumber ?? "+1XXXXXXXXXX"}**20#</strong>
          </p>
          <p className="rounded-lg bg-slate-100 px-3 py-2">
            Forward when busy: <strong>*67*{business.twilioNumber ?? "+1XXXXXXXXXX"}#</strong>
          </p>
          <p className="rounded-lg bg-slate-100 px-3 py-2">
            Forward when unreachable: <strong>*62*{business.twilioNumber ?? "+1XXXXXXXXXX"}#</strong>
          </p>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          These are the standard GSM codes; some carriers use their own (e.g. Verizon{" "}
          <span className="font-mono">*71</span>, AT&amp;T wireless{" "}
          <span className="font-mono">*61#</span> variants). Check &ldquo;conditional
          call forwarding&rdquo; with your carrier if the codes above don&rsquo;t work.
        </p>
      </div>
    </div>
  );
}
