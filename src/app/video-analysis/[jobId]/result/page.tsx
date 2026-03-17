"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

type AnalyzedTeam = {
  id: string;
  teamNumber: number;
  avgCycleTime: number | null;
  estimatedScoreAttempts: number | null;
  estimatedDefenseTimeSec: number | null;
  idleTimeSec: number | null;
  movementDistance: number | null;
  zoneEntriesJson: Record<string, number> | null;
  notesJson: string[] | null;
};

type AnalysisEvent = {
  id: string;
  timestampSec: number;
  eventType: string;
  teamNumber: number | null;
  confidence: number | null;
  metadataJson: Record<string, unknown> | null;
};

type AnalysisResult = {
  id: string;
  jobId: string;
  summaryJson: {
    title?: string;
    overview?: string;
    highlights?: string[];
    match_duration_sec?: number;
  } | null;
  rawMetricsJson: Record<string, unknown> | null;
  createdAt: string;
  analyzedTeams: AnalyzedTeam[];
  analysisEvents: AnalysisEvent[];
};

type Job = {
  youtubeVideoId: string;
  title: string | null;
  eventName: string | null;
  matchLabel: string | null;
  focusTeamNumber: number | null;
};

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  scoring_zone_entry: { label: "Skor Bolgesine Giris", color: "text-green-300" },
  loading_zone_entry: { label: "Yukleme Bolgesine Giris", color: "text-blue-300" },
  defense_interaction: { label: "Defans Etkilesimi", color: "text-orange-300" },
  idle_detected: { label: "Bosta Bekleme", color: "text-yellow-300" },
  cycle_candidate: { label: "Cycle Adayi", color: "text-purple-300" },
  robot_detected: { label: "Robot Tespit", color: "text-cyan-300" },
  game_piece_detected: { label: "Oyun Parcasi Tespit", color: "text-emerald-300" },
};

