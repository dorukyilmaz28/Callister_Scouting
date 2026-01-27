"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewEventPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [teamList, setTeamList] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        if (d.user?.role !== "admin") router.replace("/events");
      })
      .catch(() => router.replace("/events"))
      .finally(() => setLoading(false));
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const teamNumbers = teamList
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code: code.trim(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          teamNumbers: teamNumbers.length ? teamNumbers : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Etkinlik oluşturulamadı");
        return;
      }
      router.push(`/events/${data.id}`);
      router.refresh();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-600">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Etkinlik oluştur</h1>
      <Link href="/events" className="text-sm text-blue-600 hover:underline">
        ← Etkinliklere dön
      </Link>
      <form onSubmit={submit} className="card p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">İsim</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full py-3 px-4 rounded-lg border border-gray-300"
            placeholder="Örn: 2026 Bölge Şampiyonası"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kod</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full py-3 px-4 rounded-lg border border-gray-300"
            placeholder="Örn: 2026txcmp"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç tarihi</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full py-3 px-4 rounded-lg border border-gray-300"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full py-3 px-4 rounded-lg border border-gray-300"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Takım numaraları (isteğe bağlı, virgül veya boşlukla ayrılmış)
          </label>
          <textarea
            value={teamList}
            onChange={(e) => setTeamList(e.target.value)}
            rows={3}
            className="w-full py-3 px-4 rounded-lg border border-gray-300"
            placeholder="Örn: 1234, 5678, 9012"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 text-lg font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Oluşturuluyor…" : "Etkinlik oluştur"}
        </button>
      </form>
    </div>
  );
}
