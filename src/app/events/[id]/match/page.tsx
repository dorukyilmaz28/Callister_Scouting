"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RATING_1_5, CLIMB_TYPE_OPTIONS, MATCH_TYPE_OPTIONS } from "@/lib/constants";

type MatchScout = {
  autoAttempted: boolean;
  autoScoreCount: number;
  autoDescription: string | null;
  autoConsistency: number | null;
  gamePieceCount: number;
  cycleSpeed: string | null;
  defensePlayed: boolean;
  climbAttempted: boolean;
  climbSuccess: boolean;
  climbType: string | null;
  requestedStrategy: string | null;
  driverSkill: number | null;
  scoutComments: string | null;
};

const bosForm: MatchScout = {
  autoAttempted: false,
  autoScoreCount: 0,
  autoDescription: null,
  autoConsistency: null,
  gamePieceCount: 0,
  cycleSpeed: null,
  defensePlayed: false,
  climbAttempted: false,
  climbSuccess: false,
  climbType: null,
  requestedStrategy: null,
  driverSkill: null,
  scoutComments: null,
};

function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="min-w-[64px] min-h-[64px] w-16 h-16 rounded-xl bg-[#2d2d44] text-[#f0f0f0] font-bold text-3xl active:bg-[#3b82f6] flex items-center justify-center"
      >
        −
      </button>
      <span className="min-w-[3rem] text-center font-bold text-[#1a1a2e] text-2xl">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="min-w-[64px] min-h-[64px] w-16 h-16 rounded-xl bg-[#2d2d44] text-[#f0f0f0] font-bold text-3xl active:bg-[#3b82f6] flex items-center justify-center"
      >
        +
      </button>
    </div>
  );
}

type TeamOption = { teamId: string; teamNumber: number };

