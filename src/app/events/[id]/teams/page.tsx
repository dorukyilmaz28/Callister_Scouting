"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Team = { id: string; number: number; name: string | null };
type Assignment = { teamId: string };

export default function TeamsListPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScout, setIsScout] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}/teams`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/events/${eventId}/assignments`).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/auth/me").then((r) => r.json().then((d) => d.user?.role === "scout")),
    ]).then(([allTeams, assignments, scout]) => {
      setIsScout(!!scout);
      const assignmentTeamIds = (assignments as Assignment[]).map((a) => a.teamId);
      const mine = assignmentTeamIds.length > 0
        ? (allTeams as Team[]).filter((t) => assignmentTeamIds.includes(t.id))
        : scout
          ? []
          : (allTeams as Team[]);
      setTeams(mine);
      setLoading(false);
    });
  }, [eventId]);

  if (loading) {
    return (
      <div className="app-shell flex justify-center py-12">
        <p className="text-[#e0e7ff]/80">Takımlar yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="app-shell pt-4">
      <h1 className="text-xl font-bold text-[#f0f0f0] mb-4">Takımlar · Verilere bak</h1>
      {teams.length === 0 ? (
        <div className="card p-5">
          {isScout ? (
            <p className="text-[#e0e7ff]/90">
              Scout yapacağınız takımlar henüz seçilmedi. Ana sayfadan &quot;Scout yapacağım takımları seç&quot; ile takımlarınızı seçin; burada sadece onların verilerini görebilirsiniz.
            </p>
          ) : (
            <p className="text-[#e0e7ff]/80">Bu etkinlikte takım yok.</p>
          )}
          {isScout && (
            <Link href={`/events/${eventId}`} className="text-[#3b82f6] mt-2 inline-block">← Ana sayfa</Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {teams.map((t) => (
            <li key={t.id}>
              <Link
                href={`/events/${eventId}/teams/${t.id}`}
                className="block card p-4 hover:border-[#6366f1]/60 transition-colors"
              >
                <span className="font-semibold text-[#e0e7ff]">Team {t.number}</span>
                {t.name ? (
                  <span className="text-[#e0e7ff]/85 ml-1"> – {t.name}</span>
                ) : null}
                <p className="text-sm text-[#e0e7ff]/60 mt-1">Verilere bak →</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
