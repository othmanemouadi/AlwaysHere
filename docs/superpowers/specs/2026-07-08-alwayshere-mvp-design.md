# AlwaysHere — AI Missed Call Assistant MVP: Design

Date: 2026-07-08
Status: Approved for implementation (built autonomously from the founder's business plan; decisions below fill the gaps the plan left open)

## What we're building

A web application that gives small service businesses an AI voice receptionist. When the
business misses a call, the call forwards (carrier conditional-forwarding) to a Twilio
number owned by AlwaysHere. The AI answers in the caller's language, answers questions
from the business's knowledge base, captures lead details, books appointments, sends SMS
confirmations, and texts the owner a summary of every call.

## Architecture

One Next.js (App Router, TypeScript) application serving three surfaces:

1. **Marketing landing page** (`/`) — pitch, how it works, industries, CTA.
2. **Admin dashboard** (`/dashboard/*`) — auth-guarded; overview stats, call history +
   transcripts, appointments, knowledge base (FAQs + services), settings (profile,
   hours, forwarding instructions).
3. **Telephony webhooks** (`/api/voice/*`) — Twilio Programmable Voice endpoints that
   run the live AI conversation.

Backend: Next.js route handlers + server actions. Database: PostgreSQL via Drizzle ORM.

### Key decision: speech via Twilio `<Gather input="speech">`, not streaming Whisper

The plan suggests Whisper. For the MVP we use Twilio's built-in speech recognition
(`<Gather input="speech">`) and TTS (`<Say>`), because it removes an entire realtime
audio pipeline (websocket media streams, chunked STT, TTS synthesis + hosting) while
proving the same hypotheses. The AI brain is isolated behind `runAssistantTurn()` so a
Whisper/ElevenLabs pipeline can replace the transport later without touching the brain.

### Conversation loop

```
Twilio call → POST /api/voice/incoming
  → create `calls` row, greet caller, <Gather input="speech" action="/api/voice/respond">
POST /api/voice/respond (each caller utterance)
  → append transcript → runAssistantTurn() (OpenAI chat completion + tools)
  → tool calls executed server-side (booking, lead capture, escalation, language switch)
  → <Say> reply in the active language + next <Gather>, or <Hangup>
POST /api/voice/status (call completed)
  → LLM writes summary + intent → stored on the call → SMS summary to owner
```

Turn cap of 20 assistant turns per call prevents runaway loops.

### AI brain (`src/lib/ai/`)

- System prompt assembled from the business profile: name, description, services
  (price/duration), FAQs, opening hours, timezone, booking rules, current local time.
- OpenAI Chat Completions (model from `OPENAI_MODEL`, default `gpt-4o-mini`) with tools:
  - `check_availability(date, service_id)` → open slots from hours minus booked slots
  - `book_appointment(customer_name, customer_phone, service_id, start_iso)` →
    validates hours + conflicts, creates appointment, SMS confirmation to customer,
    optional Google Calendar sync
  - `capture_lead(name, phone, reason)` → stores customer + reason
  - `escalate(reason)` → flags call urgent, immediate SMS to owner
  - `switch_language(language_code)` → changes `<Say>`/`<Gather>` locale for the rest
    of the call (supported set mapped to Twilio speech locales)
  - `end_call(farewell)` → polite hangup
- Multilingual: call starts in the business's default language; the model detects the
  caller's language from the transcript and calls `switch_language`.

### Booking (`src/lib/booking.ts`)

Slots are computed from `business_hours` (per-weekday open/close in the business's
timezone) minus existing confirmed appointments, stepped by service duration
(30-minute default). All times stored as UTC `timestamptz`; timezone math via
`date-fns-tz`. Google Calendar sync is env-gated (service-account JWT built with
`jose`, no googleapis dependency): if `GOOGLE_*` vars are absent it silently no-ops.

### SMS (`src/lib/sms.ts`)

Twilio Messaging: booking confirmation to the customer, call summary to the owner's
notification phone, escalation alert. All fire-and-forget with logged failures — SMS
failure never breaks a live call.

### Auth

MVP-simple: email + password (bcryptjs), JWT session cookie signed with `jose`,
Next.js middleware guarding `/dashboard`. Signup creates a user + their business in one
step. One user per business for MVP.

### Data model

`users`, `businesses` (owner, twilioNumber, notificationPhone, defaultLanguage,
timezone, greeting), `business_hours`, `services`, `faqs`, `customers`, `calls`
(sid, from, status, language, intent, summary, escalated), `call_messages`
(role + content transcript), `appointments` (status, calendarEventId).

### Security

- Twilio webhook signature validation (`X-Twilio-Signature`) when
  `TWILIO_AUTH_TOKEN` + `PUBLIC_BASE_URL` are set; skipped in dev.
- All dashboard reads/writes scoped by the session's business id.
- Zod validation on auth + settings inputs; TwiML built with the Twilio SDK
  (correct XML escaping).

### Error handling

Voice webhooks never 500 at the caller: any internal failure returns TwiML that
apologizes and offers the owner a callback (lead capture fallback). LLM/tool errors are
recorded in `call_messages` with role `system` for debugging from the transcript view.

### Testing

Vitest unit tests on the deterministic core: slot availability/conflicts, business-hours
edge cases, language→Twilio-locale mapping, system prompt builder, phone normalization.
The live Twilio/OpenAI path is exercised via a mocked-OpenAI test of the respond
handler's tool-dispatch loop. (Real-call E2E requires Twilio credentials and a public
URL — documented in the README, out of CI scope.)

## Alternatives considered

- **Whisper + media streams now**: rejected for MVP — 3–4× the moving parts to prove the
  same product hypotheses; isolated behind the brain interface for later.
- **Vapi/Retell managed voice-agent platform**: fastest to demo but locks the core IP
  and per-minute margin into a vendor; rejected since the plan explicitly owns telephony
  via Twilio.
- **Separate Express backend**: unnecessary — Next.js route handlers cover the webhook
  surface; one deployable keeps MVP ops trivial.

## Out of scope (per plan)

CRM integrations, payments, live human handoff mid-call, WhatsApp, email automation,
outbound reminder calls, multi-voice, analytics beyond the overview stats.

## Build plan

1. Scaffold Next.js + Tailwind + Drizzle + config, docker-compose Postgres.
2. Schema + migrations + seed (demo dental clinic).
3. Auth (signup/login/session/middleware).
4. Booking + SMS + calendar libs with unit tests.
5. AI brain + voice webhooks with mocked-LLM tests.
6. Dashboard pages + server actions.
7. Landing page.
8. README (env, Twilio setup, forwarding codes), full build + test pass, push.
