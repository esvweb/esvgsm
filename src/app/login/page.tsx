import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw err;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form
        action={login}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <div>
          <span className="text-xl font-bold text-primary">Esvita</span>
          <span className="text-xl font-bold text-secondary"> GSM</span>
        </div>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        {params.error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Invalid email or password.</p>
        )}

        <div>
          <Label>Email</Label>
          <Input name="email" type="email" required />
        </div>

        <div>
          <Label>Password</Label>
          <Input name="password" type="password" required />
        </div>

        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}
