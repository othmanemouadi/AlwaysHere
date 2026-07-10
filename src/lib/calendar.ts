import "server-only";
import { SignJWT, importPKCS8 } from "jose";

/**
 * Minimal Google Calendar sync via a service account — no googleapis dependency.
 * Configure GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY and
 * GOOGLE_CALENDAR_ID; share the calendar with the service account. If any is
 * missing, sync silently no-ops and appointments live in the database only.
 */

function calendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_CALENDAR_ID,
  );
}

async function getAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  try {
    const key = await importPKCS8(rawKey, "RS256");
    const assertion = await new SignJWT({
      scope: "https://www.googleapis.com/auth/calendar.events",
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!res.ok) {
      console.error("[calendar] token exchange failed:", await res.text());
      return null;
    }
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (error) {
    console.error("[calendar] failed to build service-account token:", error);
    return null;
  }
}

export async function createCalendarEvent(input: {
  summary: string;
  description: string;
  startISO: string;
  endISO: string;
  timezone: string;
}): Promise<string | null> {
  if (!calendarConfigured()) return null;
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const calendarId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: input.summary,
          description: input.description,
          start: { dateTime: input.startISO, timeZone: input.timezone },
          end: { dateTime: input.endISO, timeZone: input.timezone },
        }),
      },
    );
    if (!res.ok) {
      console.error("[calendar] event insert failed:", await res.text());
      return null;
    }
    const event = (await res.json()) as { id?: string };
    return event.id ?? null;
  } catch (error) {
    console.error("[calendar] event insert error:", error);
    return null;
  }
}
