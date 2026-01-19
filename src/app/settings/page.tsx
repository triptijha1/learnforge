import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import SignOutButton from "@/components/SignOutButton";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  // 🔐 Protect route
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6 space-y-10">
        {/* HEADER */}
        <h1 className="text-4xl font-bold">Settings</h1>

        {/* ================= ACCOUNT ================= */}
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Account</h2>

          <div className="flex items-center gap-5">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "User"}
                width={64}
                height={64}
                className="rounded-full"
              />
            )}

            <div>
              <p className="font-medium">
                {session.user.name ?? "User"}
              </p>
              <p className="text-sm text-muted-foreground">
                {session.user.email}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Signed in with Google
              </p>
            </div>
          </div>
        </section>

        {/* ================= CREDITS ================= */}
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">
            Credits & Plan
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                Credits remaining:{" "}
                <span className="text-primary">
                  {session.user.credits}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Current plan: Free
              </p>
            </div>

            <button
              disabled
              className="rounded-lg border px-4 py-2 text-sm font-medium opacity-60 cursor-not-allowed"
            >
              Upgrade Plan
            </button>
          </div>
        </section>

        {/* ================= PREFERENCES ================= */}
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">
            Preferences
          </h2>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Theme
            </p>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Preferred content language
            </p>
            <span className="text-sm font-medium">
              English (EN)
            </span>
          </div>
        </section>

        {/* ================= SECURITY ================= */}
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">
            Security
          </h2>

          <SignOutButton />
        </section>
      </div>
    </div>
  );
}
