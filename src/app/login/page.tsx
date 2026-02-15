"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/events";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Giriş başarısız");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#0f0f23]">
      <div className="w-full max-w-[400px] mx-auto">
        <div className="card p-6 mb-6 shadow-xl">
          <p className="hero-tagline text-[#e0e7ff]/70 text-center mb-1">Callister 9024</p>
          <h1 className="text-xl font-bold text-center text-[#e0e7ff] mb-0.5">
            FRC Scouting 2026
          </h1>
          <p className="text-center text-[#e0e7ff]/60 text-sm mb-6">Giriş yapın</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#e0e7ff] mb-1.5">
                İsim / ID
              </label>
              <input
                id="name"
                type="text"
                autoComplete="username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: DORUK"
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#e0e7ff] mb-1.5">
                Şifre (4 haneli)
              </label>
              <input
                id="password"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                maxLength={4}
                pattern="[0-9]{4}"
                className="input-field"
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-base"
            >
              {loading ? "Giriş yapılıyor…" : "Giriş yap"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-[#e0e7ff]/60">Yarışmaya hazır.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e]">
          <p className="text-[#f0f0f5]">Yükleniyor…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
