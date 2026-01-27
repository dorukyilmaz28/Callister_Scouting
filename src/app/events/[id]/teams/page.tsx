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

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}/teams`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/events/${eventId}/assignments`).then((r) => (r.ok ? r.json() : [])),
    ]).then(([allTeams, assignments]) => {
      const assignmentTeamIds = (assignments as Assignment[]).map((a) => a.teamId);
      const mine = assignmentTeamIds.length > 0
        ? (allTeams as Team[]).filter((t) => assignmentTeamIds.includes(t.id))
        : (allTeams as Team[]);
      setTeams(mine);
      setLoading(false);
    });
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-600">Takımlar yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Takımlar</h1>
      {teams.length === 0 ? (
        <p className="text-gray-600">Bu etkinlikte takım yok.</p>
      ) : (
        <ul className="space-y-2">
          {teams.map((t) => (
            <li key={t.id}>
              <Link
                href={`/events/${eventId}/teams/${t.id}`}
                className="block card p-4 hover:border-[#6366f1]/60 transition-colors"
              >
                <span className="font-semibold text-gray-900">{t.number}</span>
                {t.name && (
                  <span className="text-gray-600 ml-2">{t.name}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
