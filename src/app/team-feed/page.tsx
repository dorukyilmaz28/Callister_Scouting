"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Post = {
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  userFullName: string | null;
};

type TeamMember = { id: string; fullName: string | null; email: string | null };

export default function TeamFeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamNumber, setTeamNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [noTeam, setNoTeam] = useState(false);
  const [caption, setCaption] = useState("");

  function load() {
    Promise.all([
      fetch("/api/team-feed").then((r) => {
        if (r.status === 403) setNoTeam(true);
        return r.ok ? r.json() : [];
      }),
      fetch("/api/team-members").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : { user: null })).then((d) => {
        if (d?.user?.teamNumber != null) setTeamNumber(d.user.teamNumber);
        return d;
      }),
    ])
      .then(([postsData, membersData]) => {
        setPosts(Array.isArray(postsData) ? postsData : []);
        setMembers(Array.isArray(membersData) ? membersData : []);
      })
      .catch(() => setError("Yüklenemedi."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.querySelector('input[type="file"]') as HTMLInputElement;
    if (!input?.files?.length) {
      setError("Bir görsel seçin.");
      return;
    }
    setError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", input.files[0]);
    if (caption.trim()) fd.append("caption", caption.trim());
    fetch("/api/team-feed", { method: "POST", body: fd })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.error ?? "Yükleme başarısız")));
        return r.json();
      })
      .then(() => {
        setCaption("");
        input.value = "";
        load();
      })
      .catch((err) => setError(err.message ?? "Yükleme başarısız"))
      .finally(() => setUploading(false));
  }

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center min-h-[60vh]">
        <p className="text-[#f0f0f0]">Yükleniyor…</p>
      </div>
    );
  }

  if (noTeam || (teamNumber == null && members.length === 0 && posts.length === 0)) {
    return (
      <div className="app-shell pt-4">
        <h1 className="text-lg font-semibold text-[#f0f0f0] mb-4">Takım sohbeti</h1>
        <div className="card p-5">
          <p className="text-[#e0e7ff]/90">
            Takım sohbeti için hesabınızda takım numarası (9024) tanımlı olmalı. Profil veya yönetici ile güncelleyin.
          </p>
          <Link href="/events" className="text-[#6366f1] font-medium mt-3 inline-block">← Etkinliklere dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell pt-4">
      <h1 className="text-lg font-semibold text-[#f0f0f0] mb-1">
        Takım sohbeti {teamNumber != null ? `· Team ${teamNumber}` : ""}
      </h1>
      <p className="text-[#e0e7ff]/70 text-sm mb-4">
        Aynı takımdaki üyeleri görün, maç sonuçları ve görseller paylaşın.
      </p>

      {members.length > 0 && (
        <div className="card p-4 mb-6">
          <h2 className="font-semibold text-[#e0e7ff] text-sm mb-3">Takım üyeleri</h2>
          <ul className="flex flex-wrap gap-2">
            {members.map((m) => (
              <li key={m.id} className="px-3 py-2 rounded-lg bg-[#2d2d44] text-[#e0e7ff] text-sm">
                {m.fullName ?? "—"}
                {m.email && <span className="text-[#e0e7ff]/60 ml-1">({m.email})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="font-semibold text-[#e0e7ff] text-sm mb-2">Maç sonuçları & paylaşımlar</h2>
      <div className="card p-4 mb-6">
        <form onSubmit={handleUpload} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#e0e7ff] mb-1">Görsel (PNG/JPEG, max 5MB)</label>
            <input type="file" accept="image/png,image/jpeg,image/jpg" className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#e0e7ff] mb-1">Açıklama (isteğe bağlı)</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Kısa not"
              className="input-field"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={uploading} className="btn-primary w-full">
            {uploading ? "Yükleniyor…" : "Görsel / maç sonucu paylaş"}
          </button>
        </form>
      </div>

      {posts.length === 0 && !error && (
        <div className="card p-5">
          <p className="text-[#e0e7ff]/80 text-center">Henüz paylaşım yok. İlk görseli siz yükleyin.</p>
        </div>
      )}
      {posts.length > 0 && (
        <ul className="space-y-4">
          {posts.map((p) => (
            <li key={p.id} className="card p-4">
              {p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt={p.caption ?? "Maç verisi"}
                  className="w-full rounded-lg max-h-[400px] object-contain bg-[#1a1a2e]"
                />
              )}
              {p.caption && <p className={`text-[#e0e7ff]/90 text-sm ${p.imageUrl ? "mt-2" : ""} whitespace-pre-wrap`}>{p.caption}</p>}
              <p className="mt-2 text-xs text-[#e0e7ff]/50">
                {p.userFullName ?? "—"} · {new Date(p.createdAt).toLocaleString("tr-TR")}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-sm">
        <Link href="/events" className="text-[#6366f1] font-medium">← Etkinliklere dön</Link>
      </p>
    </div>
  );
}
