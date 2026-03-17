"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

type User = { id: string; name: string; role: string };

export default function VideoAnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        if (!d.user)
          router.replace(
            "/login?next=" + encodeURIComponent(path || "/video-analysis")
          );
      })
      .catch(() =>
        router.replace(
          "/login?next=" + encodeURIComponent(path || "/video-analysis")
        )
      )
      .finally(() => setLoading(false));
  }, [path, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e]">
        <p className="text-[#f0f0f5]">Yukleniyor...</p>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#0f0f23]">
      <header className="sticky top-0 z-10 bg-[#0f0f23]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-[720px] mx-auto flex items-center justify-between gap-2 px-4 py-2">
          <div className="flex items-center gap-3">
            <Link
              href="/events"
              className="py-2 px-3 text-sm font-medium rounded-xl bg-white/10 text-[#f0f0f5] hover:bg-white/15 transition-colors"
            >
              Etkinlikler
            </Link>
            <Link
              href="/video-analysis"
              className="font-semibold text-[#f0f0f5] truncate text-sm"
            >
              Video Analiz
            </Link>
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="py-2.5 px-4 text-sm font-medium rounded-xl bg-white/10 text-[#f0f0f5] hover:bg-white/15 min-h-[44px] transition-colors"
          >
            Cikis
          </button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
