import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireSession } from "@/lib/auth";
import { addFaq, addService, deleteFaq, setServiceActive } from "../actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none";

export default async function KnowledgePage() {
  const session = await requireSession();
  const [serviceRows, faqRows] = await Promise.all([
    db()
      .select()
      .from(tables.services)
      .where(eq(tables.services.businessId, session.businessId))
      .orderBy(asc(tables.services.id)),
    db()
      .select()
      .from(tables.faqs)
      .where(eq(tables.faqs.businessId, session.businessId))
      .orderBy(asc(tables.faqs.id)),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Knowledge base</h1>
      <p className="mt-1 text-sm text-slate-500">
        Everything here is what your AI receptionist knows. It will never invent
        answers beyond this and your business profile.
      </p>

      {/* Services */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">Services</h2>
          <p className="text-sm text-slate-500">
            Used for answering pricing questions and booking appointments.
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {serviceRows.map((service) => (
            <li key={service.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className={service.active ? "" : "opacity-50"}>
                <p className="font-medium">
                  {service.name}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {service.durationMinutes} min{service.price ? ` · ${service.price}` : ""}
                  </span>
                </p>
                {service.description && (
                  <p className="text-sm text-slate-500">{service.description}</p>
                )}
              </div>
              <form action={setServiceActive}>
                <input type="hidden" name="id" value={service.id} />
                <input type="hidden" name="active" value={service.active ? "false" : "true"} />
                <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-100">
                  {service.active ? "Disable" : "Enable"}
                </button>
              </form>
            </li>
          ))}
          {serviceRows.length === 0 && (
            <li className="px-5 py-6 text-sm text-slate-500">No services yet — add your first below.</li>
          )}
        </ul>
        <form action={addService} className="grid gap-3 border-t border-slate-200 px-5 py-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input name="name" required placeholder="Service name (e.g. Teeth cleaning)" className={inputClass} />
          <input name="price" placeholder="Price (e.g. $120)" className={inputClass} />
          <input
            name="durationMinutes"
            type="number"
            min={5}
            step={5}
            placeholder="Minutes"
            className={inputClass}
          />
          <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">
            Add
          </button>
          <input
            name="description"
            placeholder="Optional description the AI can use"
            className={`${inputClass} sm:col-span-4`}
          />
        </form>
      </section>

      {/* FAQs */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">FAQs</h2>
          <p className="text-sm text-slate-500">
            Common questions and exactly how you want them answered.
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {faqRows.map((faq) => (
            <li key={faq.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div>
                <p className="font-medium">{faq.question}</p>
                <p className="text-sm text-slate-500">{faq.answer}</p>
              </div>
              <form action={deleteFaq}>
                <input type="hidden" name="id" value={faq.id} />
                <button className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </form>
            </li>
          ))}
          {faqRows.length === 0 && (
            <li className="px-5 py-6 text-sm text-slate-500">
              No FAQs yet — start with hours exceptions, parking, insurance, payment methods.
            </li>
          )}
        </ul>
        <form action={addFaq} className="space-y-3 border-t border-slate-200 px-5 py-4">
          <input name="question" required placeholder="Question (e.g. Do you take walk-ins?)" className={inputClass} />
          <textarea
            name="answer"
            required
            rows={2}
            placeholder="Answer, as you'd want it said on the phone"
            className={inputClass}
          />
          <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">
            Add FAQ
          </button>
        </form>
      </section>
    </div>
  );
}
