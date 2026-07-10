"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, null);

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-slate-950">☎</span>
          AlwaysHere
        </Link>
        <h1 className="text-2xl font-bold text-white">Set up your AI receptionist</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create your account and business profile in one step.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300">
              Your name
            </label>
            <input id="name" name="name" required className={inputClass} placeholder="Dana Rivera" />
          </div>
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-slate-300">
              Business name
            </label>
            <input
              id="businessName"
              name="businessName"
              required
              className={inputClass}
              placeholder="Riverside Dental"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-300">
              Your mobile number{" "}
              <span className="text-slate-500">(for call summaries by SMS)</span>
            </label>
            <input id="phone" name="phone" className={inputClass} placeholder="+1 555 123 4567" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
              placeholder="you@business.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-teal-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
          >
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-teal-400 hover:text-teal-300">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
