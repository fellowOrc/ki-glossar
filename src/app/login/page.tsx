"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hinweis = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Benutzername oder Passwort ist falsch."
          : error.message
      );
      return;
    }
    router.push("/redaktion");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 sm:px-6 py-16">
      <p className="eyebrow mb-3">Redaktion</p>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Anmelden</h1>

      {hinweis && (
        <p className="text-sm text-danger bg-danger-soft border border-danger/30 rounded-lg px-4 py-3 mb-5">
          {hinweis}
        </p>
      )}

      <form onSubmit={handleSubmit} className="panel p-6 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="font-medium text-sm">Benutzername</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-medium text-sm">Passwort</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </label>

        {error && (
          <p className="text-sm text-danger bg-danger-soft border border-danger/30 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Anmelden …" : "Anmelden"}
        </button>
      </form>

      <p className="text-sm text-muted mt-6 leading-relaxed">
        Dieser Zugang ist der Redaktion vorbehalten. Möchtest du einen Begriff
        beisteuern?{" "}
        <Link href="/vorschlag" className="text-primary hover:underline">
          Hier vorschlagen
        </Link>{" "}
        – ganz ohne Konto.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
