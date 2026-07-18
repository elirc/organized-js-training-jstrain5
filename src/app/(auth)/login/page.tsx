"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid credentials.");
      return;
    }

    window.location.href = result?.url ?? "/dashboard";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900/80 p-6 text-slate-100 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.18em] text-blue-300">NovaCom Internal</p>
        <h1 className="mt-2 text-2xl font-bold">OpsForge Access</h1>
        <p className="mt-1 text-sm text-slate-300">
          SSO-style entry for authorized operators only.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide">
              Work Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="alex@novacom.internal"
              className="h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 text-sm outline-none ring-blue-400 focus:ring-1"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="password123"
              className="h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 text-sm outline-none ring-blue-400 focus:ring-1"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 w-full rounded-md bg-blue-500 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-4 rounded-md border border-slate-700 bg-slate-800 p-3 text-xs text-slate-300">
          Demo credentials: any seeded operator email + <code>password123</code>.
        </div>
        <Link href="/dashboard" className="mt-4 block text-center text-xs text-blue-300 hover:text-blue-200">
          Continue to dashboard (dev mode)
        </Link>
      </div>
    </div>
  );
}
