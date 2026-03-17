"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Job = {
  id: string;
  youtubeVideoId: string;
  title: string | null;
  eventName: string | null;
  matchLabel: string | null;
  focusTeamNumber: number | null;
  status: string;
  progress: number;
  createdAt: string;
  completedAt: string | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  queued: { label: "Sirada", color: "bg-yellow-500/20 text-yellow-300" },
  downloading: { label: "Indiriliyor", color: "bg-blue-500/20 text-blue-300" },
  analyzing: { label: "Analiz ediliyor", color: "bg-purple-500/20 text-purple-300" },
  completed: { label: "Tamamlandi", color: "bg-green-500/20 text-green-300" },
  failed: { label: "Basarisiz", color: "bg-red-500/20 text-red-300" },
};

export default function VideoAnalysisPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [eventName, setEventName] = useState("");
  const [matchLabel, setMatchLabel] = useState("");
  const [focusTeam, setFocusTeam] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const r = await fetch("/api/video-analysis/jobs");
      if (r.ok) setJobs(await r.json());
    } catch {
      /* ignore */
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/video-analysis/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl,
          eventName: eventName || undefined,
          matchLabel: matchLabel || undefined,
          focusTeamNumber: focusTeam ? Number(focusTeam) : undefined,
          notes: notes || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Is olusturulamadi");
        return;
      }
      router.push(`/video-analysis/${data.id}`);
    } catch {
      setError("Baglanti hatasi");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 pt-6 pb-12">
      <h1 className="text-2xl font-bold text-[#f0f0f5] mb-1">Video Analiz</h1>
      <p className="text-sm text-[#e0e7ff]/70 mb-6">
        YouTube FRC mac videolarini yapay zeka ile analiz edin. Takim performansi, cycle
        metrikleri ve strateji onerileri alin.
      </p>

      <form onSubmit={handleSubmit} className="card p-5 mb-8">
        <h2 className="text-base font-semibold text-[#c7d2fe] mb-4">
          Yeni Analiz Baslat
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#e0e7ff] mb-1">
              YouTube URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#e0e7ff] mb-1">
                Etkinlik adi
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Ankara Regional"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#e0e7ff] mb-1">
                Mac etiketi
              </label>
              <input
                type="text"
                value={matchLabel}
                onChange={(e) => setMatchLabel(e.target.value)}
                placeholder="Qual 42"
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#e0e7ff] mb-1">
                Odak takim numarasi
              </label>
              <input
                type="number"
                value={focusTeam}
                onChange={(e) => setFocusTeam(e.target.value)}
                placeholder="9024"
                className="input-field"
              />
            </div>
            <div />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#e0e7ff] mb-1">
              Notlar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ek bilgiler, dikkat edilecek noktalar..."
              className="input-field resize-none"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !youtubeUrl.trim()}
          className="btn-primary mt-4"
        >
          {submitting ? "Olusturuluyor..." : "Analiz Baslat"}
        </button>
      </form>

      <h2 className="text-lg font-semibold text-[#f0f0f5] mb-3">Gecmis Analizler</h2>

      {loadingJobs ? (
        <p className="text-sm text-[#e0e7ff]/60">Yukleniyor...</p>
      ) : jobs.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-[#e0e7ff]/60 text-sm">
            Henuz bir video analizi yok. Yukaridaki formu kullanarak ilk analizinizi
            baslatin.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => {
            const st = STATUS_LABELS[job.status] ?? STATUS_LABELS.queued;
            return (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/video-analysis/${job.id}`)}
                  className="card p-4 w-full text-left hover:border-[#6366f1] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}
                        >
                          {st.label}
                        </span>
                        {job.progress > 0 && job.status !== "completed" && (
                          <span className="text-xs text-[#e0e7ff]/50">
                            {job.progress}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-[#e0e7ff] truncate">
                        {job.title ?? job.matchLabel ?? job.youtubeVideoId}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#e0e7ff]/50">
                        {job.eventName && <span>{job.eventName}</span>}
                        {job.focusTeamNumber && (
                          <span>Takim {job.focusTeamNumber}</span>
                        )}
                        <span>{formatDate(job.createdAt)}</span>
                      </div>
                    </div>
                    <img
                      src={`https://img.youtube.com/vi/${job.youtubeVideoId}/mqdefault.jpg`}
                      alt=""
                      className="w-24 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
