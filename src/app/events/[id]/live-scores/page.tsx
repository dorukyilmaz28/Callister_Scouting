"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type MatchScoreRow = {
  matchNumber?: number;
  matchType?: string;
  redScore?: number;
  blueScore?: number;
  redAuto?: number;
  blueAuto?: number;
  redTeleop?: number;
  blueTeleop?: number;
  redEndGame?: number;
  blueEndGame?: number;
  scoreRedFinal?: number;
  scoreBlueFinal?: number;
  /** FRC bazen skoru alliances.red.score / alliances.blue.score olarak döner */
  alliances?: { red?: { score?: number }; blue?: { score?: number } };
  [key: string]: unknown;
};

type RankingRow = {
  rank: number;
  teamNumber: number;
  wins: number;
  losses: number;
  ties: number;
  qualAverage: number;
  matchesPlayed: number;
  [key: string]: unknown;
};

function normalizeMatchScores(data: unknown): MatchScoreRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as MatchScoreRow[];
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    // Önce bilinen property adları
    if (Array.isArray(o.MatchScores)) return o.MatchScores as MatchScoreRow[];
    if (Array.isArray(o.matchScores)) return o.matchScores as MatchScoreRow[];
    if (Array.isArray(o.matches)) return o.matches as MatchScoreRow[];
    if (Array.isArray(o.Matches)) return o.Matches as MatchScoreRow[];
    if (Array.isArray(o.MatchResults)) return o.MatchResults as MatchScoreRow[];
    if (Array.isArray(o.matchResults)) return o.matchResults as MatchScoreRow[];

    // Son çare: içinde matchNumber veya alliances olan ilk dizi
    for (const value of Object.values(o)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
        const first = value[0] as Record<string, unknown>;
        if ("matchNumber" in first || "alliances" in first || "match number" in first) return value as MatchScoreRow[];
      }
    }
  }
  return [];
}

/** FRC API bazen red/blue skoru alliances içinde döner; tüm varyasyonları dene */
function getRedBlueScore(m: MatchScoreRow): { red: number | null; blue: number | null } {
  const red =
    (m.redScore as number | undefined) ??
    (m.scoreRedFinal as number | undefined) ??
    (typeof (m.alliances as { red?: { score?: number } } | undefined)?.red?.score === "number"
      ? (m.alliances as { red: { score: number } }).red.score
      : undefined);
  const blue =
    (m.blueScore as number | undefined) ??
    (m.scoreBlueFinal as number | undefined) ??
    (typeof (m.alliances as { blue?: { score?: number } } | undefined)?.blue?.score === "number"
      ? (m.alliances as { blue: { score: number } }).blue.score
      : undefined);
  return {
    red: typeof red === "number" ? red : null,
    blue: typeof blue === "number" ? blue : null,
  };
}

function normalizeRankings(data: unknown): RankingRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as RankingRow[];
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.Rankings)) return o.Rankings as RankingRow[];
    if (Array.isArray(o.rankings)) return o.rankings as RankingRow[];
  }
  return [];
}

type ScheduleTeam = { teamNumber: number; station: string };
type ScheduleItem = {
  matchNumber?: number;
  description?: string;
  startTime?: string;
  tournamentLevel?: string;
  teams?: ScheduleTeam[];
};

