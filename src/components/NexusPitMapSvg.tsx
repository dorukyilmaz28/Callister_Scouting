"use client";

import type { NexusPitMap, NexusPitMapRect } from "@/lib/nexus-api";

function normAddr(s: string): string {
  return s.replace(/\s+/g, "").toUpperCase();
}

function mapTeamMatches(mapTeam: string | undefined, teamNumber: number): boolean {
  if (mapTeam == null || mapTeam === "") return false;
  const t = String(mapTeam).replace(/^frc/i, "").trim();
  return t === String(teamNumber);
}

function pitKeysToHighlight(
  mapPits: Record<string, NexusPitMapRect> | undefined,
  assignments: Array<{ teamNumber: number; pitAddress: string | null }>
): Set<string> {
  const out = new Set<string>();
  if (!mapPits) return out;
  for (const [pitKey, cell] of Object.entries(mapPits)) {
    const keyNorm = normAddr(pitKey);
    for (const a of assignments) {
      if (a.pitAddress && normAddr(a.pitAddress) === keyNorm) out.add(pitKey);
      if (mapTeamMatches(cell.team, a.teamNumber)) out.add(pitKey);
    }
  }
  return out;
}

function safeNum(n: unknown, fallback = 0): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

export function NexusPitMapSvg({
  map,
  assignments,
}: {
  map: NexusPitMap | null;
  assignments: Array<{ teamNumber: number; pitAddress: string | null }>;
}) {
  if (!map?.size) return null;
  const w = safeNum(map.size.x, 0);
  const h = safeNum(map.size.y, 0);
  if (w <= 0 || h <= 0) return null;

  const pits = map.pits ?? {};
  const walls = map.walls ?? {};
  const areas = map.areas ?? {};
  const labels = map.labels ?? {};
  const highlight = pitKeysToHighlight(pits, assignments);

  const pitFont = Math.max(10, Math.min(16, Math.round(Math.min(w, h) / 55)));

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-h-[min(380px,55vh)] text-[#e0e7ff]"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Nexus pit haritası"
      >
        <rect x={0} y={0} width={w} height={h} fill="rgba(15,23,42,0.85)" />

        {Object.entries(walls).map(([id, r]) => {
          const x = safeNum(r.position?.x);
          const y = safeNum(r.position?.y);
          const rw = safeNum(r.size?.x);
          const rh = safeNum(r.size?.y);
          if (rw <= 0 || rh <= 0) return null;
          return (
            <rect
              key={`w-${id}`}
              x={x}
              y={y}
              width={rw}
              height={rh}
              fill="rgba(148,163,184,0.35)"
              stroke="rgba(148,163,184,0.5)"
              strokeWidth={1}
            />
          );
        })}

        {Object.entries(areas).map(([id, r]) => {
          const x = safeNum(r.position?.x);
          const y = safeNum(r.position?.y);
          const rw = safeNum(r.size?.x);
          const rh = safeNum(r.size?.y);
          if (rw <= 0 || rh <= 0) return null;
          return (
            <g key={`a-${id}`}>
              <rect
                x={x}
                y={y}
                width={rw}
                height={rh}
                fill="rgba(99,102,241,0.12)"
                stroke="rgba(129,140,248,0.35)"
                strokeWidth={1}
              />
              {r.label && (
                <text
                  x={x + rw / 2}
                  y={y + rh / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="currentColor"
                  className="opacity-80"
                  style={{ fontSize: Math.max(9, pitFont - 2) }}
                >
                  {r.label}
                </text>
              )}
            </g>
          );
        })}

        {Object.entries(pits).map(([pitKey, r]) => {
          const x = safeNum(r.position?.x);
          const y = safeNum(r.position?.y);
          const rw = safeNum(r.size?.x);
          const rh = safeNum(r.size?.y);
          if (rw <= 0 || rh <= 0) return null;
          const hi = highlight.has(pitKey);
          return (
            <g key={`p-${pitKey}`}>
              <rect
                x={x}
                y={y}
                width={rw}
                height={rh}
                rx={4}
                fill={hi ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.06)"}
                stroke={hi ? "#a5b4fc" : "rgba(255,255,255,0.22)"}
                strokeWidth={hi ? 3 : 1}
              />
              <text
                x={x + rw / 2}
                y={y + rh / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="currentColor"
                style={{ fontSize: pitFont, fontWeight: hi ? 600 : 500 }}
              >
                {pitKey}
              </text>
            </g>
          );
        })}

        {Object.entries(labels).map(([id, r]) => {
          const x = safeNum(r.position?.x);
          const y = safeNum(r.position?.y);
          const rw = safeNum(r.size?.x);
          const rh = safeNum(r.size?.y);
          const text = r.label ?? "";
          if (!text) return null;
          return (
            <text
              key={`l-${id}`}
              x={x + rw / 2}
              y={y + rh / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="currentColor"
              className="opacity-70"
              style={{ fontSize: Math.max(9, pitFont - 1) }}
            >
              {text}
            </text>
          );
        })}
      </svg>
      <p className="text-[10px] text-[#e0e7ff]/45 px-3 py-2 border-t border-white/10">
        Harita verisi{" "}
        <a
          href="https://frc.nexus/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#a5b4fc] hover:underline"
        >
          Nexus
        </a>{" "}
        API üzerinden gelir; etkinlikte harita yoksa bu bölüm görünmez.
      </p>
    </div>
  );
}
