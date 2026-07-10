"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-slate-950">☎</span>
          AlwaysHere
        </Link>
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">Log in to your dashboard.</p>

        <form action={formAction} className="mt-6 space-y-4">
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
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
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
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
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
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          New here?{" "}
          <Link href="/signup" className="font-medium text-teal-400 hover:text-teal-300">
            Create your account
          </Link>
        </p>
      </div>
    </main>
  );
}
