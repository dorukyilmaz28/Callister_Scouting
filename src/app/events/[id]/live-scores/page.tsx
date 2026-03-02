"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type MatchScoreRow = {
  matchNumber?: number;
  redScore?: number;
  blueScore?: number;
  redAuto?: number;
  blueAuto?: number;
  redTeleop?: number;
  blueTeleop?: number;
  redEndGame?: number;
  blueEndGame?: number;
  [key: string]: unknown;
};

function normalizeMatchScores(data: unknown): MatchScoreRow[] {
  if (Array.isArray(data)) return data as MatchScoreRow[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.MatchScores)) return o.MatchScores as MatchScoreRow[];
    if (Array.isArray(o.matchScores)) return o.matchScores as MatchScoreRow[];
    if (Array.isArray(o.matches)) return o.matches as MatchScoreRow[];
    if (Array.isArray(o.Matches)) return o.Matches as MatchScoreRow[];
  }
  return [];
}

export default function LiveScoresPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchScoreRow[]>([]);
  const [schedule, setSchedule] = useState<unknown>(null);
  const [rankings, setRankings] = useState<unknown>(null);
  const [activeTab, setActiveTab] = useState<"scores" | "schedule" | "rankings">("scores");

  function loadMatchResults() {
    setError(null);
    setLoading(true);
    fetch(`/api/events/${eventId}/frc/match-results`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d?.error ?? "Yüklenemedi")));
        return r.json();
      })
      .then((data) => {
        setMatches(normalizeMatchScores(data));
      })
      .catch((e) => setError(e?.message ?? "Maç sonuçları alınamadı"))
      .finally(() => setLoading(false));
  }

  function loadSchedule() {
    fetch(`/api/events/${eventId}/frc/schedule`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setSchedule)
      .catch(() => setSchedule(null));
  }

  function loadRankings() {
    fetch(`/api/events/${eventId}/frc/rankings`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setRankings)
      .catch(() => setRankings(null));
  }

  useEffect(() => {
    loadMatchResults();
    loadSchedule();
    loadRankings();
  }, [eventId]);

  return (
    <div className="app-shell pt-4 pb-8">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h1 className="text-xl font-bold text-[#f0f0f5]">Canlı Skorlar</h1>
        <button
          type="button"
          onClick={loadMatchResults}
          disabled={loading}
          className="py-2 px-4 rounded-xl bg-white/10 text-[#e0e7ff] text-sm font-medium hover:bg-white/15 disabled:opacity-60"
        >
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>
      <p className="text-sm text-[#e0e7ff]/70 mb-4">
        FRC Events API (FMS) üzerinden resmi maç sonuçları. Etkinlik henüz başlamadıysa veya FMS senkron yapmadıysa veri görünmeyebilir.
      </p>

      <div className="flex gap-2 mb-4">
        {(["scores", "schedule", "rankings"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-[#6366f1] text-white"
                : "bg-white/10 text-[#e0e7ff] hover:bg-white/15"
            }`}
          >
            {tab === "scores" ? "Skorlar" : tab === "schedule" ? "Program" : "Sıralama"}
          </button>
        ))}
      </div>

      {error && (
        <div className="card p-4 mb-4 border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-[#e0e7ff]/60 text-xs mt-1">
            FRC Events API token için .env içinde FRC_EVENTS_API_USER ve FRC_EVENTS_API_KEY tanımlayın.
          </p>
        </div>
      )}

      {activeTab === "scores" && (
        <>
          {loading && matches.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-[#e0e7ff]/70">Yükleniyor…</p>
            </div>
          ) : matches.length === 0 && !error ? (
            <div className="card p-8 text-center">
              <p className="text-[#e0e7ff]/70">
                Henüz maç sonucu yok veya etkinlik kodu FRC API ile eşleşmiyor.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {matches.map((m, i) => {
                const num = m.matchNumber ?? (m["match number"] as number | undefined) ?? i + 1;
                const red = m.redScore ?? m.redAuto ?? 0;
                const blue = m.blueScore ?? m.blueAuto ?? 0;
                const redDisplay = typeof red === "number" ? red : "—";
                const blueDisplay = typeof blue === "number" ? blue : "—";
                const winner =
                  typeof red === "number" && typeof blue === "number"
                    ? red > blue
                      ? "Kırmızı"
                      : blue > red
                        ? "Mavi"
                        : "Berabere"
                    : null;
                return (
                  <li key={`${num}-${i}`}>
                    <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
                      <span className="font-semibold text-[#e0e7ff]">Maç {num}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-red-400 font-medium">{redDisplay}</span>
                        <span className="text-[#e0e7ff]/50">–</span>
                        <span className="text-blue-400 font-medium">{blueDisplay}</span>
                      </div>
                      {winner && (
                        <span
                          className={`text-xs font-medium ${
                            winner === "Kırmızı"
                              ? "text-red-400"
                              : winner === "Mavi"
                                ? "text-blue-400"
                                : "text-[#e0e7ff]/70"
                          }`}
                        >
                          {winner}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {activeTab === "schedule" && (
        <div className="card p-4">
          {schedule != null ? (
            <pre className="text-xs text-[#e0e7ff]/80 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(schedule, null, 2).slice(0, 3000)}
              {JSON.stringify(schedule).length > 3000 ? "…" : ""}
            </pre>
          ) : (
            <p className="text-[#e0e7ff]/60 text-sm">Program yüklenemedi veya boş.</p>
          )}
        </div>
      )}

      {activeTab === "rankings" && (
        <div className="card p-4">
          {rankings != null ? (
            <pre className="text-xs text-[#e0e7ff]/80 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(rankings, null, 2).slice(0, 3000)}
              {JSON.stringify(rankings).length > 3000 ? "…" : ""}
            </pre>
          ) : (
            <p className="text-[#e0e7ff]/60 text-sm">Sıralama yüklenemedi veya boş.</p>
          )}
        </div>
      )}

      <div className="mt-6">
        <Link
          href={`/events/${eventId}`}
          className="text-[#6366f1] text-sm font-medium hover:underline"
        >
          ← Etkinlik ana sayfası
        </Link>
      </div>
    </div>
  );
}
