"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Job = {
  id: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  title: string | null;
  eventName: string | null;
  matchLabel: string | null;
  focusTeamNumber: number | null;
  notes: string | null;
  status: string;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  queued: { label: "Sırada", color: "text-yellow-300", icon: "⏳" },
  downloading: { label: "Video İndiriliyor", color: "text-blue-300", icon: "⬇️" },
  analyzing: { label: "Analiz Ediliyor", color: "text-purple-300", icon: "🔬" },
  completed: { label: "Tamamlandı", color: "text-green-300", icon: "✅" },
  failed: { label: "Başarısız", color: "text-red-300", icon: "❌" },
};

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const r = await fetch(`/api/video-analysis/jobs/${jobId}`);
      if (!r.ok) {
        setError("İş bulunamadı");
        return;
      }
      setJob(await r.json());
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Poll while job is in progress
  useEffect(() => {
    if (!job) return;
    const active = job.status === "downloading" || job.status === "analyzing" || job.status === "queued";
    if (!active) return;
    const id = setInterval(fetchJob, 3000);
    return () => clearInterval(id);
  }, [job, fetchJob]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const r = await fetch(`/api/video-analysis/jobs/${jobId}/start`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Başlatılamadı");
        return;
      }
      fetchJob();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setStarting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Bu analizi silmek istediğinize emin misiniz?")) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/video-analysis/jobs/${jobId}`, {
        method: "DELETE",
      });
      if (r.ok) {
        router.push("/video-analysis");
        return;
      }
      const data = await r.json();
      setError(data.error ?? "Silinemedi");
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="max-w-[720px] mx-auto px-4 pt-10 text-center">
        <p className="text-[#e0e7ff]/60">Yükleniyor…</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-[720px] mx-auto px-4 pt-10 text-center">
        <p className="text-red-400 mb-4">{error ?? "İş bulunamadı"}</p>
        <Link href="/video-analysis" className="link-callister text-sm">
          ← Geri dön
        </Link>
      </div>
    );
  }

  const st = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.queued;
  const isActive =
    job.status === "queued" ||
    job.status === "downloading" ||
    job.status === "analyzing";

  return (
    <div className="max-w-[720px] mx-auto px-4 pt-6 pb-12">
      <Link
        href="/video-analysis"
        className="text-sm link-callister mb-4 inline-block"
      >
        ← Tüm analizler
      </Link>

      {/* Status card */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{st.icon}</span>
          <div>
            <h1 className="text-lg font-bold text-[#f0f0f5]">
              {job.title ?? job.matchLabel ?? "Video Analizi"}
            </h1>
            <p className={`text-sm font-medium ${st.color}`}>{st.label}</p>
          </div>
        </div>

        {/* Progress bar */}
        {isActive && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-[#e0e7ff]/60 mb-1">
              <span>İlerleme</span>
              <span>{job.progress}%</span>
            </div>
            <div className="w-full h-2 bg-[#1e1e42] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6366f1] to-[#818cf8] rounded-full transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            {job.status === "analyzing" && (
              <p className="text-xs text-[#e0e7ff]/50 mt-2 animate-pulse">
                Video analiz ediliyor, bu birkaç dakika sürebilir…
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {job.errorMessage && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
            <p className="text-sm text-red-300">{job.errorMessage}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-[#e0e7ff]/50 text-xs">YouTube</span>
            <p className="text-[#e0e7ff] truncate">{job.youtubeVideoId}</p>
          </div>
          {job.eventName && (
            <div>
              <span className="text-[#e0e7ff]/50 text-xs">Etkinlik</span>
              <p className="text-[#e0e7ff]">{job.eventName}</p>
            </div>
          )}
          {job.matchLabel && (
            <div>
              <span className="text-[#e0e7ff]/50 text-xs">Maç</span>
              <p className="text-[#e0e7ff]">{job.matchLabel}</p>
            </div>
          )}
          {job.focusTeamNumber && (
            <div>
              <span className="text-[#e0e7ff]/50 text-xs">Odak Takım</span>
              <p className="text-[#e0e7ff]">{job.focusTeamNumber}</p>
            </div>
          )}
          <div>
            <span className="text-[#e0e7ff]/50 text-xs">Oluşturulma</span>
            <p className="text-[#e0e7ff]">{formatDate(job.createdAt)}</p>
          </div>
          {job.completedAt && (
            <div>
              <span className="text-[#e0e7ff]/50 text-xs">Tamamlanma</span>
              <p className="text-[#e0e7ff]">{formatDate(job.completedAt)}</p>
            </div>
          )}
        </div>

        {job.notes && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <span className="text-[#e0e7ff]/50 text-xs">Notlar</span>
            <p className="text-sm text-[#e0e7ff]/80 mt-0.5">{job.notes}</p>
          </div>
        )}
      </div>

      {/* YouTube preview */}
      <div className="card overflow-hidden mb-5">
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

      {/* Actions */}
      <div className="flex gap-3">
        {(job.status === "queued" || job.status === "failed") && (
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="btn-primary flex-1"
          >
            {starting
              ? "Başlatılıyor…"
              : job.status === "failed"
                ? "Tekrar Dene"
                : "Analizi Başlat"}
          </button>
        )}

        {job.status === "completed" && (
          <Link
            href={`/video-analysis/${job.id}/result`}
            className="btn-primary flex-1 text-center"
          >
            Sonuçları Gör
          </Link>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || isActive}
          className="py-3 px-5 text-sm font-medium rounded-xl bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors disabled:opacity-40"
        >
          {deleting ? "Siliniyor…" : "Sil"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
