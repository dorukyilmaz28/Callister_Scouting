"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

type User = { id: string; name: string; role: string };

export default function EventsLayout({
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
        if (!d.user) router.replace("/login?next=" + encodeURIComponent(path || "/events"));
      })
      .catch(() => router.replace("/login?next=" + encodeURIComponent(path || "/events")))
      .finally(() => setLoading(false));
  }, [path, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e]">
        <p className="text-[#f0f0f5]">Yükleniyor…</p>
      </div>
    );
  }
  if (!user) return null;

  const segment2 = path?.split("/")[2];
  const eventId = segment2 && segment2 !== "new" ? segment2 : null;

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`block py-3 px-4 text-sm font-medium rounded-xl min-w-[4rem] text-center touch transition-colors ${
        path === href
          ? "bg-[#6366f1] text-white shadow-md shadow-indigo-500/30"
          : "bg-white/10 text-[#f0f0f5] hover:bg-white/15"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#0f0f23]">
      <header className="sticky top-0 z-10 bg-[#0f0f23]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-[480px] mx-auto flex items-center justify-between gap-2 px-3 py-2">
          <Link href="/events" className="font-semibold text-[#f0f0f5] truncate text-sm">
            Callister 9024 · FRC 2026
          </Link>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="py-2.5 px-4 text-sm font-medium rounded-xl bg-white/10 text-[#f0f0f5] hover:bg-white/15 min-h-[44px] transition-colors"
          >
            Çıkış
          </button>
        </div>
        {eventId && (
          <div className="max-w-[480px] mx-auto flex gap-2 overflow-x-auto px-3 pb-2">
            {navLink(`/events/${eventId}`, "Ana")}
            {navLink(`/events/${eventId}/pit`, "Pit")}
            {navLink(`/events/${eventId}/match`, "Match")}
            {navLink(`/events/${eventId}/teams`, "Takımlar / Veriler")}
            {navLink(`/events/${eventId}/live-scores`, "Canlı Skor")}
            {(user.role === "admin" || user.role === "strategy") && (
              <>
                {navLink(`/events/${eventId}/assign`, "Ata")}
                {navLink(`/events/${eventId}/export`, "Dışa aktar")}
              </>
            )}
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
