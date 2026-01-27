"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MATCH_TYPE_OPTIONS } from "@/lib/constants";

export default function NewMatchPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [matchNumber, setMatchNumber] = useState("");
  const [matchType, setMatchType] = useState("qual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        if (d.user?.role !== "admin") router.replace(`/events/${eventId}`);
      })
      .catch(() => router.replace(`/events/${eventId}`))
      .finally(() => setLoading(false));
  }, [eventId, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/events/" + eventId + "/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          matchNumber: parseInt(matchNumber, 10),
          matchType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Maç eklenemedi");
        return;
      }
      router.push(`/events/${eventId}`);
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
      <h1 className="text-xl font-bold text-gray-900">Maç ekle</h1>
      <Link href={`/events/${eventId}`} className="text-sm text-blue-600 hover:underline">
        ← Etkinliğe dön
      </Link>
      <form onSubmit={submit} className="card p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Maç numarası</label>
          <input
            type="number"
            min={1}
            value={matchNumber}
            onChange={(e) => setMatchNumber(e.target.value)}
            className="w-full py-3 px-4 rounded-lg border border-gray-300"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Maç tipi</label>
          <div className="flex gap-2">
            {MATCH_TYPE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setMatchType(o.value)}
                className={`py-3 px-4 font-medium rounded-lg border-2 ${
                  matchType === o.value
                    ? "border-[#6366f1] bg-[#eef2ff] text-[#4338ca]"
                    : "border-[#c7d2fe] bg-[#e0e7ff] text-[#1e1b4b]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 text-lg font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Ekleniyor…" : "Maç ekle"}
        </button>
      </form>
    </div>
  );
}
