import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-border bg-card py-6">
        <div className="mb-6 px-6">
          <span className="text-lg font-bold text-primary">Esvita</span>
          <span className="text-lg font-bold text-secondary"> GSM</span>
        </div>

        <div className="flex-1">
          <Sidebar isAdmin={session.user.role === "ADMIN"} />
        </div>

        <div className="mt-auto border-t border-border px-6 pt-4">
          <div className="mb-3 text-sm">
            <div className="font-medium text-foreground">{session.user.name}</div>
            <div className="text-xs text-muted">{session.user.role.replace("_", " ")}</div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="flex items-center gap-2 text-sm text-muted hover:text-foreground">
              <LogOut size={16} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
