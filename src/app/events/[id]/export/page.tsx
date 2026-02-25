"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import html2canvas from "html2canvas";

type SummaryRow = {
  teamNumber: number;
  avgAutoScore: number | null;
  climbSuccessRate: number | null;
  matchCount: number;
};

const CHART_COLORS = ["#6366f1", "#818cf8", "#a5b4fc"];

export default function ExportPage() {
  const params = useParams();
  const eventId = params.id as string;
  const base = `/api/events/${eventId}/export`;
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSummaryLoading(true);
    fetch(`/api/events/${eventId}/export/summary`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSummary)
      .catch(() => setSummary([]))
      .finally(() => setSummaryLoading(false));
  }, [eventId]);

  async function downloadChartsPng() {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#1e1e2e",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `event-${eventId}-grafikler.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("PNG oluşturulamadı.");
    }
  }

  const autoData = summary.map((s) => ({
    name: String(s.teamNumber),
    "Ort. Auto": s.avgAutoScore ?? 0,
  }));
  const climbData = summary.map((s) => ({
    name: String(s.teamNumber),
    "Tırmanma oranı": s.climbSuccessRate != null ? s.climbSuccessRate * 100 : 0,
  }));

  return (
    <div className="app-shell pt-4">
      <h1 className="text-lg font-semibold text-[#f0f0f0] mb-1">Yönetici Paneli</h1>
      <p className="text-[#f0f0f0]/70 text-sm mb-6">Veri dışa aktar</p>

      <section className="card p-5 mb-4">
        <h2 className="font-semibold text-[#e0e7ff] mb-4">📤 Veri dışa aktar</h2>
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
        <h2 className="font-semibold text-[#e0e7ff] mb-2">📊 Takım özetleri</h2>
        <p className="text-[#e0e7ff]/70 text-sm mb-4">
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

      <section className="card p-5 mb-4">
        <h2 className="font-semibold text-[#e0e7ff] mb-4">📈 Grafikli özet (PNG)</h2>
        {summaryLoading && <p className="text-[#e0e7ff]/70 text-sm mb-4">Yükleniyor…</p>}
        {!summaryLoading && summary.length > 0 && (
          <>
            <div ref={chartRef} className="space-y-6 bg-[#1e1e2e] p-4 rounded-lg">
              <div>
                <p className="text-[#e0e7ff] text-sm font-medium mb-2">Takıma göre ortalama auto skor</p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={autoData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                        labelStyle={{ color: "#e0e7ff" }}
                      />
                      <Legend />
                      <Bar dataKey="Ort. Auto" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-[#e0e7ff] text-sm font-medium mb-2">Takıma göre tırmanma başarı oranı (%)</p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={climbData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                        labelStyle={{ color: "#e0e7ff" }}
                      />
                      <Legend />
                      <Bar dataKey="Tırmanma oranı" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadChartsPng}
              className="btn-primary mt-4"
            >
              Grafikleri PNG olarak indir
            </button>
          </>
        )}
        {!summaryLoading && summary.length === 0 && (
          <p className="text-[#e0e7ff]/70 text-sm">Henüz özet verisi yok.</p>
        )}
      </section>

      <p className="text-[#f0f0f0]/60 text-xs">
        UTF-8 CSV, Excel veya Google Sheets&apos;te açılır.
      </p>

      <p className="mt-4 text-sm">
        <Link href={`/events/${eventId}`} className="text-[#3b82f6]">← Ana sayfa</Link>
      </p>
    </div>
  );
}
