"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; name: string; role: string };

export function useSession() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const router = useRouter();
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
      })
      .catch(() => setUser(null));
  }, [router]);
  return user;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useSession();
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Yükleniyor…</p>
      </div>
    );
  }
  if (user === null) {
    return null;
  }
  return <>{children}</>;
 }