function normalizeSchedule(data: unknown): ScheduleItem[] {
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.Schedule)) return o.Schedule as ScheduleItem[];
  if (Array.isArray(o.schedule)) return o.schedule as ScheduleItem[];
  if (Array.isArray(data)) return data as ScheduleItem[];
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
  const [teamNamesByNumber, setTeamNamesByNumber] = useState<Record<number, string>>({});
  const [assignedTeamNumbers, setAssignedTeamNumbers] = useState<number[]>([]);
  const [scoutMatchList, setScoutMatchList] = useState<Array<{
    matchNumber: number;
    matchType: string;
    entries: Array<{
      teamNumber: number;
      teamName: string | null;
      autoScoreCount: number;
      gamePieceCount: number;
      climbSuccess: boolean;
    }>;
  }> | null>(null);
  const [activeTab, setActiveTab] = useState<"scores" | "schedule" | "rankings">("scores");

  const rankingRows = normalizeRankings(rankings);
  const scheduleItems = normalizeSchedule(schedule);
  const matchScoresByNumber = new Map(
    matches.map((m, i) => [(m.matchNumber ?? (m["match number"] as number | undefined) ?? i + 1) as number, m])
  );
  const myTeamScheduleItems = scheduleItems.filter((item) =>
    (item.teams ?? []).some((t) => assignedTeamNumbers.includes(t.teamNumber))
  );
  const myTeamMatchesWithScores = myTeamScheduleItems
    .map((item) => ({ item, score: matchScoresByNumber.get(item.matchNumber ?? 0) }))
    .filter((x) => x.score);

  useEffect(() => {
    fetch(`/api/events/${eventId}/dashboard`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((dash) => {
        const teams = (dash?.teams ?? []) as Array<{ teamNumber: number }>;
        setAssignedTeamNumbers(teams.map((t) => t.teamNumber));
        if (dash?.eventTbaEventKey) {
          return fetch(`/api/events/${eventId}/tba-teams`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : []))
            .then((list: { team_number: number; nickname?: string | null }[]) => {
              const map: Record<number, string> = {};
              list.forEach((t) => {
                if (t.nickname) map[t.team_number] = t.nickname;
              });
              setTeamNamesByNumber(map);
            });
        }
        return fetch(`/api/events/${eventId}/teams`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : []))
          .then((list: { number: number; name?: string | null }[]) => {
            const map: Record<number, string> = {};
            list.forEach((t) => {
              if (t.name) map[t.number] = t.name;
            });
            setTeamNamesByNumber(map);
          });
      })
      .catch(() => setTeamNamesByNumber({}));
  }, [eventId]);

  function loadMatchResults() {
    setError(null);
    setLoading(true);
    fetch(`/api/events/${eventId}/frc/match-results`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d?.error ?? "Yüklenemedi")));
        return r.json();
      })
      .then((data) => {
        if (data && typeof data === "object" && "error" in data && data.error)
          setError(String(data.error));
        const list = normalizeMatchScores(data);
        setMatches(list);
        if (list.length === 0) {
          fetch(`/api/events/${eventId}/scout-match-list`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => setScoutMatchList(d?.matches ?? null))
            .catch(() => setScoutMatchList(null));
        } else {
          setScoutMatchList(null);
        }
      })
      .catch((e) => {
        setError(e?.message ?? "Maç sonuçları alınamadı");
        fetch(`/api/events/${eventId}/scout-match-list`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => setScoutMatchList(d?.matches ?? null))
          .catch(() => setScoutMatchList(null));
      })
      .finally(() => setLoading(false));
  }

  function loadSchedule() {
    fetch(`/api/events/${eventId}/frc/schedule`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setSchedule)
      .catch(() => setSchedule(null));
  }

  function loadRankings() {
    fetch(`/api/events/${eventId}/frc/rankings`, { cache: "no-store" })
      .then((r) => r.json())
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
          onClick={() => { loadMatchResults(); loadSchedule(); loadRankings(); }}
          disabled={loading}
          className="py-2 px-4 rounded-xl bg-white/10 text-[#e0e7ff] text-sm font-medium hover:bg-white/15 disabled:opacity-60"
        >
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>
      <p className="text-sm text-[#e0e7ff]/70 mb-4">
        FRC Events API (FMS) üzerinden resmi maç sonuçları. Tamamlanan tüm maçlar listelenir (sadece canlı yayın değil). Etkinlik henüz başlamadıysa veya FMS senkron yapmadıysa veri görünmeyebilir.
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
          {loading && matches.length === 0 && !scoutMatchList?.length ? (
            <div className="card p-8 text-center">
              <p className="text-[#e0e7ff]/70">Yükleniyor…</p>
            </div>
          ) : matches.length === 0 && !scoutMatchList?.length ? (
            <div className="card p-8 text-center">
              <p className="text-[#e0e7ff]/70 mb-2">
                Henüz resmi maç sonucu yok veya etkinlik kodu FRC API ile eşleşmiyor.
              </p>
              <p className="text-[#e0e7ff]/50 text-sm">
                Maç girişi yaptıysanız, Takımlar sekmesinden takım sayfalarında görebilirsiniz.
              </p>
            </div>
          ) : matches.length > 0 ? (
            <div className="space-y-4">
              {myTeamMatchesWithScores.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#c7d2fe] mb-2">Takımınızın oynadığı maçlar</h3>
                  <ul className="space-y-2">
                    {myTeamMatchesWithScores.map(({ item, score: m }) => {
                      const num = m?.matchNumber ?? item.matchNumber ?? 0;
                      const { red, blue } = m ? getRedBlueScore(m) : { red: null, blue: null };
                      const redDisplay = red ?? m?.redAuto ?? "—";
                      const blueDisplay = blue ?? m?.blueAuto ?? "—";
                      const winner =
                        red != null && blue != null
                          ? red > blue ? "Kırmızı" : blue > red ? "Mavi" : "Berabere"
                          : null;
                      return (
                        <li key={`my-${num}`}>
                          <div className="card p-4 flex items-center justify-between gap-3 flex-wrap border-[#6366f1]/40">
                            <span className="font-semibold text-[#e0e7ff]">Maç {num}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-red-400 font-medium">{redDisplay}</span>
                              <span className="text-[#e0e7ff]/50">–</span>
                              <span className="text-blue-400 font-medium">{blueDisplay}</span>
                            </div>
                            {winner && (
                              <span
                                className={`text-xs font-medium ${
                                  winner === "Kırmızı" ? "text-red-400" : winner === "Mavi" ? "text-blue-400" : "text-[#e0e7ff]/70"
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
                </div>
              )}
              <div>
                {myTeamMatchesWithScores.length > 0 && (
                  <h3 className="text-sm font-semibold text-[#e0e7ff]/80 mb-2">Tüm maçlar</h3>
                )}
                <ul className="space-y-2">
                  {matches.map((m, i) => {
                    const num = m.matchNumber ?? (m["match number"] as number | undefined) ?? i + 1;
                    const { red, blue } = getRedBlueScore(m);
                    const redDisplay = red ?? m.redAuto ?? "—";
                    const blueDisplay = blue ?? m.blueAuto ?? "—";
                    const winner =
                      red != null && blue != null
                        ? red > blue ? "Kırmızı" : blue > red ? "Mavi" : "Berabere"
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
              </div>
            </div>
          ) : scoutMatchList && scoutMatchList.length > 0 ? (
            <div className="space-y-4">
              <p className="text-[#e0e7ff]/80 text-sm">
                Resmi FMS skoru henüz yok. Scout girişleriniz:
              </p>
              <ul className="space-y-3">
                {scoutMatchList.map((m) => (
                  <li key={`${m.matchType}-${m.matchNumber}`} className="card p-4">
                    <div className="font-semibold text-[#e0e7ff] mb-2">
                      {m.matchType === "qual" ? "Qual" : "Playoff"} Maç {m.matchNumber}
                    </div>
                    <ul className="space-y-1.5 text-sm text-[#e0e7ff]/90">
                      {m.entries.map((e) => (
                        <li key={e.teamNumber} className="flex justify-between gap-2">
                          <span>
                            Takım {e.teamNumber}
                            {(teamNamesByNumber[e.teamNumber] ?? e.teamName) && (
                              <span className="text-[#e0e7ff]/70 ml-1">
                                ({(teamNamesByNumber[e.teamNumber] ?? e.teamName) ?? ""})
                              </span>
                            )}
                          </span>
                          <span className="text-[#e0e7ff]/70">
                            Auto: {e.autoScoreCount} · Teleop: {e.gamePieceCount} · Tırmanma: {e.climbSuccess ? "✓" : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      {activeTab === "schedule" && (
        <div className="card p-4">
          {schedule != null && (schedule as { error?: string }).error ? (
            <p className="text-amber-400/90 text-sm">{(schedule as { error: string }).error}</p>
          ) : scheduleItems.length === 0 ? (
            <p className="text-[#e0e7ff]/60 text-sm">Program henüz yok veya yüklenemedi.</p>
          ) : (
            <ul className="space-y-3">
              {scheduleItems.map((item, i) => {
                const teams = item.teams ?? [];
                const red = teams.filter((t) => (t.station ?? "").startsWith("Red"));
                const blue = teams.filter((t) => (t.station ?? "").startsWith("Blue"));
                const timeStr = item.startTime
                  ? new Date(item.startTime).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
                  : "";
                return (
                  <li key={`${item.matchNumber ?? i}-${item.description ?? i}`} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                    <div className="font-semibold text-[#e0e7ff]">
                      {item.description ?? `Maç ${item.matchNumber ?? i + 1}`}
                      {timeStr && <span className="text-xs font-normal text-[#e0e7ff]/60 ml-2">{timeStr}</span>}
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-red-400/90 font-medium">Kırmızı:</span>{" "}
                        {red.map((t) => (
                          <span key={t.teamNumber}>
                            {teamNamesByNumber[t.teamNumber] ? `${t.teamNumber} (${teamNamesByNumber[t.teamNumber]})` : t.teamNumber}
                            {red.indexOf(t) < red.length - 1 ? ", " : ""}
                          </span>
                        ))}
                        {red.length === 0 && "—"}
                      </div>
                      <div>
                        <span className="text-blue-400/90 font-medium">Mavi:</span>{" "}
                        {blue.map((t) => (
                          <span key={t.teamNumber}>
                            {teamNamesByNumber[t.teamNumber] ? `${t.teamNumber} (${teamNamesByNumber[t.teamNumber]})` : t.teamNumber}
                            {blue.indexOf(t) < blue.length - 1 ? ", " : ""}
                          </span>
                        ))}
                        {blue.length === 0 && "—"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {activeTab === "rankings" && (
        <div className="card p-4">
          {rankings != null && (rankings as { error?: string }).error ? (
            <p className="text-amber-400/90 text-sm">{(rankings as { error: string }).error}</p>
          ) : rankingRows.length === 0 ? (
            <p className="text-[#e0e7ff]/60 text-sm">Sıralama henüz yok veya veri alınamadı.</p>
          ) : (
            <ul className="space-y-2">
              {rankingRows.map((r) => (
                <li key={`${r.rank}-${r.teamNumber}`} className="card p-3 flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#c7d2fe]">#{r.rank}</span>
                      <span className="text-sm font-medium text-[#e0e7ff]">Takım {r.teamNumber}</span>
                      {teamNamesByNumber[r.teamNumber] && (
                        <span className="text-xs text-[#e0e7ff]/80 truncate">{teamNamesByNumber[r.teamNumber]}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-right text-[#e0e7ff]/70">
                    <div>
                      {r.wins}-{r.losses}-{r.ties} · {r.matchesPlayed} maç
                    </div>
                    <div>Ort. puan: {r.qualAverage}</div>
                  </div>
                </li>
              ))}
            </ul>
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
