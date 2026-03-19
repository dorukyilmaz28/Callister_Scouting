"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Team = { id: string; number: number; name: string | null };
type Assignment = { teamId: string };
type MetricKey = "autoAvg" | "teleopAvg" | "climbRate" | "driverAvg";
type CompareRow = {
  teamId: string;
  teamNumber: number;
  teamName: string | null;
  matchCount: number;
  autoAvg: number;
  teleopAvg: number;
  climbRate: number;
  driverAvg: number | null;
};
type MemberStat = {
  userId: string;
  userName: string;
  teamNumber: number | null;
  pitCount: number;
  matchCount: number;
  assignedTeams: { teamId: string; teamNumber: number; teamName: string | null }[];
  recentMatchScouts: {
    teamNumber: number;
    matchNumber: number;
    matchType: string;
    autoScoreCount: number;
    gamePieceCount: number;
    climbSuccess: boolean;
  }[];
  recentPitScouts: {
    teamNumber: number;
    drivetrainType: string;
    robotType: string;
    climbCapability: string | null;
  }[];
};

function mdToHtml(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-[#c7d2fe] mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold text-[#c7d2fe] mt-4 mb-1 text-base">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="font-bold text-[#c7d2fe] mt-4 mb-1 text-lg">$1</h2>')
    .replace(/\n/g, "<br />");
}

export default function TeamsListPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "strategy" | "scout" | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFullText, setAiFullText] = useState<string | null>(null);
  const [aiDisplayed, setAiDisplayed] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [thinkDots, setThinkDots] = useState("");
  const [compareRows, setCompareRows] = useState<CompareRow[]>([]);
  const [metric, setMetric] = useState<MetricKey>("teleopAvg");
  const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}/teams`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/events/${eventId}/assignments`).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/auth/me").then((r) => r.json().then((d) => d.user?.role ?? null)),
      fetch(`/api/events/${eventId}/teams/compare`).then((r) => (r.ok ? r.json() : { teams: [] })),
      fetch(`/api/events/${eventId}/member-stats`).then((r) => (r.ok ? r.json() : { members: [] })),
    ]).then(([allTeams, assignments, role, compareData, memberData]) => {
      setUserRole(role);
      const assignmentTeamIds = (assignments as Assignment[]).map((a) => a.teamId);
      const mine = assignmentTeamIds.length > 0
        ? (allTeams as Team[]).filter((t) => assignmentTeamIds.includes(t.id))
        : role === "scout"
          ? []
          : (allTeams as Team[]);
      setTeams(mine);
      setCompareRows((compareData?.teams ?? []) as CompareRow[]);
      setMemberStats((memberData?.members ?? []) as MemberStat[]);
      setLoading(false);
    });
  }, [eventId]);

  useEffect(() => {
    if (!aiLoading) return;
    const id = setInterval(() => setThinkDots((d) => (d.length >= 3 ? "" : d + ".")), 500);
    return () => clearInterval(id);
  }, [aiLoading]);

  useEffect(() => {
    if (!aiFullText) return;
    let i = 0;
    setAiDisplayed("");
    timerRef.current = setInterval(() => {
      i += 2;
      if (i >= aiFullText.length) {
        setAiDisplayed(aiFullText);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setAiDisplayed(aiFullText.slice(0, i));
      }
    }, 10);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [aiFullText]);

  async function runAiAnalyze() {
    setAiLoading(true);
    setAiError(null);
    setAiFullText(null);
    setAiDisplayed("");
    try {
      const res = await fetch(`/api/events/${eventId}/ai-analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.error ?? "Analiz alınamadı.");
        return;
      }
      setAiFullText(data.analysis ?? "");
    } catch {
      setAiError("Bağlantı hatası.");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="app-shell flex justify-center py-12">
        <p className="text-[#e0e7ff]/80">Takımlar yükleniyor…</p>
      </div>
    );
  }

  const metricLabel: Record<MetricKey, string> = {
    autoAvg: "Auto Ortalaması",
    teleopAvg: "Teleop Ortalaması",
    climbRate: "Climb Başarı (%)",
    driverAvg: "Sürücü Skoru",
  };
  const maxValue = Math.max(
    1,
    ...compareRows.map((r) =>
      metric === "driverAvg" ? (r.driverAvg ?? 0) : (r[metric] as number)
    )
  );

  return (
    <div className="app-shell pt-4">
      <h1 className="text-xl font-bold text-[#f0f0f0] mb-4">Takımlar · Verilere bak</h1>

      <div className="card p-4 mb-5">
        <h2 className="text-sm font-semibold text-[#c7d2fe] mb-2">Callister AI</h2>
        <button
          type="button"
          onClick={runAiAnalyze}
          disabled={aiLoading}
          className="w-full sm:w-auto py-3 px-5 rounded-xl bg-[#6366f1] text-white font-medium hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {aiLoading ? "Analiz ediyor…" : "Callister AI ile analiz et"}
        </button>
        {aiError && (
          <p className="mt-2 text-sm text-red-400">{aiError}</p>
        )}
      </div>

      {aiLoading && (
        <div className="mb-5 p-4 rounded-xl bg-[#1e1e42] border border-[#6366f1]/40">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#6366f1] animate-pulse" />
            <span className="text-sm text-[#c7d2fe] font-medium">
              Callister AI düşünüyor{thinkDots}
            </span>
          </div>
        </div>
      )}

      {aiFullText && !aiLoading && (
        <div className="mb-5 p-4 rounded-xl bg-[#1e1e42] border border-[#6366f1]/40">
          <h2 className="font-semibold text-[#c7d2fe] mb-2">Callister AI analizi</h2>
          <div
            className="text-sm text-[#e0e7ff]/90 leading-relaxed break-words [&_strong]:font-semibold [&_strong]:text-[#e0e7ff] [&_em]:italic"
            dangerouslySetInnerHTML={{ __html: mdToHtml(aiDisplayed) }}
          />
          {aiDisplayed.length < aiFullText.length && (
            <span className="inline-block w-0.5 h-4 bg-[#c7d2fe] animate-pulse ml-px align-text-bottom" />
          )}
        </div>
      )}

      <div className="card p-4 mb-5">
        <h2 className="text-sm font-semibold text-[#c7d2fe] mb-3">
          Takım Karşılaştırma Grafiği
        </h2>
        <div className="flex gap-2 mb-3 flex-wrap">
          {(Object.keys(metricLabel) as MetricKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setMetric(k)}
              className={`px-3 py-2 text-xs rounded-lg ${
                metric === k
                  ? "bg-[#6366f1] text-white"
                  : "bg-white/10 text-[#e0e7ff] hover:bg-white/15"
              }`}
            >
              {metricLabel[k]}
            </button>
          ))}
        </div>
        {compareRows.length === 0 ? (
          <p className="text-sm text-[#e0e7ff]/70">Grafik için yeterli scout verisi yok.</p>
        ) : (
          <div className="space-y-2">
            {compareRows.map((row) => {
              const value =
                metric === "driverAvg" ? (row.driverAvg ?? 0) : (row[metric] as number);
              const width = Math.max(2, Math.round((value / maxValue) * 100));
              return (
                <div key={row.teamId} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#e0e7ff] font-medium">
                      {row.teamNumber}
                      {row.teamName ? ` · ${row.teamName}` : ""}
                    </span>
                    <span className="text-[#c7d2fe]">{value.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-2 bg-gradient-to-r from-[#6366f1] to-[#a5b4fc]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(userRole === "admin" || userRole === "strategy") && (
        <div className="card p-4 mb-5">
          <h2 className="text-sm font-semibold text-[#c7d2fe] mb-2">
            Üye Scout Performansı (Admin)
          </h2>
          {memberStats.length === 0 ? (
            <p className="text-sm text-[#e0e7ff]/70">Henüz üye scout verisi yok.</p>
          ) : (
            <ul className="space-y-3">
              {memberStats.map((m) => (
                <li key={m.userId} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-medium text-[#e0e7ff]">
                      {m.userName}
                      {m.teamNumber ? ` (Takım ${m.teamNumber})` : ""}
                    </span>
                    <span className="text-xs text-[#c7d2fe]">
                      Pit: {m.pitCount} · Match: {m.matchCount}
                    </span>
                  </div>
                  <div className="text-xs text-[#e0e7ff]/80 mt-1">
                    Atanan takımlar:{" "}
                    {m.assignedTeams.length > 0
                      ? m.assignedTeams.map((x) => x.teamNumber).join(", ")
                      : "—"}
                  </div>
                  {m.recentMatchScouts.length > 0 && (
                    <div className="text-xs text-[#e0e7ff]/70 mt-1">
                      Son match girişleri:{" "}
                      {m.recentMatchScouts
                        .map(
                          (x) =>
                            `${x.matchType} ${x.matchNumber} (T${x.teamNumber}: A${x.autoScoreCount}/Te${x.gamePieceCount}/${x.climbSuccess ? "Climb✓" : "Climb—"})`
                        )
                        .join(" · ")}
                    </div>
                  )}
                  {m.recentPitScouts.length > 0 && (
                    <div className="text-xs text-[#e0e7ff]/70 mt-1">
                      Son pit girişleri:{" "}
                      {m.recentPitScouts
                        .map(
                          (x) =>
                            `T${x.teamNumber} (${x.drivetrainType}, ${x.robotType}, climb ${
                              x.climbCapability ?? "—"
                            })`
                        )
                        .join(" · ")}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {teams.length === 0 ? (
        <div className="card p-5">
          {userRole === "scout" ? (
            <p className="text-[#e0e7ff]/90">
              Scout yapacağınız takımlar henüz seçilmedi. Ana sayfadan &quot;Scout yapacağım takımları seç&quot; ile takımlarınızı seçin; burada sadece onların verilerini görebilirsiniz.
            </p>
          ) : (
            <p className="text-[#e0e7ff]/80">Bu etkinlikte takım yok.</p>
          )}
          {userRole === "scout" && (
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
