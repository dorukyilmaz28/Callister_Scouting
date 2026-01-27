"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Event = {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  eventTeams: { team: { number: number } }[];
  _count?: { matches: number };
};

type User = { role: string };

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user ?? null));
  }, []);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setEvents)
      .catch(() => setError("Etkinlikler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center min-h-[60vh]">
        <p className="text-[#f0f0f0]">Yükleniyor…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="app-shell pt-4">
        <div className="card p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell pt-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <h1 className="text-lg font-semibold text-[#f0f0f0]">Etkinlikler</h1>
        {user?.role === "admin" && (
          <Link
            href="/events/new"
            className="py-3 px-4 text-sm font-medium rounded-lg bg-[#3b82f6] text-white hover:bg-[#2563eb]"
          >
            Etkinlik oluştur
          </Link>
        )}
      </div>
      {events.length === 0 ? (
        <div className="card p-5">
          <p className="text-[#1a1a2e]/80">Henüz etkinlik yok. Yönetici oluşturabilir.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li key={ev.id}>
              <Link href={`/events/${ev.id}`} className="block">
                <div className="card p-4 hover:border-[#3b82f6]/50">
                  <div className="font-semibold text-[#1a1a2e]">{ev.name}</div>
                  <div className="text-sm text-[#1a1a2e]/70 mt-0.5">
                    {ev.code} · {ev.eventTeams?.length ?? 0} takım
                    {ev._count?.matches != null && ` · ${ev._count.matches} maç`}
                  </div>
                  <div className="text-xs text-[#1a1a2e]/50 mt-1">
                    {new Date(ev.startDate).toLocaleDateString("tr-TR")} –{" "}
                    {new Date(ev.endDate).toLocaleDateString("tr-TR")}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
