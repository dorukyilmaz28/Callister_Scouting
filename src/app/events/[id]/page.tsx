"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type DashboardTeam = { teamId: string; teamNumber: number; pitDone: boolean; matchCount: number };
type EventTeam = { id: string; number: number };
type User = { name?: string | null; fullName?: string | null; role: string };

export default function EventAnaSayfa() {
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<DashboardTeam[]>([]);
  const [eventTeams, setEventTeams] = useState<EventTeam[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [myAssignSaving, setMyAssignSaving] = useState(false);
  const [myAssignMsg, setMyAssignMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${id}/dashboard`).then((r) => (r.ok ? r.json() : { teams: [], user: null, eventName: null })),
      fetch(`/api/events/${id}/teams`).then((r) => (r.ok ? r.json() : [])),
    ]).then(([dash, allTeams]) => {
      setUser(dash.user ?? null);
      setTeams(dash.teams ?? []);
      setEventName(dash.eventName ?? null);
      setEventTeams(Array.isArray(allTeams) ? allTeams : []);
      setSelectedTeamIds((dash.teams ?? []).map((t: DashboardTeam) => t.teamId));
      setLoading(false);
    });
  }, [id]);

  function toggleMyTeam(teamId: string) {
    setSelectedTeamIds((prev) => {
      if (prev.includes(teamId)) return prev.filter((id) => id !== teamId);
      if (prev.length >= 2) return prev;
      return [...prev, teamId];
    });
  }

  function saveMyAssignments() {
    setMyAssignMsg(null);
    setMyAssignSaving(true);
    fetch(`/api/events/${id}/my-assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamIds: selectedTeamIds }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.error ?? "Kaydedilemedi")));
        return r.json();
      })
      .then(() => {
        setMyAssignMsg({ ok: true, text: "Kaydedildi." });
        return fetch(`/api/events/${id}/dashboard`).then((r) => (r.ok ? r.json() : { teams: [] }));
      })
      .then((dash) => {
        if (dash?.teams) setTeams(dash.teams);
      })
      .catch((err) => setMyAssignMsg({ ok: false, text: err.message ?? "Kaydedilemedi" }))
      .finally(() => setMyAssignSaving(false));
  }

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
          👤 {user?.fullName ?? user?.name ?? "—"} ({roleLabel})
        </p>
        {eventName && (
          <p className="text-[#f0f0f0]/70 text-sm">{eventName}</p>
        )}
      </header>

      {user?.role === "scout" && eventTeams.length > 0 && (
        <div className="card p-4 mb-6">
          <h2 className="font-semibold text-[#e0e7ff] mb-2">Scout yapacağım takımları seç (en fazla 2)</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {eventTeams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleMyTeam(t.id)}
                className={`py-2 px-4 rounded-lg font-medium ${
                  selectedTeamIds.includes(t.id)
                    ? "bg-[#6366f1] text-white"
                    : "bg-[#374151] text-[#e0e7ff]/80"
                }`}
              >
                {t.number}
              </button>
            ))}
          </div>
          <p className="text-sm text-[#e0e7ff]/70 mb-2">Seçili: {selectedTeamIds.length}/2</p>
          {myAssignMsg && (
            <p className={myAssignMsg.ok ? "text-green-500 text-sm" : "text-red-500 text-sm"}>{myAssignMsg.text}</p>
          )}
          <button
            type="button"
            onClick={saveMyAssignments}
            disabled={myAssignSaving || selectedTeamIds.length > 2}
            className="btn-primary"
          >
            {myAssignSaving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      )}

      <h2 className="text-lg font-semibold text-[#f0f0f0] mb-4">Atanan Takımlar</h2>

      {teams.length === 0 ? (
        <div className="card p-5 mb-4">
          <p className="text-[#e0e7ff]/90 text-center">
            Henüz takım atanmadı. Yukarıdan seçin veya yönetici atasın.
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
                  <span className="font-semibold text-[#e0e7ff]">Team {t.teamNumber}</span>
                  <p className="text-sm text-[#e0e7ff]/85 mt-0.5">
                    Pit {t.pitDone ? "✔" : "❌"} · Match {t.matchCount}
                  </p>
                </div>
                <span className="text-[#e0e7ff]/50">→</span>
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
            className="block py-2 text-[#e0e7ff] font-medium"
          >
            Scout atama
          </Link>
          <Link
            href={`/events/${id}/export`}
            className="block py-2 text-[#e0e7ff] font-medium"
          >
            📤 Dışa aktar
          </Link>
          <Link
            href={`/events/${id}/teams`}
            className="block py-2 text-[#e0e7ff] font-medium"
          >
            Tüm takımlar
          </Link>
        </div>
      )}
    </div>
  );
}
