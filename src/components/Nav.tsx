"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const path = usePathname();
  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`block py-3 px-4 text-lg font-medium rounded-lg ${
        path === href ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="flex flex-wrap gap-2 p-3 bg-white border-b border-gray-200">
      {link("/", "Ana sayfa")}
      {link("/events", "Etkinlikler")}
      <Link
        href="/api/auth/logout"
        className="block py-3 px-4 text-lg font-medium rounded-lg bg-gray-200 text-gray-800"
      >
        Çıkış
      </Link>
    </nav>
  );
}
