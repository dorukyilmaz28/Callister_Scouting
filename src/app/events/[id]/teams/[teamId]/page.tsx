"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Summary = {
  team: { id: string; number: number; name: string | null };
  pit: {
    drivetrainType: string;
    robotType: string;
    intakeType: string | null;
    shooterType: string | null;
    climbCapability: string | null;
    climbSystemDescription: string | null;
    teamToldUs: string | null;
    scoutObservations: string | null;
  } | null;
  matchScouts: {
    match: { matchNumber: number; matchType: string };
    autoAttempted: boolean;
    autoScoreCount: number;
    autoConsistency: number | null;
    gamePieceCount: number;
    climbAttempted: boolean;
    climbSuccess: boolean;
    driverSkill: number | null;
    scoutComments: string | null;
  }[];
  summary: {
    matchCount: number;
    avgAutoScore: number | null;
    climbSuccessRate: number | null;
    avgDriverSkill: number | null;
    avgConsistency: number | null;
  };
};

export default function TeamSummaryPage() {
  const params = useParams();
  const eventId = params.id as string;
  const teamId = params.teamId as string;
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/${eventId}/teams/${teamId}/summary`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [eventId, teamId]);

  if (loading) {
    return (
      <div className="app-shell flex justify-center py-12">
        <p className="text-[#e0e7ff]/80">Yükleniyor…</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="app-shell pt-4">
        <div className="card p-5">
          <p className="text-red-400">Takım bulunamadı veya erişim yetkiniz yok.</p>
          <Link href={`/events/${eventId}/teams`} className="mt-3 inline-block text-[#6366f1] font-medium">
            Takımlara dön
          </Link>
        </div>
      </div>
    );
  }

  const { team, pit, matchScouts, summary } = data;

  return (
    <div className="app-shell pt-4 space-y-6">
      <div>
        <Link
          href={`/events/${eventId}/teams`}
          className="text-sm text-[#6366f1] hover:underline mb-2 inline-block"
        >
          ← Takımlara dön
        </Link>
        <h1 className="text-xl font-bold text-[#f0f0f0]">
          Team {team.number} {team.name ? `– ${team.name}` : ""}
        </h1>
        <p className="text-[#e0e7ff]/70 text-sm mt-0.5">Maç ve pit verileri</p>
      </div>

      <section className="card p-4">
        <h2 className="font-semibold text-[#e0e7ff] mb-3">Özet</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-[#e0e7ff]/60">Scout edilen maç sayısı</dt>
          <dd className="font-medium text-[#e0e7ff]">{summary.matchCount}</dd>
          <dt className="text-[#e0e7ff]/60">Ort. auto skor</dt>
          <dd className="font-medium text-[#e0e7ff]">{summary.avgAutoScore ?? "—"}</dd>
          <dt className="text-[#e0e7ff]/60">Tırmanma başarı oranı</dt>
          <dd className="font-medium text-[#e0e7ff]">
            {summary.climbSuccessRate != null ? `${(summary.climbSuccessRate * 100).toFixed(0)}%` : "—"}
          </dd>
          <dt className="text-[#e0e7ff]/60">Ort. sürücü becerisi</dt>
          <dd className="font-medium text-[#e0e7ff]">{summary.avgDriverSkill ?? "—"}</dd>
          <dt className="text-[#e0e7ff]/60">Ort. tutarlılık</dt>
          <dd className="font-medium text-[#e0e7ff]">{summary.avgConsistency ?? "—"}</dd>
        </dl>
      </section>

      {pit && (
        <section className="card p-4">
          <h2 className="font-semibold text-[#e0e7ff] mb-3">Pit scouting</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-[#e0e7ff]/60">Drivetrain</dt><dd className="font-medium text-[#e0e7ff]">{pit.drivetrainType}</dd></div>
            <div><dt className="text-[#e0e7ff]/60">Robot tipi</dt><dd className="font-medium text-[#e0e7ff]">{pit.robotType}</dd></div>
            {pit.intakeType && <div><dt className="text-[#e0e7ff]/60">Intake</dt><dd className="text-[#e0e7ff]">{pit.intakeType}</dd></div>}
            {pit.shooterType && <div><dt className="text-[#e0e7ff]/60">Shooter</dt><dd className="text-[#e0e7ff]">{pit.shooterType}</dd></div>}
            {pit.climbCapability && <div><dt className="text-[#e0e7ff]/60">Tırmanma (seviye)</dt><dd className="text-[#e0e7ff]">{pit.climbCapability}</dd></div>}
            {pit.climbSystemDescription && (
              <div><dt className="text-[#e0e7ff]/60">Tırmanma sistemi</dt><dd className="text-[#e0e7ff] whitespace-pre-wrap">{pit.climbSystemDescription}</dd></div>
            )}
            {pit.teamToldUs && (
              <div><dt className="text-[#e0e7ff]/60">Takımın söyledikleri</dt><dd className="text-[#e0e7ff] whitespace-pre-wrap">{pit.teamToldUs}</dd></div>
            )}
            {pit.scoutObservations && (
              <div><dt className="text-[#e0e7ff]/60">Scout gözlemleri</dt><dd className="text-[#e0e7ff] whitespace-pre-wrap">{pit.scoutObservations}</dd></div>
            )}
          </dl>
        </section>
      )}

      {matchScouts.length > 0 && (
        <section className="card p-4">
          <h2 className="font-semibold text-[#e0e7ff] mb-3">Match verisi</h2>
          <div className="space-y-3 overflow-x-auto">
            {matchScouts.map((ms, i) => (
              <div key={i} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                <div className="font-medium text-[#e0e7ff]">
                  {ms.match.matchType} {ms.match.matchNumber}
                </div>
                <div className="text-sm text-[#e0e7ff]/80 mt-1">
                  Auto: {ms.autoAttempted ? ms.autoScoreCount : "—"} · Teleop: {ms.gamePieceCount} · Climb: {ms.climbAttempted ? (ms.climbSuccess ? "✓" : "✗") : "—"}
                  {ms.driverSkill != null && ` · Driver: ${ms.driverSkill}`}
                </div>
                {ms.scoutComments && (
                  <p className="text-sm text-[#e0e7ff]/70 mt-1 italic">{ms.scoutComments}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!pit && matchScouts.length === 0 && (
        <p className="text-[#e0e7ff]/60 text-center py-6">Bu takım için henüz pit veya match verisi yok.</p>
      )}
    </div>
  );
}
