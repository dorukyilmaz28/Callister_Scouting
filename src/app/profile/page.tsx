"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ProfileData = {
  user: { fullName?: string | null; name?: string | null; email?: string | null; teamNumber?: number | null; role: string };
  totalMatchScouts: number;
  totalPitScouts: number;
  byEvent: { eventId: string; eventName: string; matchCount: number; pitCount: number }[];
};

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => {
        if (!r.ok) throw new Error("Yüklenemedi");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Profil yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center min-h-[60vh]">
        <p className="text-[#f0f0f0]">Yükleniyor…</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="app-shell pt-4">
        <div className="card p-5">
          <p className="text-red-500">{error || "Veri yok"}</p>
          <Link href="/events" className="text-[#3b82f6] mt-2 inline-block">← Etkinlikler</Link>
        </div>
      </div>
    );
  }

  const roleLabel = data.user.role === "admin" ? "Yönetici" : data.user.role === "strategy" ? "Strateji" : "Scout";

  return (
    <div className="app-shell pt-4">
      <header className="mb-6 flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-semibold text-[#f0f0f0]">Profil</h1>
        <Link
          href="/events"
          className="text-sm text-[#e0e7ff]/80 hover:text-[#e0e7ff]"
        >
          ← Etkinlikler
        </Link>
      </header>

      <div className="card p-4 mb-6">
        <h2 className="font-semibold text-[#e0e7ff] text-sm mb-3">Hesap</h2>
        <p className="text-[#e0e7ff]">
          {data.user.fullName ?? data.user.name ?? "—"}
        </p>
        {data.user.email && (
          <p className="text-[#e0e7ff]/80 text-sm mt-0.5">{data.user.email}</p>
        )}
        {data.user.teamNumber != null && (
          <p className="text-[#e0e7ff]/80 text-sm">Takım #{data.user.teamNumber}</p>
        )}
        <p className="text-[#e0e7ff]/70 text-sm mt-1">{roleLabel}</p>
      </div>

      <div className="card p-4 mb-6">
        <h2 className="font-semibold text-[#e0e7ff] text-sm mb-3">Özet</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-[#e0e7ff]">{data.totalMatchScouts}</p>
            <p className="text-sm text-[#e0e7ff]/70">Toplam maç scout</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#e0e7ff]">{data.totalPitScouts}</p>
            <p className="text-sm text-[#e0e7ff]/70">Toplam pit scout</p>
          </div>
        </div>
      </div>

      {data.byEvent.length > 0 ? (
        <div className="card p-4">
          <h2 className="font-semibold text-[#e0e7ff] text-sm mb-3">Etkinlik bazında</h2>
          <ul className="space-y-2">
            {data.byEvent.map((ev) => (
              <li key={ev.eventId}>
                <Link
                  href={`/events/${ev.eventId}`}
                  className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg hover:bg-[#2d2d44]/60 text-[#e0e7ff]"
                >
                  <span className="font-medium truncate">{ev.eventName}</span>
                  <span className="text-sm text-[#e0e7ff]/80 shrink-0">
                    {ev.matchCount} maç · {ev.pitCount} pit
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card p-4">
          <p className="text-[#e0e7ff]/70 text-sm">Henüz etkinlik bazında kayıt yok.</p>
        </div>
      )}

      <div className="mt-6">
        <form action="/api/auth/logout" method="POST" className="inline">
          <button type="submit" className="text-sm text-[#e0e7ff]/70 hover:text-red-400">
            Çıkış yap
          </button>
        </form>
      </div>
    </div>
  );
}
