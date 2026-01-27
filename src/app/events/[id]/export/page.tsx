"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function ExportPage() {
  const params = useParams();
  const eventId = params.id as string;
  const base = `/api/events/${eventId}/export`;

  return (
    <div className="app-shell pt-4">
      <h1 className="text-lg font-semibold text-[#f0f0f0] mb-1">Yönetici Paneli</h1>
      <p className="text-[#f0f0f0]/70 text-sm mb-6">Veri dışa aktar</p>

      <section className="card p-5 mb-4">
        <h2 className="font-semibold text-[#1a1a2e] mb-4">📤 Veri dışa aktar</h2>
        <div className="space-y-3">
          <a
            href={`${base}?type=all`}
            download
            className="block w-full py-4 px-4 rounded-lg bg-[#3b82f6] text-white font-medium text-center hover:bg-[#2563eb]"
          >
            CSV indir
          </a>
          <a
            href={`${base}?type=teams`}
            download
            className="block w-full py-4 px-4 rounded-lg bg-[#3b82f6] text-white font-medium text-center hover:bg-[#2563eb]"
          >
            Excel indir
          </a>
          <a
            href={`${base}?type=full`}
            download
            className="block w-full py-4 px-4 rounded-lg bg-[#4b5563] text-white font-medium text-center hover:bg-[#374151]"
          >
            Tam veritabanı dışa aktar
          </a>
        </div>
      </section>

      <section className="card p-5 mb-4">
        <h2 className="font-semibold text-[#1a1a2e] mb-2">📊 Takım özetleri</h2>
        <p className="text-[#1a1a2e]/70 text-sm mb-4">
          Takım özetleri (ortalama auto, tırmanma oranı vb.) Excel indirmesinde yer alır.
        </p>
        <a
          href={`${base}?type=teams`}
          download
          className="btn-primary inline-block text-center"
        >
          Oluştur
        </a>
      </section>

      <p className="text-[#f0f0f0]/60 text-xs">
        UTF-8 CSV, Excel veya Google Sheets’te açılır.
      </p>

      <p className="mt-4 text-sm">
        <Link href={`/events/${eventId}`} className="text-[#3b82f6]">← Ana sayfa</Link>
      </p>
    </div>
  );
}
