"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import html2canvas from "html2canvas";
import domtoimage from "dom-to-image";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

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
    autonomousRouteWaypoints: { x: number; y: number }[] | null;
  }[];
  summary: {
    matchCount: number;
    avgAutoScore: number | null;
    climbSuccessRate: number | null;
    avgDriverSkill: number | null;
    avgConsistency: number | null;
  };
};

const CHART_COLORS = ["#6366f1", "#818cf8", "#a5b4fc"];

export default function TeamSummaryPage() {
  const params = useParams();
  const eventId = params.id as string;
  const teamId = params.teamId as string;
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageDone, setImageDone] = useState(false);
  const [shareDone, setShareDone] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

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

  const chartData = matchScouts.map((ms) => ({
    name: `${ms.match.matchType} ${ms.match.matchNumber}`,
    Auto: ms.autoAttempted ? ms.autoScoreCount : 0,
    Teleop: ms.gamePieceCount,
    Climb: ms.climbAttempted ? (ms.climbSuccess ? 1 : 0) : 0,
    Driver: ms.driverSkill ?? 0,
  }));

  const summaryBarData = [
    { label: "Ort. Auto", value: summary.avgAutoScore ?? 0, color: CHART_COLORS[0] },
    { label: "Tırmanma %", value: summary.climbSuccessRate != null ? summary.climbSuccessRate * 100 : 0, color: CHART_COLORS[1] },
    { label: "Ort. Driver", value: summary.avgDriverSkill ?? 0, color: CHART_COLORS[2] },
  ].filter((d) => d.value > 0);

  function buildShareText(): string {
    const lines = [
      `Team ${team.number}${team.name ? ` – ${team.name}` : ""}`,
      `Maç: ${summary.matchCount} · Ort. Auto: ${summary.avgAutoScore ?? "—"} · Tırmanma: ${summary.climbSuccessRate != null ? (summary.climbSuccessRate * 100).toFixed(0) + "%" : "—"} · Driver: ${summary.avgDriverSkill ?? "—"}`,
    ];
    matchScouts.slice(0, 10).forEach((ms) => {
      lines.push(`${ms.match.matchType} ${ms.match.matchNumber}: Auto ${ms.autoAttempted ? ms.autoScoreCount : "—"} · Teleop ${ms.gamePieceCount} · Climb ${ms.climbAttempted ? (ms.climbSuccess ? "✓" : "✗") : "—"}`);
    });
    return lines.join("\n");
  }

  function downloadPng(dataUrl: string) {
    const link = document.createElement("a");
    link.download = `team-${team.number}-veriler.png`;
    link.href = dataUrl;
    link.click();
    setImageDone(true);
    setTimeout(() => setImageDone(false), 2000);
  }

  async function handleDownloadImage() {
    if (!downloadRef.current) return;
    setShareError(null);
    const el = downloadRef.current;
    await new Promise((r) => setTimeout(r, 400));

    try {
      const dataUrl = await domtoimage.toPng(el, {
        bgcolor: "#1a1e2e",
        style: { backgroundColor: "#1a1e2e" },
        quality: 1,
      });
      downloadPng(dataUrl);
    } catch {
      try {
        const canvas = await html2canvas(el, {
          backgroundColor: "#1a1e2e",
          scale: 1.5,
          logging: false,
        });
        downloadPng(canvas.toDataURL("image/png"));
      } catch (e) {
        console.error("PNG export", e);
        setShareError("PNG indirilemedi. Sayfayı yenileyip tekrar deneyin.");
      }
    }
  }

  async function handleShareToGroup() {
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch("/api/team-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: buildShareText() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Paylaşılamadı");
      setShareDone(true);
      setTimeout(() => setShareDone(false), 2000);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : "Takım sohbetine atılamadı.");
    } finally {
      setShareLoading(false);
    }
  }

  return (
    <div className="app-shell pt-4 space-y-6">
      <div>
        <Link
          href={`/events/${eventId}/teams`}
          className="text-sm text-[#6366f1] hover:underline mb-2 inline-block"
        >
          ← Takımlara dön
        </Link>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={handleDownloadImage}
            className="py-2 px-4 rounded-lg bg-[#374151] text-[#e0e7ff] text-sm font-medium hover:bg-[#4b5563]"
          >
            {imageDone ? "İndirildi!" : "Görsel olarak indir"}
          </button>
          <button
            type="button"
            onClick={handleShareToGroup}
            disabled={shareLoading}
            className="py-2 px-4 rounded-lg bg-[#6366f1] text-white text-sm font-medium hover:bg-[#4f46e5] disabled:opacity-60"
          >
            {shareLoading ? "Gönderiliyor…" : shareDone ? "Gruba atıldı!" : "Gruba at"}
          </button>
          {shareError && <p className="text-red-400 text-sm self-center">{shareError}</p>}
        </div>
      </div>

      <div ref={downloadRef} className="space-y-6 p-4 rounded-xl" style={{ backgroundColor: "#1a1e2e" }}>
        <h1 className="text-xl font-bold text-[#f0f0f0]">
          Team {team.number} {team.name ? `– ${team.name}` : ""}
        </h1>
        <p className="text-[#e0e7ff]/70 text-sm mt-0.5">Maç ve pit verileri</p>

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

      {matchScouts.length > 0 && (
        <section className="card p-4">
          <h2 className="font-semibold text-[#e0e7ff] mb-3">Grafik – Maç skorları</h2>
          <div className="w-full min-h-[256px]" style={{ height: 256 }}>
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: "#e0e7ff", fontSize: 11 }} />
                <YAxis tick={{ fill: "#e0e7ff", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #374151" }} labelStyle={{ color: "#e0e7ff" }} />
                <Bar dataKey="Auto" fill={CHART_COLORS[0]} name="Auto" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Teleop" fill={CHART_COLORS[1]} name="Teleop" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Driver" fill={CHART_COLORS[2]} name="Driver" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {summaryBarData.length > 0 && (
        <section className="card p-4">
          <h2 className="font-semibold text-[#e0e7ff] mb-3">Özet grafik</h2>
          <div className="w-full min-h-[192px]" style={{ height: 192 }}>
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={summaryBarData} layout="vertical" margin={{ top: 8, right: 24, left: 70, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" domain={[0, "auto"]} tick={{ fill: "#e0e7ff", fontSize: 11 }} />
                <YAxis type="category" dataKey="label" tick={{ fill: "#e0e7ff", fontSize: 11 }} width={65} />
                <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #374151" }} />
                <Bar dataKey="value" name="Değer" radius={[0, 2, 2, 0]}>
                  {summaryBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

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
                {ms.autonomousRouteWaypoints && ms.autonomousRouteWaypoints.length >= 2 && (
                  <div className="mt-2">
                    <span className="text-xs text-[#e0e7ff]/60">Otonom rotası:</span>
                    <div
                      className="mt-1 rounded border border-[#475569]/60 overflow-hidden inline-block bg-[#0f172a]"
                      style={{
                        aspectRatio: "54/26",
                        width: 280,
                        maxWidth: "100%",
                        backgroundImage: "url(/frc-field.png)",
                        backgroundSize: "100% 100%",
                        backgroundPosition: "0 0",
                      }}
                    >
                      <svg viewBox="0 0 1 1" className="block w-full h-full" preserveAspectRatio="none">
                        {(() => {
                          const pts = ms.autonomousRouteWaypoints;
                          return (
                            <>
                              <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#6366f1" strokeWidth="0.04" strokeLinecap="round" strokeLinejoin="round" />
                              {pts.map((p, idx) => (
                                <g key={idx}>
                                  <circle cx={p.x} cy={p.y} r="0.05" fill="#6366f1" stroke="#e0e7ff" strokeWidth="0.02" />
                                  <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="0.045" fontWeight="bold" style={{ fontFamily: "system-ui, sans-serif" }}>{idx + 1}</text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
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
    </div>
  );
}
