"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Team = { id: string; number: number; name: string | null };
type Assignment = { teamId: string };

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
  const [isScout, setIsScout] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFullText, setAiFullText] = useState<string | null>(null);
  const [aiDisplayed, setAiDisplayed] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [thinkDots, setThinkDots] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
