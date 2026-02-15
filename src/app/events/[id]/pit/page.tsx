"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  DRIVETRAIN_OPTIONS,
  ROBOT_TYPE_OPTIONS,
  INTAKE_OPTIONS,
  SHOOTER_OPTIONS,
  CLIMB_LEVEL_OPTIONS,
} from "@/lib/constants";

type Team = { id: string; number: number };
type PitData = {
  drivetrainType: string;
  robotType: string;
  intakeType: string;
  shooterType: string;
  climbCapability: string;
  climbSystemDescription: string;
  teamToldUs: string;
  scoutObservations: string;
};

/** "other|açıklama" veya "custom|açıklama" formatından base + metin ayır */
function parseOther(value: string): { base: string; custom: string } {
  if (!value) return { base: "", custom: "" };
  const i = value.indexOf("|");
  if (i >= 0) return { base: value.slice(0, i), custom: value.slice(i + 1) };
  return { base: value, custom: "" };
}

const STEP = 3;

export default function PitScoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id as string;
  const preselectedTeamId = searchParams.get("teamId");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>(preselectedTeamId ?? "");
  const [teamNumber, setTeamNumber] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [pit, setPit] = useState<PitData>({
    drivetrainType: "",
    robotType: "",
    intakeType: "",
    shooterType: "",
    climbCapability: "",
    climbSystemDescription: "",
    teamToldUs: "",
    scoutObservations: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  /** "Diğer" / "Özel" seçildiğinde kullanıcının yazdığı metin */
  const [drivetrainOtherText, setDrivetrainOtherText] = useState("");
  const [intakeOtherText, setIntakeOtherText] = useState("");
  const [shooterOtherText, setShooterOtherText] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}/teams`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/events/${eventId}/assignments`).then((r) => (r.ok ? r.json() : [])),
    ]).then(([allTeams, assignments]) => {
      const ids = (assignments as { teamId: string }[]).map((a) => a.teamId);
      const mine = ids.length > 0
        ? (allTeams as Team[]).filter((t) => ids.includes(t.id))
        : (allTeams as Team[]);
      setTeams(mine);
      if (preselectedTeamId && mine.some((t) => t.id === preselectedTeamId)) {
        setTeamId(preselectedTeamId);
        setTeamNumber((mine.find((t) => t.id === preselectedTeamId))?.number ?? null);
      } else if (mine.length && !teamId) {
        setTeamId(mine[0].id);
        setTeamNumber(mine[0].number);
      }
      setLoading(false);
    });
  }, [eventId, preselectedTeamId]);

  useEffect(() => {
    if (!teamId) return;
    const t = teams.find((x) => x.id === teamId);
    if (t) setTeamNumber(t.number);
    fetch(`/api/events/${eventId}/pit-scout?teamId=${teamId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const one = Array.isArray(data) ? data[0] : data;
        if (one) {
          const inv = parseOther(one.intakeType ?? "");
          const drv = parseOther(one.drivetrainType ?? "");
          const sh = parseOther(one.shooterType ?? "");
          const rob = parseOther(one.robotType ?? "");
          setPit({
            drivetrainType: drv.base || (one.drivetrainType ?? ""),
            robotType: rob.base || (one.robotType ?? ""),
            intakeType: inv.base === "other" ? "other" : "",
            shooterType: sh.base || (one.shooterType ?? ""),
            climbCapability:
              one.climbCapability === "low"
                ? "1"
                : one.climbCapability === "high"
                  ? "3"
                  : (one.climbCapability ?? ""),
            climbSystemDescription: one.climbSystemDescription ?? "",
            teamToldUs: one.teamToldUs ?? "",
            scoutObservations: one.scoutObservations ?? "",
          });
          setDrivetrainOtherText(drv.custom);
          setIntakeOtherText(inv.custom);
          setShooterOtherText(sh.custom);
        } else {
          setPit({
            drivetrainType: "",
            robotType: "",
            intakeType: "",
            shooterType: "",
            climbCapability: "",
            climbSystemDescription: "",
            teamToldUs: "",
            scoutObservations: "",
          });
          setDrivetrainOtherText("");
          setIntakeOtherText("");
          setShooterOtherText("");
        }
      });
  }, [eventId, teamId, teams.length]);

  async function save() {
    if (!teamId) return;
    const intakeType =
      pit.intakeType === "other"
        ? (intakeOtherText.trim() ? `other|${intakeOtherText.trim()}` : "other")
        : null;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/pit-scout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          teamId,
          drivetrainType:
            pit.drivetrainType === "other" && drivetrainOtherText.trim()
              ? `other|${drivetrainOtherText.trim()}`
              : pit.drivetrainType,
          robotType: pit.robotType,
          intakeType,
          shooterType:
            pit.shooterType === "other" && shooterOtherText.trim()
              ? `other|${shooterOtherText.trim()}`
              : pit.shooterType || null,
          climbCapability: pit.climbCapability || null,
          climbSystemDescription: pit.climbSystemDescription?.trim() || null,
          teamToldUs: pit.teamToldUs || null,
          scoutObservations: pit.scoutObservations || null,
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

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center min-h-[60vh]">
        <p className="text-[#f0f0f0]">Yükleniyor…</p>
      </div>
    );
  }
  if (teams.length === 0) {
    return (
      <div className="app-shell pt-4">
        <div className="card p-5">
          <p className="text-[#e0e7ff]/80">Scout edecek takım atanmadı.</p>
          <Link href={`/events/${eventId}`} className="text-[#3b82f6] mt-2 inline-block">← Ana sayfa</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell pt-4">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-[#f0f0f0]">
          Team {teamNumber ?? "—"} – Pit
        </h1>
        <p className="text-[#f0f0f0]/70 text-sm">Adım {step} / {STEP}</p>
      </header>

      <div className="card p-5 space-y-5">
        {step === 1 && (
          <>
            <h2 className="font-semibold text-[#e0e7ff]">Drivetrain</h2>
            <div className="space-y-2">
              {DRIVETRAIN_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`option-row w-full ${pit.drivetrainType === o.value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="drivetrain"
                    checked={pit.drivetrainType === o.value}
                    onChange={() => setPit((p) => ({ ...p, drivetrainType: o.value }))}
                    className="touch"
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
            {pit.drivetrainType === "other" && (
              <div className="pt-2">
                <label className="block text-sm font-medium text-[#e0e7ff] mb-1.5">
                  Diğer (Drivetrain) – ne yazayım?
                </label>
                <input
                  type="text"
                  value={drivetrainOtherText}
                  onChange={(e) => setDrivetrainOtherText(e.target.value)}
                  placeholder="Örn: Üç tekerlek, Mecanum"
                  className="input-field"
                />
              </div>
            )}
            <h2 className="font-semibold text-[#e0e7ff] pt-2">Robot tipi</h2>
            <div className="space-y-2">
              {ROBOT_TYPE_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`option-row w-full ${pit.robotType === o.value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="robotType"
                    checked={pit.robotType === o.value}
                    onChange={() => setPit((p) => ({ ...p, robotType: o.value }))}
                    className="touch"
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-primary mt-4"
            >
              İleri ➜
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-semibold text-[#e0e7ff]">Intake</h2>
            <div className="space-y-2">
              {INTAKE_OPTIONS.map((o) => (
                <label
                  key={o.value || "none"}
                  className={`option-row w-full ${pit.intakeType === o.value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="intake"
                    checked={pit.intakeType === o.value}
                    onChange={() => setPit((p) => ({ ...p, intakeType: o.value }))}
                    className="touch"
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
            {pit.intakeType === "other" && (
              <div className="pt-2">
                <label className="block text-sm font-medium text-[#e0e7ff] mb-1.5">
                  Özel (Intake) – ne yazayım?
                </label>
                <input
                  type="text"
                  value={intakeOtherText}
                  onChange={(e) => setIntakeOtherText(e.target.value)}
                  placeholder="Örn: Kendi chassi, Hibrit"
                  className="input-field"
                />
              </div>
            )}
            <h2 className="font-semibold text-[#e0e7ff] pt-2">Shooter</h2>
            <div className="space-y-2">
              {SHOOTER_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`option-row w-full ${pit.shooterType === o.value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="shooter"
                    checked={pit.shooterType === o.value}
                    onChange={() => setPit((p) => ({ ...p, shooterType: o.value }))}
                    className="touch"
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
            {pit.shooterType === "other" && (
              <div className="pt-2">
                <label className="block text-sm font-medium text-[#e0e7ff] mb-1.5">
                  Diğer (Shooter) – ne yazayım?
                </label>
                <input
                  type="text"
                  value={shooterOtherText}
                  onChange={(e) => setShooterOtherText(e.target.value)}
                  placeholder="Örn: Pnömatik, Hibrit"
                  className="input-field"
                />
              </div>
            )}
            <h2 className="font-semibold text-[#e0e7ff] pt-2">Tırmanma</h2>
            <p className="text-sm text-[#e0e7ff]/80 mb-2">Hangi seviye?</p>
            <div className="space-y-2">
              {CLIMB_LEVEL_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`option-row w-full ${pit.climbCapability === o.value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="climb"
                    checked={pit.climbCapability === o.value}
                    onChange={() => setPit((p) => ({ ...p, climbCapability: o.value }))}
                    className="touch"
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
            <div className="pt-2">
              <label className="block text-sm font-medium text-[#e0e7ff] mb-1.5">
                Tırmanma sistemi nasıl çalışıyor?
              </label>
              <textarea
                value={pit.climbSystemDescription}
                onChange={(e) => setPit((p) => ({ ...p, climbSystemDescription: e.target.value }))}
                rows={3}
                className="input-field resize-none"
                placeholder="Örn: Kanca ile yukarı çekiliyor, piston ile kilitleniyor"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setStep(1)} className="btn-primary flex-1 bg-[#4b5563]">
                ← Geri
              </button>
              <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">
                İleri ➜
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-semibold text-[#e0e7ff]">Takımın söyledikleri</h2>
            <textarea
              value={pit.teamToldUs}
              onChange={(e) => setPit((p) => ({ ...p, teamToldUs: e.target.value }))}
              rows={4}
              className="input-field resize-none"
              placeholder='"Auto garanti" "Hızlı cycle" vb.'
            />
            <h2 className="font-semibold text-[#e0e7ff]">Scout gözlemleri</h2>
            <textarea
              value={pit.scoutObservations}
              onChange={(e) => setPit((p) => ({ ...p, scoutObservations: e.target.value }))}
              rows={4}
              className="input-field resize-none"
              placeholder="Intake kararsız, sürücü kendine güvenli vb."
            />
            {message && (
              <p className={message.type === "ok" ? "text-green-600 font-medium" : "text-red-600"}>
                {message.text}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setStep(2)} className="btn-primary flex-1 bg-[#4b5563]">
                ← Geri
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? "Kaydediliyor…" : "Pit verisini kaydet ✔"}
              </button>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-sm">
        <Link href={`/events/${eventId}`} className="text-[#3b82f6]">← Ana sayfa</Link>
      </p>
    </div>
  );
}