function formatSeconds(sec: number | null | undefined): string {
  if (sec == null) return "-";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}dk ${s}sn` : `${s}sn`;
}

function formatTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"teams" | "timeline" | "raw">("teams");

  useEffect(() => {
    Promise.all([
      fetch(`/api/video-analysis/jobs/${jobId}/result`).then((r) =>
        r.ok ? r.json() : Promise.reject("Sonuc bulunamadi")
      ),
      fetch(`/api/video-analysis/jobs/${jobId}`).then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([res, j]) => {
        setResult(res);
        setJob(j);
      })
      .catch((e) => setError(typeof e === "string" ? e : "Yuklenemedi"))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return (
      <div className="max-w-[720px] mx-auto px-4 pt-10 text-center">
        <p className="text-[#e0e7ff]/60">Sonuclar yukleniyor...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-[720px] mx-auto px-4 pt-10 text-center">
        <p className="text-red-400 mb-4">{error ?? "Sonuc bulunamadi"}</p>
        <Link href={`/video-analysis/${jobId}`} className="link-callister text-sm">
          Geri don
        </Link>
      </div>
    );
  }

  const summary = result.summaryJson;
  const teams = result.analyzedTeams;
  const events = result.analysisEvents;

  return (
    <div className="max-w-[720px] mx-auto px-4 pt-6 pb-12">
      <Link
        href={`/video-analysis/${jobId}`}
        className="text-sm link-callister mb-4 inline-block"
      >
        Analiz detayina don
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f0f0f5] mb-1">
          {summary?.title ?? job?.title ?? "Mac Analiz Sonuclari"}
        </h1>
        <div className="flex items-center gap-3 text-sm text-[#e0e7ff]/60">
          {job?.eventName && <span>{job.eventName}</span>}
          {job?.matchLabel && <span>{job.matchLabel}</span>}
          {job?.focusTeamNumber && (
            <span className="text-[#818cf8]">Odak: {job.focusTeamNumber}</span>
          )}
        </div>
      </div>

      {/* YouTube embed */}
      {job?.youtubeVideoId && (
        <div className="card overflow-hidden mb-6">
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${job.youtubeVideoId}`}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="card p-5 mb-6">
          <h2 className="text-base font-semibold text-[#c7d2fe] mb-3">
            Mac Ozeti
          </h2>
          {summary.overview && (
            <p className="text-sm text-[#e0e7ff]/80 leading-relaxed mb-3">
              {summary.overview}
            </p>
          )}
          {summary.highlights && summary.highlights.length > 0 && (
            <ul className="space-y-1.5">
              {summary.highlights.map((h, i) => (
                <li
                  key={i}
                  className="text-sm text-[#e0e7ff]/70 flex items-start gap-2"
                >
                  <span className="text-[#6366f1] mt-0.5">&#9679;</span>
                  {h}
                </li>
              ))}
            </ul>
          )}
          {summary.match_duration_sec != null && (
            <p className="text-xs text-[#e0e7ff]/50 mt-3">
              Mac suresi: {formatSeconds(summary.match_duration_sec)}
            </p>
          )}
        </div>
      )}

      {/* Quick stats */}
      {teams.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-[#6366f1]">{teams.length}</p>
            <p className="text-xs text-[#e0e7ff]/50">Takim</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-[#818cf8]">{events.length}</p>
            <p className="text-xs text-[#e0e7ff]/50">Olay</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-[#a5b4fc]">
              {teams.reduce((s, t) => s + (t.estimatedScoreAttempts ?? 0), 0)}
            </p>
            <p className="text-xs text-[#e0e7ff]/50">Skor Denemesi</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {(
          [
            ["teams", "Takim Kartlari"],
            ["timeline", "Olay Zamancizgisi"],
            ["raw", "Ham Veri"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`py-2.5 px-4 text-sm font-medium rounded-xl min-w-[5rem] text-center transition-colors ${
              activeTab === key
                ? "bg-[#6366f1] text-white shadow-md shadow-indigo-500/30"
                : "bg-white/10 text-[#f0f0f5] hover:bg-white/15"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Teams */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          {teams.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-[#e0e7ff]/50 text-sm">
                Takim verisi bulunamadi.
              </p>
            </div>
          ) : (
            teams.map((team) => {
              const isFocus = job?.focusTeamNumber === team.teamNumber;
              return (
                <div
                  key={team.id}
                  className={`card p-5 ${
                    isFocus ? "border-[#6366f1] ring-1 ring-[#6366f1]/30" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-[#f0f0f5]">
                      Takim {team.teamNumber}
                    </h3>
                    {isFocus && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#6366f1]/20 text-[#818cf8]">
                        Odak Takim
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <MetricCard
                      label="Ort. Cycle Suresi"
                      value={
                        team.avgCycleTime != null
                          ? `${team.avgCycleTime.toFixed(1)}sn`
                          : "-"
                      }
                    />
                    <MetricCard
                      label="Skor Denemeleri"
                      value={
                        team.estimatedScoreAttempts != null
                          ? String(team.estimatedScoreAttempts)
                          : "-"
                      }
                    />
                    <MetricCard
                      label="Defans Suresi"
                      value={formatSeconds(team.estimatedDefenseTimeSec)}
                    />
                    <MetricCard
                      label="Bosta Kalma"
                      value={formatSeconds(team.idleTimeSec)}
                    />
                    <MetricCard
                      label="Hareket Mesafesi"
                      value={
                        team.movementDistance != null
                          ? `${team.movementDistance.toFixed(0)} birim`
                          : "-"
                      }
                    />
                  </div>

                  {/* Zone entries */}
                  {team.zoneEntriesJson &&
                    Object.keys(team.zoneEntriesJson).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-[#e0e7ff]/50 mb-2">
                          Bolge Gecisleri
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(team.zoneEntriesJson).map(
                            ([zone, count]) => (
                              <span
                                key={zone}
                                className="text-xs px-2 py-1 rounded-lg bg-[#1e1e42] text-[#e0e7ff]/70"
                              >
                                {zone}: {String(count)}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Notes */}
                  {team.notesJson && team.notesJson.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-[#e0e7ff]/50 mb-1">Notlar</p>
                      <ul className="space-y-1">
                        {team.notesJson.map((n, i) => (
                          <li
                            key={i}
                            className="text-xs text-[#e0e7ff]/70"
                          >
                            - {n}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === "timeline" && (
        <div className="card p-5">
          {events.length === 0 ? (
            <p className="text-[#e0e7ff]/50 text-sm text-center">
              Olay verisi bulunamadi.
            </p>
          ) : (
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-[#6366f1]/30" />
              <ul className="space-y-4">
                {events.map((ev) => {
                  const evLabel =
                    EVENT_TYPE_LABELS[ev.eventType] ?? {
                      label: ev.eventType,
                      color: "text-[#e0e7ff]/70",
                    };
                  return (
                    <li key={ev.id} className="relative pl-8">
                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-[#6366f1] border-2 border-[#0f0f23]" />
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`text-sm font-medium ${evLabel.color}`}>
                            {evLabel.label}
                          </span>
                          {ev.teamNumber && (
                            <span className="ml-2 text-xs text-[#e0e7ff]/50">
                              Takim {ev.teamNumber}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#e0e7ff]/40 font-mono whitespace-nowrap">
                          {formatTimestamp(ev.timestampSec)}
                        </span>
                      </div>
                      {ev.confidence != null && (
                        <span className="text-xs text-[#e0e7ff]/30">
                          Guven: {(ev.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tab: Raw JSON */}
      {activeTab === "raw" && (
        <div className="card p-5">
          <details>
            <summary className="text-sm text-[#c7d2fe] cursor-pointer mb-3">
              Ham JSON verisi (gelistirici icin)
            </summary>
            <pre className="text-xs text-[#e0e7ff]/60 overflow-x-auto whitespace-pre-wrap break-all max-h-[60vh] overflow-y-auto">
              {JSON.stringify(
                {
                  summary: result.summaryJson,
                  rawMetrics: result.rawMetricsJson,
                  teams: result.analyzedTeams,
                  events: result.analysisEvents,
                },
                null,
                2
              )}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-[#1e1e42] border border-[#6366f1]/20">
      <p className="text-xs text-[#e0e7ff]/50 mb-0.5">{label}</p>
      <p className="text-base font-semibold text-[#e0e7ff]">{value}</p>
    </div>
  );
}
