import Link from "next/link";

const FLOW_STEPS = [
  { title: "Customer calls your business", detail: "Your number, your line — nothing changes for callers." },
  { title: "You can't pick up", detail: "Busy chair, after hours, out on a job." },
  { title: "The call forwards automatically", detail: "Carrier-level conditional forwarding to your AlwaysHere number." },
  { title: "The AI answers in their language", detail: "Trained on your services, prices, hours and policies." },
  { title: "It answers, books, or escalates", detail: "Questions answered, appointments booked, urgent calls flagged instantly." },
  { title: "You get the summary by SMS", detail: "Who called, what they needed, what happened — plus the full transcript." },
];

const FEATURES = [
  { title: "24/7 answering", detail: "Every missed call is answered in seconds, day or night." },
  { title: "Multilingual", detail: "English, Spanish, French, German, Portuguese, Italian, Mandarin, Arabic, Hindi — switched mid-call automatically." },
  { title: "Appointment booking", detail: "Real availability from your opening hours and calendar, confirmed by SMS." },
  { title: "Lead capture", detail: "Name, number and reason for calling saved for every caller you'd have lost." },
  { title: "Your knowledge base", detail: "FAQs, services and pricing you control from a simple dashboard." },
  { title: "Urgent escalation", detail: "Emergencies trigger an instant SMS alert to your phone." },
];

const INDUSTRIES = [
  "Dental clinics",
  "Medical practices",
  "Auto repair",
  "Salons & barbers",
  "Plumbing",
  "Electricians",
  "HVAC",
  "Real estate",
  "Law firms",
  "Cleaning services",
];

export default function LandingPage() {
  return (
    <main className="bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-slate-950">☎</span>
          AlwaysHere
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
        <p className="mx-auto mb-6 w-fit rounded-full border border-teal-500/40 bg-teal-500/10 px-4 py-1 text-sm text-teal-300">
          Every missed call is a customer deciding to call your competitor
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Never lose a customer because you{" "}
          <span className="text-teal-400">missed the phone</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          AlwaysHere is an AI receptionist that answers your missed business calls,
          speaks your customers&rsquo; language, answers their questions, captures
          leads, and books appointments — 24/7.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-xl bg-teal-500 px-6 py-3 text-base font-semibold text-slate-950 hover:bg-teal-400"
          >
            Set up your AI receptionist
          </Link>
          <a
            href="#how-it-works"
            className="rounded-xl border border-slate-700 px-6 py-3 text-base font-medium text-slate-300 hover:border-slate-500 hover:text-white"
          >
            How it works
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-3 text-center text-slate-400">
            No new hardware, no app for your customers, nothing to install.
          </p>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FLOW_STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/15 text-sm font-bold text-teal-400">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          A receptionist that never sleeps, for less than an hour of staff time
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="font-semibold text-teal-400">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{feature.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Industries */}
      <section className="border-t border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Built for businesses that live on the phone
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {INDUSTRIES.map((industry) => (
              <span
                key={industry}
                className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300"
              >
                {industry}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Your next missed call could be answered
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">
          Create your business profile, add your FAQs and hours, and forward your
          missed calls. It takes about ten minutes.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-block rounded-xl bg-teal-500 px-8 py-4 text-lg font-semibold text-slate-950 hover:bg-teal-400"
        >
          Get started free
        </Link>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} AlwaysHere. Never miss another customer call.
      </footer>
    </main>
  );
}