export default function MatchScoutPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [matchNumber, setMatchNumber] = useState("");
  const [teamNumber, setTeamNumber] = useState("");
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [matchType, setMatchType] = useState("qual");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<MatchScout>(bosForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  /** climbType "Diğer" seçildiğinde kullanıcının yazdığı metin */
  const [climbTypeOtherText, setClimbTypeOtherText] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}/dashboard`).then((r) => (r.ok ? r.json() : { teams: [] })),
      fetch(`/api/events/${eventId}/teams`).then((r) => (r.ok ? r.json() : [])),
    ]).then(([dash, allTeams]) => {
      const assigned = (dash.teams ?? []) as { teamId: string; teamNumber: number }[];
      if (assigned.length > 0) {
        setTeamOptions(assigned.map((t) => ({ teamId: t.teamId, teamNumber: t.teamNumber })));
        if (!teamNumber && assigned[0]) setTeamNumber(String(assigned[0].teamNumber));
      } else {
        const list = (allTeams as { id: string; number: number }[]) ?? [];
        setTeamOptions(list.map((t) => ({ teamId: t.id, teamNumber: t.number })));
        if (!teamNumber && list[0]) setTeamNumber(String(list[0].number));
      }
      setTeamsLoaded(true);
    });
  }, [eventId]);

  useEffect(() => {
    const mn = matchNumber.trim();
    const tn = teamNumber.trim();
    if (!mn || !tn) {
      setForm(bosForm);
      setClimbTypeOtherText("");
      return;
    }
    const numMn = parseInt(mn, 10);
    const numTn = parseInt(tn, 10);
    if (Number.isNaN(numMn) || Number.isNaN(numTn)) return;
    setLoading(true);
    fetch(
      `/api/events/${eventId}/match-scout?matchNumber=${numMn}&teamNumber=${numTn}&matchType=${matchType}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((one) => {
        if (one) {
          const ct = String(one.climbType ?? "");
          const climbBase = ct.startsWith("other|") ? "other" : (one.climbType ?? null);
          const climbCustom = ct.startsWith("other|") ? ct.slice(6) : "";
          setForm({
            autoAttempted: one.autoAttempted ?? false,
            autoScoreCount: one.autoScoreCount ?? 0,
            autoDescription: one.autoDescription ?? null,
            autoConsistency: one.autoConsistency ?? null,
            gamePieceCount: one.gamePieceCount ?? 0,
            cycleSpeed: one.cycleSpeed ?? null,
            defensePlayed: one.defensePlayed ?? false,
            climbAttempted: one.climbAttempted ?? false,
            climbSuccess: one.climbSuccess ?? false,
            climbType: climbBase,
            requestedStrategy: one.requestedStrategy ?? null,
            driverSkill: one.driverSkill ?? null,
            scoutComments: one.scoutComments ?? null,
          });
          setClimbTypeOtherText(climbCustom);
        } else {
          setForm(bosForm);
          setClimbTypeOtherText("");
        }
      })
      .catch(() => setForm(bosForm))
      .finally(() => setLoading(false));
  }, [eventId, matchNumber, teamNumber, matchType]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const mn = parseInt(String(matchNumber).trim(), 10);
    const tn = parseInt(String(teamNumber).trim(), 10);
    if (Number.isNaN(mn) || Number.isNaN(tn)) {
      setMessage({ type: "err", text: "Maç ve takım numarası girin." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/match-scout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          matchNumber: mn,
          teamNumber: tn,
          matchType,
          ...form,
          climbType:
            form.climbType === "other" && climbTypeOtherText.trim()
              ? `other|${climbTypeOtherText.trim()}`
              : form.climbType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Kayıt başarısız" });
        return;
      }
      setMessage({ type: "ok", text: "Kaydedildi." });
    } catch {
      setMessage({ type: "err", text: "Bağlantı hatası" });
    } finally {
      setSaving(false);
    }
  }

  const mn = matchNumber.trim();
  const tn = teamNumber.trim();
  const canProceed = mn && tn && !Number.isNaN(parseInt(mn, 10)) && !Number.isNaN(parseInt(tn, 10));

  if (!teamsLoaded) {
    return (
      <div className="app-shell pt-4 flex items-center justify-center min-h-[40vh]">
        <p className="text-[#f0f0f0]">Yükleniyor…</p>
      </div>
    );
  }
  if (teamOptions.length === 0) {
    return (
      <div className="app-shell pt-4">
        <div className="card p-5">
          <p className="text-[#1a1a2e]/80">Match scout için size atanmış takım yok. Yönetici ile iletişime geçin.</p>
          <Link href={`/events/${eventId}`} className="text-[#3b82f6] mt-2 inline-block">← Ana sayfa</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell pt-4">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-[#f0f0f0]">
          Match {mn || "—"} – Team {tn || "—"}
        </h1>
        <p className="text-[#f0f0f0]/70 text-sm">Adım {step} / 2</p>
      </header>

      <div className="card p-4 mb-4 space-y-3">
        <h2 className="font-semibold text-[#1a1a2e] text-sm">Maç & Takım</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#1a1a2e]/70 mb-1">Maç no</label>
            <input
              type="number"
              min={1}
              value={matchNumber}
              onChange={(e) => setMatchNumber(e.target.value)}
              placeholder="23"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs text-[#1a1a2e]/70 mb-1">Takım</label>
            {!teamsLoaded ? (
              <div className="input-field bg-[#f0f0f0] text-[#1a1a2e]/60">Yükleniyor…</div>
            ) : teamOptions.length === 0 ? (
              <p className="text-sm text-[#1a1a2e]/70">Henüz takım atanmadı.</p>
            ) : (
              <select
                value={teamNumber}
                onChange={(e) => setTeamNumber(e.target.value)}
                className="input-field min-h-[48px]"
              >
                <option value="">Seçin</option>
                {teamOptions.map((t) => (
                  <option key={t.teamId} value={String(t.teamNumber)}>
                    Team {t.teamNumber}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {MATCH_TYPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setMatchType(o.value)}
              className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg border-2 ${
                matchType === o.value
                  ? "border-[#6366f1] bg-[#eef2ff] text-[#1e1b4b]"
                  : "border-[#c7d2fe] bg-[#e0e7ff] text-[#1e1b4b]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {loading && <p className="text-xs text-[#1a1a2e]/60">Önceki veri yükleniyor…</p>}
      </div>

      {!canProceed && step === 1 && (
        <p className="text-[#f0f0f0]/70 text-sm mb-4">Maç numarası girin ve takım seçin.</p>
      )}

      {canProceed && step === 1 && (
        <div className="card p-5 space-y-5">
          <h2 className="font-semibold text-[#1a1a2e]">AUTO</h2>
          <label className="option-row w-full cursor-pointer">
            <input
              type="checkbox"
              checked={form.autoAttempted}
              onChange={(e) => setForm((f) => ({ ...f, autoAttempted: e.target.checked }))}
              className="touch"
            />
            <span>Denendi</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Skor</label>
            <Stepper value={form.autoScoreCount} onChange={(n) => setForm((f) => ({ ...f, autoScoreCount: n }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Auto notları</label>
            <textarea
              value={form.autoDescription ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, autoDescription: e.target.value || null }))}
              rows={2}
              className="input-field resize-none"
              placeholder="Merkez başlangıç, yolu vb."
            />
          </div>

          <h2 className="font-semibold text-[#1a1a2e] pt-2">TELEOP</h2>
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Parça sayısı</label>
            <Stepper value={form.gamePieceCount} onChange={(n) => setForm((f) => ({ ...f, gamePieceCount: n }))} />
          </div>
          <label className="option-row w-full cursor-pointer">
            <input
              type="checkbox"
              checked={form.defensePlayed}
              onChange={(e) => setForm((f) => ({ ...f, defensePlayed: e.target.checked }))}
              className="touch"
            />
            <span>Savunma oynadı?</span>
          </label>

          <button type="button" onClick={() => setStep(2)} className="btn-primary mt-4">
            İleri ➜
          </button>
        </div>
      )}

      {canProceed && step === 2 && (
        <div className="card p-5 space-y-5">
          <h2 className="font-semibold text-[#1a1a2e]">ENDGAME</h2>
          <label className="option-row w-full cursor-pointer">
            <input
              type="checkbox"
              checked={form.climbAttempted}
              onChange={(e) => setForm((f) => ({ ...f, climbAttempted: e.target.checked }))}
              className="touch"
            />
            <span>Tırmanma denendi</span>
          </label>
          <label className="option-row w-full cursor-pointer">
            <input
              type="checkbox"
              checked={form.climbSuccess}
              onChange={(e) => setForm((f) => ({ ...f, climbSuccess: e.target.checked }))}
              className="touch"
            />
            <span>Başarılı</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-2">Tip</label>
            <select
              value={form.climbType ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, climbType: e.target.value || null }))}
              className="input-field"
            >
              <option value="">—</option>
              {CLIMB_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {form.climbType === "other" && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">
                  Diğer (Climb tipi) – ne yazayım?
                </label>
                <input
                  type="text"
                  value={climbTypeOtherText}
                  onChange={(e) => setClimbTypeOtherText(e.target.value)}
                  placeholder="Örn: Özel bar, Park only"
                  className="input-field"
                />
              </div>
            )}
          </div>

          <h2 className="font-semibold text-[#1a1a2e] pt-2">Sürücü becerisi</h2>
          <div className="flex gap-2 flex-wrap">
            {RATING_1_5.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm((f) => ({ ...f, driverSkill: n }))}
                className={`touch w-12 h-12 rounded-lg font-medium text-lg ${
                  form.driverSkill === n
                    ? "bg-[#6366f1] text-white"
                    : "bg-[#e0e7ff] text-[#1e1b4b]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Strateji notları</label>
            <textarea
              value={form.scoutComments ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, scoutComments: e.target.value || null }))}
              rows={3}
              className="input-field resize-none"
              placeholder="Savunma oynadı, notlar…"
            />
          </div>

          {message && (
            <p className={message.type === "ok" ? "text-green-600 font-medium" : "text-red-600"}>
              {message.text}
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setStep(1)} className="btn-primary flex-1 bg-[#4b5563]">
              ← Geri
            </button>
            <button
              type="button"
              onClick={() => submit()}
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? "Kaydediliyor…" : "Match kaydet ✔"}
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-sm">
        <Link href={`/events/${eventId}`} className="text-[#3b82f6]">← Ana sayfa</Link>
      </p>
    </div>
  );
}
