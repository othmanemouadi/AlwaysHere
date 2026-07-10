import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { requireSession } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/calls", label: "Calls" },
  { href: "/dashboard/appointments", label: "Appointments" },
  { href: "/dashboard/knowledge", label: "Knowledge base" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const [business] = await db()
    .select({ name: tables.businesses.name })
    .from(tables.businesses)
    .where(eq(tables.businesses.id, session.businessId));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-300">
        <Link href="/" className="flex items-center gap-2 px-5 py-5 text-base font-semibold text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500 text-sm text-slate-950">☎</span>
          AlwaysHere
        </Link>
        <p className="truncate px-5 pb-4 text-xs uppercase tracking-wide text-slate-500">
          {business?.name ?? "Your business"}
        </p>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="p-3">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Log out
          </button>
        </form>
      </aside>
      <main className="flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  );
}
