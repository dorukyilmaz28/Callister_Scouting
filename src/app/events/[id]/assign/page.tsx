"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type User = { id: string; name: string; role: string };
type Team = { id: string; number: number };
type Assignment = { userId: string; teamId: string; team: { number: number }; user?: { name: string } };

export default function AssignPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/events/${eventId}/teams`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/events/${eventId}/assignments`).then((r) => (r.ok ? r.json() : [])),
    ]).then(([u, t, a]) => {
      setUsers(u.filter((x: User) => x.role === "scout"));
      setTeams(t);
      setAssignments(a);
      setLoading(false);
    });
  }, [eventId]);

  useEffect(() => {
    if (!selectedUser) {
      setSelectedTeams([]);
      return;
    }
    const userAssignments = assignments.filter((a) => a.userId === selectedUser);
    setSelectedTeams(userAssignments.map((a) => a.teamId));
  }, [selectedUser, assignments]);

  function toggleTeam(teamId: string) {
    setSelectedTeams((prev) => {
      if (prev.includes(teamId)) {
        const next = prev.filter((id) => id !== teamId);
        return next.length <= 2 ? next : prev;
      }
      if (prev.length >= 2) return prev;
      return [...prev, teamId];
    });
  }

  async function save() {
    if (!selectedUser || selectedTeams.length !== 2) {
      setMessage({ type: "err", text: "Bir scout ve tam 2 takım seçin." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          userId: selectedUser,
          teamIds: selectedTeams,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Kayıt başarısız" });
        return;
      }
      const updated = await fetch(`/api/events/${eventId}/assignments`).then((r) => r.json());
      setAssignments(updated);
      setMessage({ type: "ok", text: "Kaydedildi. Scout'a tam 2 takım atandı." });
    } catch {
      setMessage({ type: "err", text: "Bağlantı hatası" });
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
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Scout’lara takım ata</h1>
      <p className="text-gray-600 text-sm">
        Her scout’a bu etkinlik için tam 2 takım atanmalı.
      </p>

      <div className="card p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Scout</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full py-3 px-4 text-lg rounded-lg border border-gray-300"
        >
          <option value="">Scout seçin</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <div className="card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Takımlar (tam 2 seçin)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTeam(t.id)}
                className={`py-3 px-4 text-base font-medium rounded-lg border-2 ${
                  selectedTeams.includes(t.id)
                    ? "border-[#6366f1] bg-[#eef2ff] text-[#4338ca]"
                    : "border-[#c7d2fe] bg-[#e0e7ff] text-[#1e1b4b]"
                }`}
              >
                {t.number}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Seçili: {selectedTeams.length}/2
          </p>
        </div>
      )}

      {message && (
        <p className={message.type === "ok" ? "text-green-600 font-medium" : "text-red-600"}>
          {message.text}
        </p>
      )}
      <button
        type="button"
        onClick={save}
        disabled={saving || !selectedUser || selectedTeams.length !== 2}
        className="w-full py-4 text-lg font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Kaydediliyor…" : "Atamayı kaydet"}
      </button>

      <div className="card p-4">
        <h2 className="font-semibold text-gray-900 mb-2">Mevcut atamalar</h2>
        {assignments.length === 0 ? (
          <p className="text-gray-500 text-sm">Henüz yok.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {Object.entries(
              assignments.reduce(
                (acc, a) => {
                  const key = a.user?.name ?? users.find((x) => x.id === a.userId)?.name ?? a.userId;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(a.team.number);
                  return acc;
                },
                {} as Record<string, number[]>
              )
            ).map(([name, nums]) => (
              <li key={name}>
                <strong>{name}</strong>: {nums.join(", ")}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
