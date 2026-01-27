"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type DashboardTeam = { teamId: string; teamNumber: number; pitDone: boolean; matchCount: number };
type User = { name: string; role: string };

export default function EventAnaSayfa() {
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<DashboardTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${id}/dashboard`)
      .then((r) => (r.ok ? r.json() : { teams: [], user: null, eventName: null }))
      .then((dash) => {
        setUser(dash.user ?? null);
        setTeams(dash.teams ?? []);
        setEventName(dash.eventName ?? null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center min-h-[60vh]">
        <p className="text-[#f0f0f5]">Yükleniyor…</p>
      </div>
    );
  }

  const roleLabel = user?.role === "admin" ? "Yönetici" : user?.role === "strategy" ? "Strateji" : "Scout";

  return (
    <div className="app-shell pt-4">
      <header className="mb-6">
        <p className="text-[#f0f0f0] text-sm mb-0.5">
          👤 {user?.name ?? "—"} ({roleLabel})
        </p>
        {eventName && (
          <p className="text-[#f0f0f0]/70 text-sm">{eventName}</p>
        )}
      </header>

      <h2 className="text-lg font-semibold text-[#f0f0f0] mb-4">Atanan Takımlar</h2>

      {teams.length === 0 ? (
        <div className="card p-5 mb-4">
          <p className="text-[#1a1a2e]/80 text-center">
            Henüz takım atanmadı. Yönetici size takım atayana kadar bekleyin.
          </p>
          {(user?.role === "admin" || user?.role === "strategy") && (
            <Link
              href={`/events/${id}/assign`}
              className="btn-primary mt-4 inline-block text-center"
            >
              Scout ata
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {teams.map((t) => (
            <Link
              key={t.teamId}
              href={`/events/${id}/pit?teamId=${t.teamId}`}
              className="block"
            >
              <div className="card p-4 flex items-center justify-between gap-3 min-h-[56px]">
                <div>
                  <span className="font-semibold text-[#1a1a2e]">Team {t.teamNumber}</span>
                  <p className="text-sm text-[#1a1a2e]/70 mt-0.5">
                    Pit {t.pitDone ? "✔" : "❌"} · Match {t.matchCount}
                  </p>
                </div>
                <span className="text-[#1a1a2e]/50">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link
        href={`/events/${id}/match`}
        className="card p-4 flex items-center justify-center gap-2 min-h-[52px] border-2 border-dashed border-[#6366f1]/50 text-[#6366f1] font-medium mb-4 hover:border-[#6366f1]/70 hover:bg-[#eef2ff]/80 transition-colors"
      >
        ➕ Yeni Match Girişi
      </Link>

      {(user?.role === "admin" || user?.role === "strategy") && (
        <div className="card p-4 space-y-2 mt-4">
          <Link
            href={`/events/${id}/assign`}
            className="block py-2 text-[#1a1a2e] font-medium"
          >
            Scout atama
          </Link>
          <Link
            href={`/events/${id}/export`}
            className="block py-2 text-[#1a1a2e] font-medium"
          >
            📤 Dışa aktar
          </Link>
          <Link
            href={`/events/${id}/teams`}
            className="block py-2 text-[#1a1a2e] font-medium"
          >
            Tüm takımlar
          </Link>
        </div>
      )}
    </div>
  );
}
