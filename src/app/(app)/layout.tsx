import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/lines", label: "GSM Lines" },
  { href: "/people", label: "People" },
  { href: "/devices", label: "Devices" },
  { href: "/bills", label: "Bills" },
  { href: "/alerts", label: "Alerts" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-slate-900">Esvita GSM</span>
          <nav className="flex gap-4 text-sm text-slate-600">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-slate-900">
                {item.label}
              </Link>
            ))}
            {session.user.role === "ADMIN" && (
              <>
                <Link href="/admin/users" className="hover:text-slate-900">
                  Users
                </Link>
                <Link href="/admin/packages" className="hover:text-slate-900">
                  Packages
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>
            {session.user.name} · <span className="text-slate-400">{session.user.role}</span>
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-slate-500 hover:text-slate-900">Sign out</button>
          </form>
        </div>
      </header>
      <main className="flex-1 bg-slate-50 px-6 py-6">{children}</main>
    </div>
  );
}
