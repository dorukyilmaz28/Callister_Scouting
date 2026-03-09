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

type TBAEvent = { key: string; name: string; start_date?: string };

type User = { role: string };

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tbaOpen, setTbaOpen] = useState(false);
  const [tbaSearch, setTbaSearch] = useState("");
  const [tbaEventsAll, setTbaEventsAll] = useState<TBAEvent[]>([]);
  const [tbaLoading, setTbaLoading] = useState(false);
  const [tbaAdding, setTbaAdding] = useState(false);
  const [tbaError, setTbaError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const tbaEvents = tbaSearch.trim()
    ? tbaEventsAll.filter(
        (ev) =>
          ev.name.toLowerCase().includes(tbaSearch.toLowerCase()) ||
          ev.key.toLowerCase().includes(tbaSearch.toLowerCase())
      )
    : tbaEventsAll;

  function loadEvents() {
    return fetch("/api/events")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setEvents);
  }

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user ?? null));
  }, []);

  useEffect(() => {
    loadEvents()
      .catch(() => setError("Etkinlikler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  function loadTbaEvents() {
    setTbaError("");
    setTbaLoading(true);
    // TBA 2026 sabit
    fetch(`/api/tba/events?year=2026`)
      .then((r) => {
        if (!r.ok) throw new Error("TBA listesi alınamadı");
        return r.json();
      })
      .then(setTbaEventsAll)
      .catch(() => setTbaError("TBA etkinlikleri yüklenemedi. API key kontrol edin."))
      .finally(() => setTbaLoading(false));
  }

  function deleteEvent(ev: Event, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`"${ev.name}" etkinliğini silmek istediğinize emin misiniz? Tüm maç ve scout verileri silinecektir.`)) return;
    setDeletingId(ev.id);
    fetch(`/api/events/${ev.id}`, { method: "DELETE" })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d?.error ?? "Silinemedi")));
        setEvents((prev) => prev.filter((e) => e.id !== ev.id));
      })
      .catch((err) => {
        setTbaError(err.message ?? "Etkinlik silinemedi.");
      })
      .finally(() => setDeletingId(null));
  }

  function addFromTba(eventKey: string) {
    setTbaError("");
    setTbaAdding(true);
    fetch("/api/events/from-tba", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventKey }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.error ?? "Eklenemedi")));
        return r.json();
      })
      .then((added) => {
        setEvents((prev) => [added, ...prev]);
        setTbaOpen(false);
      })
      .catch((err) => setTbaError(err.message ?? "Etkinlik eklenemedi"))
      .finally(() => setTbaAdding(false));
  }

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
        <div className="flex items-center gap-3">
          <Link
            href="/team-feed"
            className="text-sm text-[#e0e7ff]/90 hover:text-[#e0e7ff] font-medium"
          >
            Takım sohbeti
          </Link>
          <Link
            href="/profile"
            className="text-sm text-[#e0e7ff]/90 hover:text-[#e0e7ff] font-medium"
          >
            Profil
          </Link>
          <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setTbaOpen(true); setTbaEventsAll([]); setTbaSearch(""); setTbaError(""); }}
            className="py-3 px-4 text-sm font-medium rounded-lg bg-[#6366f1] text-white hover:bg-[#4f46e5]"
          >
            TBA&apos;dan regional ekle
          </button>
          {user?.role === "admin" && (
            <Link
              href="/events/new"
              className="py-3 px-4 text-sm font-medium rounded-lg bg-[#3b82f6] text-white hover:bg-[#2563eb]"
            >
              Etkinlik oluştur
            </Link>
          )}
          </div>
        </div>
      </div>

      {tbaOpen && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold text-[#e0e7ff] mb-2">Blue Alliance&apos;dan etkinlik seç</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <input
              type="text"
              value={tbaSearch}
              onChange={(e) => setTbaSearch(e.target.value)}
              placeholder="Bölge veya etkinlik ara (örn. Ankara, milac)"
              className="input-field flex-1 min-w-[140px]"
            />
            <button
              type="button"
              onClick={loadTbaEvents}
              disabled={tbaLoading}
              className="btn-primary"
            >
              {tbaLoading ? "Yükleniyor…" : "Listele"}
            </button>
            <button
              type="button"
              onClick={() => setTbaOpen(false)}
              className="py-2 px-4 rounded-lg border border-[#4b5563] text-[#e0e7ff]"
            >
              Kapat
            </button>
          </div>
          {tbaError && <p className="text-red-500 text-sm mb-2">{tbaError}</p>}
          {tbaEventsAll.length === 0 && !tbaLoading && (
            <p className="text-[#e0e7ff]/70 text-sm mb-2">Listele ile 2026 etkinliklerini getirin.</p>
          )}
          {tbaEventsAll.length > 0 && !tbaLoading && (
            <p className="text-[#e0e7ff]/70 text-sm mb-2">
              {tbaSearch.trim() ? `${tbaEvents.length} sonuç (toplam ${tbaEventsAll.length})` : `${tbaEventsAll.length} etkinlik — aşağı kaydırın`}
            </p>
          )}
          {tbaEventsAll.length > 0 && tbaSearch.trim() && tbaEvents.length === 0 && (
            <p className="text-[#e0e7ff]/70 text-sm mb-2">Aramanıza uygun etkinlik yok. Farklı bir kelime deneyin.</p>
          )}
          {tbaEvents.length > 0 && (
            <ul className="max-h-[70vh] overflow-y-auto space-y-1 pr-1">
              {tbaEvents.map((ev) => (
                <li key={ev.key}>
                  <button
                    type="button"
                    onClick={() => addFromTba(ev.key)}
                    disabled={tbaAdding}
                    className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#3730a3]/40 text-[#e0e7ff]"
                  >
                    {ev.name} ({ev.key})
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <div className="card p-5">
          <p className="text-[#e0e7ff]/90">Henüz etkinlik yok. TBA&apos;dan ekleyin veya yönetici oluştursun.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li key={ev.id}>
              <div className="card p-4 hover:border-[#3b82f6]/50 flex items-start justify-between gap-3">
                <Link href={`/events/${ev.id}`} className="flex-1 min-w-0">
                  <div className="font-semibold text-[#e0e7ff]">{ev.name}</div>
                  <div className="text-sm text-[#e0e7ff]/85 mt-0.5">
                    {ev.code} · {ev.eventTeams?.length ?? 0} takım
                    {ev._count?.matches != null && ` · ${ev._count.matches} maç`}
                  </div>
                  <div className="text-xs text-[#e0e7ff]/50 mt-1">
                    {new Date(ev.startDate).toLocaleDateString("tr-TR")} –{" "}
                    {new Date(ev.endDate).toLocaleDateString("tr-TR")}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={(e) => deleteEvent(ev, e)}
                  disabled={deletingId === ev.id}
                  className="shrink-0 py-1.5 px-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  title="Etkinliği sil"
                >
                  {deletingId === ev.id ? "…" : "Sil"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
