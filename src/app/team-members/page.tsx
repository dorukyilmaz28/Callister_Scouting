"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TeamMember = { id: string; fullName: string | null; email: string | null };

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/team-members")
      .then((r) => {
        if (!r.ok) throw new Error("Yüklenemedi");
        return r.json();
      })
      .then(setMembers)
      .catch(() => setError("Takım üyeleri yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center min-h-[60vh]">
        <p className="text-[#f0f0f0]">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="app-shell pt-4">
      <h1 className="text-lg font-semibold text-[#f0f0f0] mb-2">Takım üyeleri</h1>
      <p className="text-[#e0e7ff]/70 text-sm mb-4">
        Aynı takım numarasıyla kayıtlı kullanıcılar
      </p>
      {error && (
        <div className="card p-4 mb-4">
          <p className="text-red-500">{error}</p>
        </div>
      )}
      {members.length === 0 && !error && (
        <div className="card p-5">
          <p className="text-[#e0e7ff]/80">Henüz başka üye görünmüyor.</p>
        </div>
      )}
      {members.length > 0 && (
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="card p-4">
              <p className="font-medium text-[#e0e7ff]">{m.fullName ?? "—"}</p>
              {m.email && (
                <p className="text-sm text-[#e0e7ff]/70 mt-0.5">{m.email}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm">
        <Link href="/events" className="text-[#3b82f6]">← Etkinliklere dön</Link>
      </p>
    </div>
  );
}
