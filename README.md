# AlwaysHere — AI Missed Call Assistant

An AI receptionist that automatically answers your missed business calls, speaks your
customers' language, answers questions, captures leads, and books appointments — so you
never lose a customer because you missed the phone.

**How it works:** your business phone keeps its number. You enable carrier
*conditional call forwarding* so unanswered/busy calls forward to a Twilio number.
AlwaysHere answers with an AI receptionist trained on your services, FAQs, and hours;
it books appointments against your real availability, texts the customer a
confirmation, and texts you a summary of every call.

## Stack

- **Next.js 15** (App Router, TypeScript) — landing page, dashboard, and webhook API in one app
- **PostgreSQL + Drizzle ORM**
- **Twilio** Programmable Voice (speech recognition + neural TTS) and Messaging
- **OpenAI** chat completions with function calling (booking, lead capture, escalation, language switching)
- **Google Calendar** sync (optional, service-account based)

## Local setup

```bash
git clone https://github.com/Jonahbkerr/Alwayshere.git
cd Alwayshere
npm install

# 1. Start Postgres (listens on localhost:5439)
docker compose up -d

# 2. Configure environment
cp .env.example .env
# Edit .env — DATABASE_URL works as-is for docker; add OPENAI_API_KEY and Twilio creds

# 3. Create tables and demo data
npm run db:migrate
npm run db:seed   # demo login: demo@alwayshere.app / demo-password

# 4. Run
npm run dev
```

Open http://localhost:3000 — log in with the demo account or sign up to create your
own business.

## Wiring up a real phone number

1. Buy a Twilio number with **Voice + SMS**, put it in `.env` as `TWILIO_NUMBER`, and
   enter the same number in **Dashboard → Settings → AlwaysHere number**.
2. Expose the app publicly (deploy it, or `ngrok http 3000` for testing) and set
   `PUBLIC_BASE_URL` in `.env`.
3. In the Twilio console, configure the number:
   - **A call comes in** → Webhook `POST {PUBLIC_BASE_URL}/api/voice/incoming`
   - **Call status changes** → `POST {PUBLIC_BASE_URL}/api/voice/status`
4. On the business phone, enable conditional call forwarding to the Twilio number.
   Standard GSM codes (shown in the dashboard with your number filled in):
   - Forward when unanswered: `*61*<twilio-number>**20#`
   - Forward when busy: `*67*<twilio-number>#`
   - Forward when unreachable: `*62*<twilio-number>#`

   Some carriers use their own codes (Verizon `*71<number>`, etc.) — search
   "conditional call forwarding" + your carrier.

Call the business number, don't pick up, and the AI answers. The transcript, summary,
lead, and any appointment appear in the dashboard; SMS summaries go to your
notification phone.

## Google Calendar sync (optional)

Create a Google Cloud service account, enable the Calendar API, share the target
calendar with the service account's email (with "Make changes to events"), and set
`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID` in `.env`.
Booked appointments are then mirrored to the calendar; without these vars they simply
stay in the dashboard.

## Tests

```bash
npm test
```

Unit tests cover the deterministic core: slot availability and conflicts, timezone and
DST handling, language resolution, the receptionist system prompt, and the
tool-dispatch conversation loop with a mocked LLM. Real-call end-to-end testing
requires Twilio credentials and a public URL (see above) and is intentionally outside
the test suite.

## Project layout

```
src/
  app/
    page.tsx                 # marketing landing page
    (auth)/                  # signup / login / server actions
    dashboard/               # overview, calls + transcripts, appointments,
                             # knowledge base, settings (all auth-guarded)
    api/voice/incoming       # Twilio: call answered, greeting + first gather
    api/voice/respond        # Twilio: per-utterance AI conversation loop
    api/voice/status         # Twilio: call ended → summary + owner SMS
  lib/
    ai/                      # system prompt, tool definitions, conversation brain
    booking.ts  slots.ts     # availability + booking (slots.ts is pure/unit-tested)
    twilio.ts  sms.ts        # telephony helpers, signature validation, messaging
    calendar.ts              # optional Google Calendar sync (service account)
    auth.ts                  # password hashing + JWT cookie sessions
  db/                        # Drizzle schema, client, seed
docs/superpowers/specs/      # design doc for this MVP
```

## Design notes

The MVP uses Twilio's built-in speech recognition and neural TTS rather than a
streaming Whisper pipeline — one less realtime system while proving the product. The
AI brain is isolated behind `runAssistantTurn()` so a custom STT/TTS stack can replace
the transport later without touching conversation logic. See
[the design doc](docs/superpowers/specs/2026-07-08-alwayshere-mvp-design.md) for
decisions and trade-offs.
