"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [teamNumber, setTeamNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim(),
          teamNumber: teamNumber.trim() ? parseInt(teamNumber, 10) : undefined,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kayıt başarısız");
        return;
      }
      router.push("/login");
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
          <h1 className="text-2xl font-bold text-center text-[#e0e7ff] mb-1">
            Hesap oluştur
          </h1>
          <p className="text-center text-[#e0e7ff]/80 text-sm mb-6">
            E-posta, ad soyad ve takım numaranızla kayıt olun
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#e0e7ff] mb-1.5">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@takim9024.org"
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-[#e0e7ff] mb-1.5">
                Ad soyad
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Adınız Soyadınız"
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="teamNumber" className="block text-sm font-medium text-[#e0e7ff] mb-1.5">
                Takım numarası
              </label>
              <input
                id="teamNumber"
                type="number"
                min={1}
                max={99999}
                value={teamNumber}
                onChange={(e) => setTeamNumber(e.target.value)}
                placeholder="9024"
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#e0e7ff] mb-1.5">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                className="input-field"
                required
                minLength={4}
              />
            </div>
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-base w-full"
            >
              {loading ? "Kaydediliyor…" : "Kayıt ol"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-[#e0e7ff]/60">
            Zaten hesabınız var mı?{" "}
            <Link href="/login" className="text-[#818cf8] hover:underline">
              Giriş yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
